import {apply, applyLinear, dist, invert, DEG, type Vec2} from '../../model/math'
import {evaluatePose} from '../../model/Pose'
import {makeId, Project} from '../../model/Project'
import type {BonePose} from '../../model/types'
import type {EditorController} from '../EditorController'

/** Create a bone whose head is at `head` and tip at `tail` (world coordinates), as a child of parentId. */
export function createBone(c: EditorController, head: Vec2, tail: Vec2, parentId: string | null): string {
    const id = makeId('bone')
    const setup = evaluatePose(c.project, null, 0)
    const parent = parentId ? setup.get(parentId) : undefined

    // express head/tail in the parent's space so the bone stays attached when the parent moves
    let localHead = head
    let localTail = tail
    let rotation = Math.atan2(tail.y - head.y, tail.x - head.x) / DEG
    if (parent) {
        const inv = invert(parent.world)
        localHead = apply(inv, head.x, head.y)
        localTail = apply(inv, tail.x, tail.y)
        const dir = applyLinear(inv, tail.x - head.x, tail.y - head.y)
        rotation = Math.atan2(dir.y, dir.x) / DEG
    }

    const names = c.project.bones.map((b) => b.name)
    const name = Project.uniqueName(c.project.bones.length === 0 ? 'root' : 'bone', names)
    c.edit('Create bone', () => {
        c.project.bones.push({
            id,
            name,
            parentId,
            length: dist(localHead, localTail),
            x: localHead.x,
            y: localHead.y,
            rotation,
            scaleX: 1,
            scaleY: 1
        })
    })
    c.selectBone(id)
    return id
}

/** Deletes the bone, its children, their slots and any keys that referenced them. */
export function deleteBone(c: EditorController, id: string): void {
    const ids = new Set([id, ...c.project.descendantIds(id)])
    c.edit('Delete bone', () => {
        c.project.bones = c.project.bones.filter((b) => !ids.has(b.id))
        c.project.slots = c.project.slots.filter((s) => !ids.has(s.boneId))
        for (const anim of c.project.animations) for (const bid of ids) delete anim.tracks[bid]
    })
    c.sanitize()
    c.emit('state')
}

export function renameBone(c: EditorController, id: string, name: string): void {
    const bone = c.project.bone(id)
    const clean = name.trim()
    if (!bone || !clean || clean === bone.name) return
    const others = c.project.bones.filter((b) => b.id !== id).map((b) => b.name)
    c.edit('Rename bone', () => {
        bone.name = Project.uniqueName(clean, others)
    })
}

export function setBoneLength(c: EditorController, id: string, length: number): void {
    const bone = c.project.bone(id)
    if (!bone || !(length >= 0)) return
    c.edit('Set bone length', () => {
        bone.length = length
    }, `len:${id}`)
}

/**
 * Apply a pose edit (rotation / position / scale) to a bone.
 * Setup mode edits the rest pose; Animate mode writes keys at the playhead (auto-key).
 */
export function applyPose(c: EditorController, boneId: string, patch: Partial<BonePose>, mergeKey?: string): void {
    const bone = c.project.bone(boneId)
    if (!bone) return
    const anim = c.animation
    if (c.mode === 'setup' || !anim) {
        c.edit('Edit bone', () => Object.assign(bone, patch), mergeKey)
        return
    }
    const t = c.snap(c.time)
    const cur = c.pose.get(boneId)?.local ?? bone
    c.edit('Set key', () => {
        const tracks = (anim.tracks[boneId] ??= {})
        const put = (ch: 'rotate' | 'translate' | 'scale', v: [number, number]): void => {
            const keys = (tracks[ch] ??= [])
            const existing = keys.find((k) => Math.abs(k.time - t) < 1e-4)
            if (existing) existing.v = v
            else {
                keys.push({time: t, v, curve: 'linear'})
                keys.sort((p, q) => p.time - q.time)
            }
        }
        if (patch.rotation !== undefined) put('rotate', [patch.rotation - bone.rotation, 0])
        if (patch.x !== undefined || patch.y !== undefined)
            put('translate', [(patch.x ?? cur.x) - bone.x, (patch.y ?? cur.y) - bone.y])
        if (patch.scaleX !== undefined || patch.scaleY !== undefined)
            put('scale', [(patch.scaleX ?? cur.scaleX) / (bone.scaleX || 1), (patch.scaleY ?? cur.scaleY) / (bone.scaleY || 1)])
    }, mergeKey)
}
