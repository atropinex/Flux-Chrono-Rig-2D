import {angleDelta, applyLinear, determinant, dist, identity, invert, type Mat, type Vec2} from '../../model/math'
import {applyPose} from '../commands/BoneCommands'
import {newGesture, type Tool} from './Tool'

interface Drag {
    boneId: string
    gesture: number
    origin: Vec2
    mouse: Vec2
    parent: Mat
    start: { x: number; y: number; rotation: number; scaleX: number; scaleY: number }
    lastAngle: number
    rotation: number
    startDist: number
}

let drag: Drag | null = null

const angleTo = (from: Vec2, to: Vec2): number => (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI

/** Captures everything a transform drag needs from the pose at pointer-down. */
function begin(c: Parameters<Tool['down']>[0], p: Vec2): boolean {
    const id = c.boneId
    const posed = id ? c.pose.get(id) : undefined
    const bone = id ? c.project.bone(id) : undefined
    if (!id || !posed || !bone) {
        c.say('Select a bone first (V), then use this tool.')
        return false
    }
    const origin = {x: posed.world.tx, y: posed.world.ty}
    drag = {
        boneId: id,
        gesture: newGesture(),
        origin,
        mouse: p,
        parent: (bone.parentId && c.pose.get(bone.parentId)?.world) || identity(),
        start: {...posed.local},
        lastAngle: angleTo(origin, p),
        rotation: posed.local.rotation,
        startDist: Math.max(dist(origin, p), 1e-3)
    }
    return true
}

const end = (): void => {
    drag = null
}

export const rotateTool: Tool = {
    id: 'rotate',
    label: 'Rotate',
    shortcut: 'R',
    hint: 'Drag around the bone to rotate it.',
    cursor: 'alias',
    down: (c, i) => void begin(c, i.p),
    move(c, i) {
        if (!drag) return
        const a = angleTo(drag.origin, i.p)
        // a mirrored parent flips rotation direction
        const flip = determinant(drag.parent) < 0 ? -1 : 1
        drag.rotation += angleDelta(drag.lastAngle, a) * flip
        drag.lastAngle = a
        applyPose(c, drag.boneId, {rotation: drag.rotation}, `rot:${drag.gesture}`)
    },
    up: end
}

export const translateTool: Tool = {
    id: 'translate',
    label: 'Move',
    shortcut: 'T',
    hint: 'Drag to move the bone.',
    cursor: 'move',
    down: (c, i) => void begin(c, i.p),
    move(c, i) {
        if (!drag) return
        const d = applyLinear(invert(drag.parent), i.p.x - drag.mouse.x, i.p.y - drag.mouse.y)
        applyPose(c, drag.boneId, {x: drag.start.x + d.x, y: drag.start.y + d.y}, `move:${drag.gesture}`)
    },
    up: end
}

export const scaleTool: Tool = {
    id: 'scale',
    label: 'Scale',
    shortcut: 'S',
    hint: 'Drag away from or toward the bone to scale it. Hold Shift to scale along the bone only.',
    cursor: 'nwse-resize',
    down: (c, i) => void begin(c, i.p),
    move(c, i) {
        if (!drag) return
        const k = Math.max(dist(drag.origin, i.p) / drag.startDist, 0.01)
        applyPose(
            c,
            drag.boneId,
            {scaleX: drag.start.scaleX * k, scaleY: i.shift ? drag.start.scaleY : drag.start.scaleY * k},
            `scale:${drag.gesture}`
        )
    },
    up: end
}
