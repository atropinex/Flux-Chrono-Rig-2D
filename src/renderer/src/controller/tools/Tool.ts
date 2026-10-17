import type {Vec2} from '../../model/math'
import type {EditorController, ToolId} from '../EditorController'

export interface PointerInfo {
    /** pointer position in world coordinates */
    p: Vec2
    /** viewport zoom, for pixel-based thresholds */
    zoom: number
    shift: boolean
}

export interface Tool {
    id: ToolId
    label: string
    shortcut: string
    hint: string
    cursor: string
    down(c: EditorController, i: PointerInfo): void
    move(c: EditorController, i: PointerInfo): void
    up(c: EditorController, i: PointerInfo): void
}

let gestureCounter = 0
/** Unique id per drag so all its edits merge into a single undo step. */
export const newGesture = (): number => ++gestureCounter
