import {apply, type Vec2} from '../../model/math'
import type {EditorController} from '../EditorController'

function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** Nearest bone within ~10 screen pixels of the world point p, or null. */
export function hitBone(c: EditorController, p: Vec2, zoom: number): string | null {
    const threshold = 10 / zoom
    let best: string | null = null
    let bestDist = threshold
    for (const bone of c.project.bones) {
        const posed = c.pose.get(bone.id)
        if (!posed) continue
        const o = apply(posed.world, 0, 0)
        const tip = apply(posed.world, bone.length, 0)
        const d = distToSegment(p, o, tip)
        if (d <= bestDist) {
            bestDist = d
            best = bone.id
        }
    }
    return best
}
