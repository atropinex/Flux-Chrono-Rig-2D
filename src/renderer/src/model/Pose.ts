import {fromTRS, multiply, type Mat} from './math'
import {sample} from './Keyframes'
import type {Project} from './Project'
import type {AnimationData, AttachmentData, BonePose} from './types'

export interface PosedBone {
    local: BonePose
    world: Mat
}

/**
 * Evaluates every bone for an animation at a time (or the setup pose when anim is null).
 * Runtimes implement exactly this algorithm so playback matches the editor.
 */
export function evaluatePose(project: Project, anim: AnimationData | null, time: number): Map<string, PosedBone> {
    const out = new Map<string, PosedBone>()

    const resolve = (id: string): PosedBone | undefined => {
        const cached = out.get(id)
        if (cached) return cached
        const bone = project.bone(id)
        if (!bone) return undefined

        const local: BonePose = {
            x: bone.x,
            y: bone.y,
            rotation: bone.rotation,
            scaleX: bone.scaleX,
            scaleY: bone.scaleY
        }
        const tracks = anim?.tracks[id]
        if (tracks) {
            const rot = sample(tracks.rotate, time)
            if (rot) local.rotation += rot[0]
            const tr = sample(tracks.translate, time)
            if (tr) {
                local.x += tr[0]
                local.y += tr[1]
            }
            const sc = sample(tracks.scale, time)
            if (sc) {
                local.scaleX *= sc[0]
                local.scaleY *= sc[1]
            }
        }

        const localM = fromTRS(local.x, local.y, local.rotation, local.scaleX, local.scaleY)
        const parent = bone.parentId ? resolve(bone.parentId) : undefined
        const posed: PosedBone = {local, world: parent ? multiply(parent.world, localM) : localM}
        out.set(id, posed)
        return posed
    }

    for (const b of project.bones) resolve(b.id)
    return out
}

export const attachmentMatrix = (boneWorld: Mat, att: AttachmentData): Mat =>
    multiply(boneWorld, fromTRS(att.x, att.y, att.rotation, att.scaleX, att.scaleY))
