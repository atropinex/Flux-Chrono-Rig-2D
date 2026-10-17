import {dist, type Vec2} from '../../model/math'
import {createBone} from '../commands/BoneCommands'
import type {Tool} from './Tool'

let start: Vec2 | null = null

export const createBoneTool: Tool = {
    id: 'bone',
    label: 'Bone',
    shortcut: 'B',
    hint: 'Drag to draw a bone. It becomes a child of the selected bone.',
    cursor: 'crosshair',
    down(c, i) {
        if (c.mode !== 'setup') return c.say('Switch to Setup mode to create bones.')
        start = i.p
        c.preview = {from: i.p, to: i.p}
        c.emit('view')
    },
    move(c, i) {
        if (!start) return
        c.preview = {from: start, to: i.p}
        c.emit('view')
    },
    up(c, i) {
        if (!start) return
        const from = start
        start = null
        c.preview = null
        c.emit('view')
        if (dist(from, i.p) * i.zoom < 6) return // a click, not a drag
        createBone(c, from, i.p, c.boneId)
    }
}
