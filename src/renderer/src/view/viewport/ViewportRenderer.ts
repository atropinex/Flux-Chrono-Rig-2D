import type {EditorController} from '../../controller/EditorController'
import {apply, type Vec2} from '../../model/math'
import {attachmentMatrix} from '../../model/Pose'
import type {ImageCache} from './ImageCache'

const COLORS = {
    bg: '#171a20',
    grid: '#232830',
    axis: '#323a46',
    bone: '#55c9bd',
    boneSelected: '#f0a43c',
    boneAnimate: '#7fd8ff',
    slotOutline: '#f0a43c'
}

/** Draws the model onto a 2D canvas. Pure rendering: no editing logic lives here. */
export class ViewportRenderer {
    constructor(
        private canvas: HTMLCanvasElement,
        private c: EditorController,
        private images: ImageCache
    ) {
    }

    draw(): void {
        const {canvas, c} = this
        const dpr = window.devicePixelRatio || 1
        const w = canvas.clientWidth
        const h = canvas.clientHeight
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
            canvas.width = Math.round(w * dpr)
            canvas.height = Math.round(h * dpr)
        }
        const ctx = canvas.getContext('2d')!
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.fillStyle = COLORS.bg
        ctx.fillRect(0, 0, w, h)

        this.drawGrid(ctx, w, h)
        this.drawSlots(ctx, dpr)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        this.drawBones(ctx)
        this.drawPreview(ctx)
    }

    private toScreen(p: Vec2): Vec2 {
        const {x, y, zoom} = this.c.camera
        return {x: p.x * zoom + x, y: p.y * zoom + y}
    }

    private drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
        const {x, y, zoom} = this.c.camera
        let step = 25
        while (step * zoom < 36) step *= 2
        const px = step * zoom
        ctx.lineWidth = 1
        ctx.strokeStyle = COLORS.grid
        ctx.beginPath()
        for (let sx = ((x % px) + px) % px; sx < w; sx += px) {
            ctx.moveTo(Math.round(sx) + 0.5, 0)
            ctx.lineTo(Math.round(sx) + 0.5, h)
        }
        for (let sy = ((y % px) + px) % px; sy < h; sy += px) {
            ctx.moveTo(0, Math.round(sy) + 0.5)
            ctx.lineTo(w, Math.round(sy) + 0.5)
        }
        ctx.stroke()
        ctx.strokeStyle = COLORS.axis
        ctx.beginPath()
        ctx.moveTo(Math.round(x) + 0.5, 0)
        ctx.lineTo(Math.round(x) + 0.5, h)
        ctx.moveTo(0, Math.round(y) + 0.5)
        ctx.lineTo(w, Math.round(y) + 0.5)
        ctx.stroke()
    }

    private drawSlots(ctx: CanvasRenderingContext2D, dpr: number): void {
        const {c} = this
        const {x: cx, y: cy, zoom} = c.camera
        for (const slot of c.project.slots) {
            const att = slot.attachments.find((a) => a.name === slot.attachment)
            const posed = c.pose.get(slot.boneId)
            const asset = att && c.project.asset(att.assetId)
            if (!att || !posed || !asset) continue
            const img = this.images.get(asset)
            if (!img) continue
            const m = attachmentMatrix(posed.world, att)
            ctx.save()
            ctx.globalAlpha = slot.alpha
            ctx.setTransform(
                dpr * zoom * m.a,
                dpr * zoom * m.b,
                dpr * zoom * m.c,
                dpr * zoom * m.d,
                dpr * (zoom * m.tx + cx),
                dpr * (zoom * m.ty + cy)
            )
            ctx.drawImage(img, -asset.width / 2, -asset.height / 2, asset.width, asset.height)
            if (slot.id === c.slotId) {
                ctx.globalAlpha = 1
                ctx.strokeStyle = COLORS.slotOutline
                ctx.lineWidth = 1 / zoom
                ctx.strokeRect(-asset.width / 2, -asset.height / 2, asset.width, asset.height)
            }
            ctx.restore()
        }
    }

    private drawBones(ctx: CanvasRenderingContext2D): void {
        const {c} = this
        const animate = c.mode === 'animate'
        for (const bone of c.project.bones) {
            const posed = c.pose.get(bone.id)
            if (!posed) continue
            const o = this.toScreen(apply(posed.world, 0, 0))
            const t = this.toScreen(apply(posed.world, bone.length, 0))
            const selected = bone.id === c.boneId
            const color = selected ? COLORS.boneSelected : animate ? COLORS.boneAnimate : COLORS.bone

            const dx = t.x - o.x
            const dy = t.y - o.y
            const len = Math.hypot(dx, dy)
            ctx.fillStyle = color
            ctx.strokeStyle = color
            ctx.lineWidth = selected ? 2 : 1.25

            if (len < 2) {
                ctx.beginPath()
                ctx.arc(o.x, o.y, 5, 0, Math.PI * 2)
                ctx.stroke()
                continue
            }
            // slim diamond: wide near the head, tapering to the tip
            const width = Math.min(Math.max(len * 0.12, 3), 9)
            const bx = o.x + dx * 0.18
            const by = o.y + dy * 0.18
            const nx = (-dy / len) * width
            const ny = (dx / len) * width
            ctx.beginPath()
            ctx.moveTo(o.x, o.y)
            ctx.lineTo(bx + nx, by + ny)
            ctx.lineTo(t.x, t.y)
            ctx.lineTo(bx - nx, by - ny)
            ctx.closePath()
            ctx.globalAlpha = selected ? 0.42 : 0.2
            ctx.fill()
            ctx.globalAlpha = 1
            ctx.stroke()

            ctx.beginPath()
            ctx.arc(o.x, o.y, selected ? 4 : 3, 0, Math.PI * 2)
            ctx.fill()
        }
    }

    private drawPreview(ctx: CanvasRenderingContext2D): void {
        const pv = this.c.preview
        if (!pv) return
        const a = this.toScreen(pv.from)
        const b = this.toScreen(pv.to)
        ctx.strokeStyle = COLORS.boneSelected
        ctx.fillStyle = COLORS.boneSelected
        ctx.setLineDash([5, 4])
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.arc(a.x, a.y, 4, 0, Math.PI * 2)
        ctx.fill()
    }
}

