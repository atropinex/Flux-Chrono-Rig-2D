import type {Project} from '../../model/Project'

export const RUNTIME_FORMAT = 'sk2d'
export const RUNTIME_VERSION = 1

/**
 * Engine-facing JSON. Uses names (not editor ids) so runtimes stay simple.
 * Coordinates are the editor's (y-down, degrees clockwise); runtimes flip to y-up.
 */
export function buildRuntimeJson(p: Project): object {
    const boneName = (id: string | null): string | undefined => p.bone(id)?.name

    const skin: Record<string, Record<string, object>> = {}
    for (const slot of p.slots) {
        const atts: Record<string, object> = {}
        for (const a of slot.attachments) {
            const asset = p.asset(a.assetId)
            if (!asset) continue
            atts[a.name] = {
                path: asset.name,
                x: a.x,
                y: a.y,
                rotation: a.rotation,
                scaleX: a.scaleX,
                scaleY: a.scaleY,
                width: asset.width,
                height: asset.height
            }
        }
        skin[slot.name] = atts
    }

    const animations: Record<string, object> = {}
    for (const anim of p.animations) {
        const bones: Record<string, object> = {}
        for (const [boneId, tracks] of Object.entries(anim.tracks)) {
            const name = boneName(boneId)
            if (name) bones[name] = tracks
        }
        animations[anim.name] = {duration: anim.duration, bones}
    }

    return {
        format: RUNTIME_FORMAT,
        version: RUNTIME_VERSION,
        name: p.name,
        fps: p.fps,
        bones: p.bones.map((b) => ({
            name: b.name,
            parent: boneName(b.parentId) ?? null,
            length: b.length,
            x: b.x,
            y: b.y,
            rotation: b.rotation,
            scaleX: b.scaleX,
            scaleY: b.scaleY
        })),
        slots: p.slots.map((s) => ({
            name: s.name,
            bone: boneName(s.boneId),
            alpha: s.alpha,
            attachment: s.attachment
        })),
        skins: {default: skin},
        animations
    }
}
