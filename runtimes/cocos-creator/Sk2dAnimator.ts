/**
 * Chrono Rig 2D runtime for Cocos Creator 3.x
 *
 * Plays a *.sk2d.json skeleton. Add this component to a node, assign the JSON,
 * set "Images Path" (relative to assets/resources) and an animation name.
 *
 * Pose maths is identical to the editor (model/Pose.ts):
 *   local  = setup pose + animated offsets
 *   world  = parent.world * T(x,y) * R(rotation) * S(scale)
 * The editor is y-down / clockwise; Cocos is y-up / counter-clockwise, so the final matrix is flipped.
 */
import {_decorator, Component, JsonAsset, Node, Sprite, SpriteFrame, UIOpacity, UITransform, resources} from 'cc';

const {ccclass, property} = _decorator;

type Curve = 'linear' | 'stepped' | [number, number, number, number];

interface Key {
    time: number;
    v: [number, number];
    curve: Curve
}

interface Tracks {
    rotate?: Key[];
    translate?: Key[];
    scale?: Key[]
}

interface BoneJson {
    name: string;
    parent: string | null;
    length: number;
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number
}

interface SlotJson {
    name: string;
    bone: string;
    alpha: number;
    attachment: string | null
}

interface AttJson {
    path: string;
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    width: number;
    height: number
}

interface SkeletonJson {
    format: string;
    fps: number;
    bones: BoneJson[];
    slots: SlotJson[];
    skins: { default: Record<string, Record<string, AttJson>> };
    animations: Record<string, { duration: number; bones: Record<string, Tracks> }>;
}

interface M {
    a: number;
    b: number;
    c: number;
    d: number;
    tx: number;
    ty: number
}

const DEG = Math.PI / 180;

function trs(x: number, y: number, rotDeg: number, sx: number, sy: number): M {
    const r = rotDeg * DEG, cos = Math.cos(r), sin = Math.sin(r);
    return {a: cos * sx, b: sin * sx, c: -sin * sy, d: cos * sy, tx: x, ty: y};
}

function mul(p: M, l: M): M {
    return {
        a: p.a * l.a + p.c * l.b, b: p.b * l.a + p.d * l.b,
        c: p.a * l.c + p.c * l.d, d: p.b * l.c + p.d * l.d,
        tx: p.a * l.tx + p.c * l.ty + p.tx, ty: p.b * l.tx + p.d * l.ty + p.ty,
    };
}

function ease(curve: Curve, t: number): number {
    if (curve === 'linear') return t;
    if (curve === 'stepped') return 0;
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const [x1, y1, x2, y2] = curve;
    const bez = (s: number, p1: number, p2: number) => {
        const u = 1 - s;
        return 3 * u * u * s * p1 + 3 * u * s * s * p2 + s * s * s;
    };
    let lo = 0, hi = 1;
    for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        if (bez(mid, x1, x2) < t) lo = mid; else hi = mid;
    }
    return bez((lo + hi) / 2, y1, y2);
}

function sample(keys: Key[] | undefined, time: number): [number, number] | null {
    if (!keys || keys.length === 0) return null;
    if (time <= keys[0].time) return keys[0].v;
    const last = keys[keys.length - 1];
    if (time >= last.time) return last.v;
    let i = 0;
    while (i < keys.length - 2 && keys[i + 1].time <= time) i++;
    const a = keys[i], b = keys[i + 1];
    if (a.curve === 'stepped') return a.v;
    const e = ease(a.curve, (time - a.time) / (b.time - a.time));
    return [a.v[0] + (b.v[0] - a.v[0]) * e, a.v[1] + (b.v[1] - a.v[1]) * e];
}

interface RuntimeSlot {
    json: SlotJson;
    boneIndex: number;
    node: Node;
    sprite: Sprite;
    tr: UITransform;
    opacity: UIOpacity;
    attachment: string | null;
}

@ccclass('Sk2dAnimator')
export class Sk2dAnimator extends Component {
    @property(JsonAsset) skeletonJson: JsonAsset | null = null;
    @property({tooltip: 'Folder containing the exported images, relative to assets/resources. Example: hero/images'})
    imagesPath = '';
    @property animation = '';
    @property loop = true;
    @property playOnLoad = true;
    @property speed = 1;

    private data!: SkeletonJson;
    private boneIndex = new Map<string, number>();
    private slots: RuntimeSlot[] = [];
    private frames = new Map<string, SpriteFrame>();
    private time = 0;
    private playing = false;
    private current: { duration: number; bones: Record<string, Tracks> } | null = null;

    onLoad(): void {
        if (!this.skeletonJson) {
            console.error('[Sk2dAnimator] Assign a skeleton JSON asset.');
            return;
        }
        this.data = this.skeletonJson.json as SkeletonJson;
        this.data.bones.forEach((b, i) => this.boneIndex.set(b.name, i));
        this.buildSlots();
        this.loadFrames();
    }

    start(): void {
        if (this.playOnLoad && this.animation) this.play(this.animation, this.loop);
        else this.applyPose();
    }

    update(dt: number): void {
        if (!this.playing || !this.current) return;
        this.time += dt * this.speed;
        const d = this.current.duration;
        if (this.time >= d) {
            if (this.loop && d > 0) this.time %= d;
            else {
                this.time = d;
                this.playing = false;
            }
        }
        this.applyPose();
    }

    /** Start an animation by name. */
    play(name: string, loop = true): void {
        const anim = this.data?.animations[name];
        if (!anim) {
            console.warn(`[Sk2dAnimator] Unknown animation "${name}"`);
            return;
        }
        this.current = anim;
        this.animation = name;
        this.loop = loop;
        this.time = 0;
        this.playing = true;
        this.applyPose();
    }

    stop(): void {
        this.playing = false;
    }

    /** Jump to a time in the current animation (seconds). */
    setTime(t: number): void {
        this.time = t;
        this.applyPose();
    }

    /** Swap which attachment a slot shows (null hides it). */
    setAttachment(slotName: string, attachment: string | null): void {
        const s = this.slots.find((x) => x.json.name === slotName);
        if (s) s.attachment = attachment;
    }

    // ---------------------------------------------------------------- internals

    private buildSlots(): void {
        for (const sj of this.data.slots) {
            const node = new Node(sj.name);
            node.layer = this.node.layer;
            const tr = node.addComponent(UITransform);
            const sprite = node.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            const opacity = node.addComponent(UIOpacity);
            this.node.addChild(node); // sibling order == draw order
            this.slots.push({
                json: sj, boneIndex: this.boneIndex.get(sj.bone) ?? 0,
                node, sprite, tr, opacity, attachment: sj.attachment,
            });
        }
    }

    private loadFrames(): void {
        const wanted = new Set<string>();
        for (const atts of Object.values(this.data.skins.default))
            for (const a of Object.values(atts)) wanted.add(a.path);
        wanted.forEach((path) => {
            resources.load(`${this.imagesPath}/${path}/spriteFrame`, SpriteFrame, (err, sf) => {
                if (err) {
                    console.error(`[Sk2dAnimator] Could not load image "${path}": ${err.message}`);
                    return;
                }
                this.frames.set(path, sf);
                this.applyPose();
            });
        });
    }

    private applyPose(): void {
        if (!this.data) return;
        const bones = this.data.bones;
        const world: M[] = new Array(bones.length);

        for (let i = 0; i < bones.length; i++) {
            const b = bones[i];
            let rot = b.rotation, x = b.x, y = b.y, sx = b.scaleX, sy = b.scaleY;
            const tracks = this.current?.bones[b.name];
            if (tracks) {
                const r = sample(tracks.rotate, this.time);
                if (r) rot += r[0];
                const t = sample(tracks.translate, this.time);
                if (t) {
                    x += t[0];
                    y += t[1];
                }
                const s = sample(tracks.scale, this.time);
                if (s) {
                    sx *= s[0];
                    sy *= s[1];
                }
            }
            const local = trs(x, y, rot, sx, sy);
            const pi = b.parent !== null ? this.boneIndex.get(b.parent) : undefined;
            world[i] = pi !== undefined ? mul(world[pi], local) : local; // parents are always listed first
        }

        for (const slot of this.slots) {
            const att = slot.attachment ? this.data.skins.default[slot.json.name]?.[slot.attachment] : undefined;
            const frame = att ? this.frames.get(att.path) : undefined;
            if (!att || !frame) {
                slot.node.active = false;
                continue;
            }
            slot.node.active = true;
            slot.sprite.spriteFrame = frame;
            slot.tr.setContentSize(att.width, att.height);
            slot.opacity.opacity = Math.round(slot.json.alpha * 255);

            const m = mul(world[slot.boneIndex], trs(att.x, att.y, att.rotation, att.scaleX, att.scaleY));
            // y-down/clockwise -> y-up/counter-clockwise (conjugate by diag(1,-1))
            const a = m.a, b = -m.b, c = -m.c, d = m.d;
            const sx = Math.hypot(a, b);
            const sy = sx > 1e-8 ? (a * d - b * c) / sx : 0;
            slot.node.setPosition(m.tx, -m.ty, 0);
            slot.node.angle = Math.atan2(b, a) / DEG;
            slot.node.setScale(sx, sy, 1);
        }
    }
}
