import {ease} from './Curve'
import type {Channel, CurveType, Keyframe} from './types'

export const TIME_EPS = 1e-4

/** Value of a channel when no key exists (offsets are 0, scale multipliers are 1). */
export const DEFAULT_V: Record<Channel, [number, number]> = {
    rotate: [0, 0],
    translate: [0, 0],
    scale: [1, 1]
}

/** Interpolated value at `time`, or null if the channel has no keys. Keys must be sorted by time. */
export function sample(keys: Keyframe[] | undefined, time: number): [number, number] | null {
    if (!keys || keys.length === 0) return null
    if (time <= keys[0].time) return keys[0].v
    const last = keys[keys.length - 1]
    if (time >= last.time) return last.v
    let i = 0
    while (i < keys.length - 2 && keys[i + 1].time <= time) i++
    const a = keys[i]
    const b = keys[i + 1]
    if (a.curve === 'stepped') return a.v
    const e = ease(a.curve, (time - a.time) / (b.time - a.time))
    return [a.v[0] + (b.v[0] - a.v[0]) * e, a.v[1] + (b.v[1] - a.v[1]) * e]
}

export const findKey = (keys: Keyframe[] | undefined, time: number): Keyframe | undefined =>
    keys?.find((k) => Math.abs(k.time - time) < TIME_EPS)

/** Insert a key or update the one at `time` (keeps its curve unless a new one is given). */
export function upsertKey(keys: Keyframe[], time: number, v: [number, number], curve?: CurveType): void {
    const existing = findKey(keys, time)
    if (existing) {
        existing.v = v
        if (curve) existing.curve = curve
        return
    }
    keys.push({time, v, curve: curve ?? 'linear'})
    keys.sort((p, q) => p.time - q.time)
}

export function removeKey(keys: Keyframe[], time: number): boolean {
    const i = keys.findIndex((k) => Math.abs(k.time - time) < TIME_EPS)
    if (i < 0) return false
    keys.splice(i, 1)
    return true
}

/** Move the key at `from` to `to`. A key already at `to` is replaced. */
export function moveKey(keys: Keyframe[], from: number, to: number): boolean {
    const key = findKey(keys, from)
    if (!key) return false
    const other = keys.find((k) => k !== key && Math.abs(k.time - to) < TIME_EPS)
    if (other) keys.splice(keys.indexOf(other), 1)
    key.time = to
    keys.sort((p, q) => p.time - q.time)
    return true
}
