export interface Vec2 {
    x: number
    y: number
}

/**
 * 2x3 affine matrix, applied as:  x' = a*x + c*y + tx ;  y' = b*x + d*y + ty
 * Coordinates are y-DOWN (screen space). Runtimes convert to y-up.
 */
export interface Mat {
    a: number
    b: number
    c: number
    d: number
    tx: number
    ty: number
}

export const DEG = Math.PI / 180

export const identity = (): Mat => ({a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0})

/** Translate * Rotate * Scale */
export function fromTRS(x: number, y: number, rotationDeg: number, sx: number, sy: number): Mat {
    const r = rotationDeg * DEG
    const cos = Math.cos(r)
    const sin = Math.sin(r)
    return {a: cos * sx, b: sin * sx, c: -sin * sy, d: cos * sy, tx: x, ty: y}
}

/** parent * local */
export function multiply(p: Mat, l: Mat): Mat {
    return {
        a: p.a * l.a + p.c * l.b,
        b: p.b * l.a + p.d * l.b,
        c: p.a * l.c + p.c * l.d,
        d: p.b * l.c + p.d * l.d,
        tx: p.a * l.tx + p.c * l.ty + p.tx,
        ty: p.b * l.tx + p.d * l.ty + p.ty
    }
}

export function determinant(m: Mat): number {
    return m.a * m.d - m.b * m.c
}

export function invert(m: Mat): Mat {
    const det = determinant(m) || 1e-12
    const a = m.d / det
    const b = -m.b / det
    const c = -m.c / det
    const d = m.a / det
    return {a, b, c, d, tx: -(a * m.tx + c * m.ty), ty: -(b * m.tx + d * m.ty)}
}

export const apply = (m: Mat, x: number, y: number): Vec2 => ({
    x: m.a * x + m.c * y + m.tx,
    y: m.b * x + m.d * y + m.ty
})

/** Rotation/scale only, ignores translation. Use for direction vectors and deltas. */
export const applyLinear = (m: Mat, x: number, y: number): Vec2 => ({
    x: m.a * x + m.c * y,
    y: m.b * x + m.d * y
})

export const rotationOf = (m: Mat): number => Math.atan2(m.b, m.a) / DEG

export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y)

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/** Smallest signed difference between two angles in degrees, in (-180, 180]. */
export function angleDelta(from: number, to: number): number {
    let d = (to - from) % 360
    if (d > 180) d -= 360
    if (d <= -180) d += 360
    return d
}
