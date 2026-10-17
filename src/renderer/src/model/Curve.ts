import type {CurveType} from './types'

export const BEZIER_PRESETS: Record<string, [number, number, number, number]> = {
    'Ease in': [0.42, 0, 1, 1],
    'Ease out': [0, 0, 0.58, 1],
    'Ease in-out': [0.42, 0, 0.58, 1]
}

/** Maps linear progress t (0..1) to eased progress. 'stepped' is handled by the sampler (it holds the value). */
export function ease(curve: CurveType, t: number): number {
    if (curve === 'linear') return t
    if (curve === 'stepped') return 0
    if (t <= 0) return 0
    if (t >= 1) return 1
    const [x1, y1, x2, y2] = curve
    const bez = (s: number, p1: number, p2: number): number => {
        const u = 1 - s
        return 3 * u * u * s * p1 + 3 * u * s * s * p2 + s * s * s
    }
    // find s such that x(s) == t (x is monotonic for x1,x2 in [0,1])
    let lo = 0
    let hi = 1
    for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2
        if (bez(mid, x1, x2) < t) lo = mid
        else hi = mid
    }
    return bez((lo + hi) / 2, y1, y2)
}

export function curveLabel(curve: CurveType): string {
    if (curve === 'linear' || curve === 'stepped') return curve
    for (const [name, p] of Object.entries(BEZIER_PRESETS)) {
        if (p.every((v, i) => Math.abs(v - curve[i]) < 1e-6)) return name
    }
    return 'Custom bezier'
}
