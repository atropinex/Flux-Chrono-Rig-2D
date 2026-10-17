import type {EditorController} from './EditorController'

export class PlaybackController {
    private raf = 0
    private last = 0

    constructor(private c: EditorController) {
    }

    start(): void {
        if (this.raf) return
        this.last = performance.now()
        const tick = (now: number): void => {
            const dt = (now - this.last) / 1000
            this.last = now
            const anim = this.c.animation
            if (anim) {
                let t = this.c.time + dt
                if (t > anim.duration) t = anim.duration > 0 ? t % anim.duration : 0
                this.c.time = t
                this.c.emit('time')
            }
            this.raf = requestAnimationFrame(tick)
        }
        this.raf = requestAnimationFrame(tick)
    }

    stop(): void {
        cancelAnimationFrame(this.raf)
        this.raf = 0
    }
}
