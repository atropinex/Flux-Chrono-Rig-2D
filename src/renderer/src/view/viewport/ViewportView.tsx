import {useEffect, useRef} from 'react'
import type {PointerInfo} from '../../controller/tools'
import {clamp} from '../../model/math'
import {useEditor, useEditorEvents} from '../hooks'
import {ImageCache} from './ImageCache'
import {ViewportRenderer} from './ViewportRenderer'

export function ViewportView() {
    const c = useEditor()
    useEditorEvents(['state', 'project'])
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const pan = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null)
    const dragging = useRef(false)

    useEffect(() => {
        const canvas = canvasRef.current!
        let raf = 0
        const schedule = (): void => {
            if (!raf)
                raf = requestAnimationFrame(() => {
                    raf = 0
                    renderer.draw()
                })
        }
        const renderer = new ViewportRenderer(canvas, c, new ImageCache(schedule))
        const offs = (['project', 'state', 'time', 'view'] as const).map((e) => c.events.on(e, schedule))
        const ro = new ResizeObserver(() => {
            if (!c.camera.ready) {
                c.camera.x = canvas.clientWidth / 2
                c.camera.y = canvas.clientHeight * 0.68
                c.camera.ready = true
            }
            schedule()
        })
        ro.observe(canvas)
        return () => {
            offs.forEach((off) => off())
            ro.disconnect()
            cancelAnimationFrame(raf)
        }
    }, [c])

    const info = (e: React.PointerEvent): PointerInfo => {
        const r = canvasRef.current!.getBoundingClientRect()
        const {x, y, zoom} = c.camera
        return {p: {x: (e.clientX - r.left - x) / zoom, y: (e.clientY - r.top - y) / zoom}, zoom, shift: e.shiftKey}
    }

    const tool = c.tools[c.toolId]

    return (
        <div className={`viewport ${c.mode}`}>
            <canvas
                ref={canvasRef}
                style={{cursor: pan.current ? 'grabbing' : tool.cursor}}
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={(e) => {
                    canvasRef.current!.setPointerCapture(e.pointerId)
                    if (e.button === 1 || e.button === 2 || e.altKey) {
                        pan.current = {x: e.clientX, y: e.clientY, cx: c.camera.x, cy: c.camera.y}
                    } else if (e.button === 0) {
                        dragging.current = true
                        tool.down(c, info(e))
                    }
                }}
                onPointerMove={(e) => {
                    if (pan.current) {
                        c.camera.x = pan.current.cx + e.clientX - pan.current.x
                        c.camera.y = pan.current.cy + e.clientY - pan.current.y
                        c.emit('view')
                    } else if (dragging.current) tool.move(c, info(e))
                }}
                onPointerUp={(e) => {
                    if (pan.current) pan.current = null
                    else if (dragging.current) {
                        dragging.current = false
                        tool.up(c, info(e))
                    }
                }}
                onWheel={(e) => {
                    const r = canvasRef.current!.getBoundingClientRect()
                    const mx = e.clientX - r.left
                    const my = e.clientY - r.top
                    const cam = c.camera
                    const wx = (mx - cam.x) / cam.zoom
                    const wy = (my - cam.y) / cam.zoom
                    cam.zoom = clamp(cam.zoom * Math.exp(-e.deltaY * 0.0015), 0.05, 20)
                    cam.x = mx - wx * cam.zoom
                    cam.y = my - wy * cam.zoom
                    c.emit('view')
                }}
            />
            {c.project.bones.length === 0 && (
                <div className="viewport-empty">
                    <strong>Draw your first bone</strong>
                    <span>Press B, then drag in the viewport.</span>
                </div>
            )}
            <div className="viewport-hint">
                {tool.label}: {tool.hint} <span className="muted">Scroll to zoom, right-drag to pan.</span>
            </div>
        </div>
    )
}
