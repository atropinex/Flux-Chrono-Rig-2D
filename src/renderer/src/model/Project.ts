import type {AnimationData, AssetData, BoneData, SlotData, Snapshot} from './types'

export function makeId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

/** The document. Owns the data and answers simple questions about it; edits go through the controller. */
export class Project {
    name = 'untitled'
    fps = 30
    /** Parents always appear before their children. */
    bones: BoneData[] = []
    /** Array order == draw order (last is drawn on top). */
    slots: SlotData[] = []
    assets: AssetData[] = []
    animations: AnimationData[] = []

    static createEmpty(): Project {
        const p = new Project()
        p.animations.push({id: makeId('anim'), name: 'idle', duration: 1, tracks: {}})
        return p
    }

    bone = (id: string | null): BoneData | undefined => (id ? this.bones.find((b) => b.id === id) : undefined)
    slot = (id: string | null): SlotData | undefined => (id ? this.slots.find((s) => s.id === id) : undefined)
    asset = (id: string): AssetData | undefined => this.assets.find((a) => a.id === id)
    animation = (id: string | null): AnimationData | undefined =>
        id ? this.animations.find((a) => a.id === id) : undefined

    childrenOf = (id: string | null): BoneData[] => this.bones.filter((b) => b.parentId === id)

    descendantIds(id: string): string[] {
        const out: string[] = []
        const walk = (parent: string): void => {
            for (const child of this.childrenOf(parent)) {
                out.push(child.id)
                walk(child.id)
            }
        }
        walk(id)
        return out
    }

    /** "bone" -> "bone", then "bone2", "bone3", ... */
    static uniqueName(base: string, taken: string[]): string {
        if (!taken.includes(base)) return base
        let n = 2
        while (taken.includes(`${base}${n}`)) n++
        return `${base}${n}`
    }

    snapshot(): Snapshot {
        return structuredClone({bones: this.bones, slots: this.slots, animations: this.animations})
    }

    restore(s: Snapshot): void {
        const c = structuredClone(s)
        this.bones = c.bones
        this.slots = c.slots
        this.animations = c.animations
    }
}
