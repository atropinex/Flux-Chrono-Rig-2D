import {makeId, Project} from '../../model/Project'
import type {AttachmentData} from '../../model/types'
import type {EditorController} from '../EditorController'

/** Put an image on a bone: creates a slot with a region attachment centred on the bone's origin. */
export function attachAsset(c: EditorController, boneId: string, assetId: string): void {
    const asset = c.project.asset(assetId)
    if (!asset || !c.project.bone(boneId)) return
    const id = makeId('slot')
    const name = Project.uniqueName(asset.name, c.project.slots.map((s) => s.name))
    c.edit('Attach image', () => {
        c.project.slots.push({
            id,
            name,
            boneId,
            alpha: 1,
            attachment: asset.name,
            attachments: [{name: asset.name, assetId, x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1}]
        })
    })
    c.selectSlot(id)
}

export function removeSlot(c: EditorController, id: string): void {
    c.edit('Remove slot', () => {
        c.project.slots = c.project.slots.filter((s) => s.id !== id)
    })
    c.sanitize()
    c.emit('state')
}

/** dir -1 = draw earlier (further back), +1 = draw later (in front). */
export function moveSlot(c: EditorController, id: string, dir: -1 | 1): void {
    const i = c.project.slots.findIndex((s) => s.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= c.project.slots.length) return
    c.edit('Change draw order', () => {
        const slots = c.project.slots
        ;[slots[i], slots[j]] = [slots[j], slots[i]]
    })
}

export function setSlotAlpha(c: EditorController, id: string, alpha: number): void {
    const slot = c.project.slot(id)
    if (!slot) return
    c.edit('Set slot alpha', () => {
        slot.alpha = Math.min(1, Math.max(0, alpha))
    }, `alpha:${id}`)
}

export function toggleSlotVisible(c: EditorController, id: string): void {
    const slot = c.project.slot(id)
    if (!slot) return
    c.edit('Toggle visibility', () => {
        slot.attachment = slot.attachment ? null : (slot.attachments[0]?.name ?? null)
    })
}

export function setAttachmentProp(
    c: EditorController,
    slotId: string,
    patch: Partial<Pick<AttachmentData, 'x' | 'y' | 'rotation' | 'scaleX' | 'scaleY'>>
): void {
    const slot = c.project.slot(slotId)
    const att = slot?.attachments.find((a) => a.name === slot.attachment)
    if (!att) return
    c.edit('Edit attachment', () => Object.assign(att, patch), `att:${slotId}:${Object.keys(patch).join(',')}`)
}

export function renameSlot(c: EditorController, id: string, name: string): void {
    const slot = c.project.slot(id)
    const clean = name.trim()
    if (!slot || !clean || clean === slot.name) return
    const others = c.project.slots.filter((s) => s.id !== id).map((s) => s.name)
    c.edit('Rename slot', () => {
        slot.name = Project.uniqueName(clean, others)
    })
}
