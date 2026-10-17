/** Plain data types for the document. No behaviour, no UI imports. */

export type Channel = 'rotate' | 'translate' | 'scale'
export const CHANNELS: Channel[] = ['rotate', 'translate', 'scale']

/** 'linear' | 'stepped' (hold until next key) | cubic bezier control points [x1, y1, x2, y2]. */
export type CurveType = 'linear' | 'stepped' | [number, number, number, number]

/**
 * A keyframe stores an OFFSET from the setup pose:
 *  rotate    -> v[0] = degrees added to setup rotation
 *  translate -> v = (dx, dy) added to setup position
 *  scale     -> v = (mx, my) multiplied with setup scale
 * `curve` shapes the segment that STARTS at this key.
 */
export interface Keyframe {
    time: number
    v: [number, number]
    curve: CurveType
}

export type BoneTracks = Partial<Record<Channel, Keyframe[]>>

export interface BonePose {
    x: number
    y: number
    /** degrees, clockwise on screen (y axis points down) */
    rotation: number
    scaleX: number
    scaleY: number
}

export interface BoneData extends BonePose {
    id: string
    name: string
    parentId: string | null
    length: number
}

export interface AttachmentData {
    name: string
    assetId: string
    x: number
    y: number
    rotation: number
    scaleX: number
    scaleY: number
}

export interface SlotData {
    id: string
    name: string
    boneId: string
    alpha: number
    /** name of the active attachment, or null when hidden */
    attachment: string | null
    attachments: AttachmentData[]
}

export interface AnimationData {
    id: string
    name: string
    duration: number
    /** boneId -> tracks */
    tracks: Record<string, BoneTracks>
}

export interface AssetData {
    id: string
    /** unique, no extension. Used as the image name in exported data. */
    name: string
    mime: string
    dataUrl: string
    width: number
    height: number
}

/** Everything undo/redo needs to restore (assets are intentionally excluded: they are big and append-only). */
export interface Snapshot {
    bones: BoneData[]
    slots: SlotData[]
    animations: AnimationData[]
}
