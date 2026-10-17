import {findKey, moveKey as moveKeyIn, removeKey, upsertKey} from '../../model/Keyframes'
import {makeId, Project} from '../../model/Project'
import type {Channel, CurveType} from '../../model/types'
import type {EditorController, KeyRef} from '../EditorController'

export function createAnimation(c: EditorController): void {
    const id = makeId('anim')
    const name = Project.uniqueName('anim', c.project.animations.map((a) => a.name))
    c.edit('Create animation', () => {
        c.project.animations.push({id, name, duration: 1, tracks: {}})
    })
    c.setAnimation(id)
}

export function deleteAnimation(c: EditorController, id: string): void {
    c.edit('Delete animation', () => {
        c.project.animations = c.project.animations.filter((a) => a.id !== id)
    })
    c.sanitize()
    c.emit('state')
}

export function renameAnimation(c: EditorController, id: string, name: string): void {
    const anim = c.project.animation(id)
    const clean = name.trim()
    if (!anim || !clean || clean === anim.name) return
    const others = c.project.animations.filter((a) => a.id !== id).map((a) => a.name)
    c.edit('Rename animation', () => {
        anim.name = Project.uniqueName(clean, others)
    })
}

export function setDuration(c: EditorController, seconds: number): void {
    const anim = c.animation
    if (!anim || !(seconds > 0)) return
    c.edit('Set duration', () => {
        anim.duration = seconds
    }, `dur:${anim.id}`)
    if (c.time > seconds) c.setTime(seconds)
}

export function setFps(c: EditorController, fps: number): void {
    if (!(fps >= 1 && fps <= 240)) return
    c.project.fps = Math.round(fps)
    c.dirty = true
    c.emit('project')
}

/** Key all three channels of a bone with the values currently shown at the playhead. */
export function keyPose(c: EditorController, boneId: string): void {
    const anim = c.animation
    const bone = c.project.bone(boneId)
    const cur = c.pose.get(boneId)?.local
    if (!anim || !bone || !cur) return
    const t = c.snap(c.time)
    c.edit('Key pose', () => {
        const tracks = (anim.tracks[boneId] ??= {})
        upsertKey((tracks.rotate ??= []), t, [cur.rotation - bone.rotation, 0])
        upsertKey((tracks.translate ??= []), t, [cur.x - bone.x, cur.y - bone.y])
        upsertKey((tracks.scale ??= []), t, [cur.scaleX / (bone.scaleX || 1), cur.scaleY / (bone.scaleY || 1)])
    })
}

export function deleteKey(c: EditorController, k: KeyRef): void {
    const keys = c.animation?.tracks[k.boneId]?.[k.channel]
    if (!keys) return
    c.edit('Delete key', () => {
        removeKey(keys, k.time)
    })
    c.selectKey(null)
}

/** Returns the key's new reference (its time changed). */
export function moveKey(c: EditorController, k: KeyRef, toTime: number, mergeKey: string): KeyRef {
    const keys = c.animation?.tracks[k.boneId]?.[k.channel]
    if (!keys || !findKey(keys, k.time)) return k
    c.edit('Move key', () => {
        moveKeyIn(keys, k.time, toTime)
    }, mergeKey)
    return {...k, time: toTime}
}

export function setKeyCurve(c: EditorController, k: KeyRef, curve: CurveType): void {
    const key = findKey(c.animation?.tracks[k.boneId]?.[k.channel], k.time)
    if (!key) return
    c.edit('Set key curve', () => {
        key.curve = curve
    }, `curve:${k.boneId}:${k.channel}:${k.time}`)
}

export function keysOf(c: EditorController, boneId: string, channel: Channel) {
    return c.animation?.tracks[boneId]?.[channel] ?? []
}
