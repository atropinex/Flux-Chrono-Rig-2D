import type {Vec2} from '../model/math'
import {Project} from '../model/Project'
import {evaluatePose, type PosedBone} from '../model/Pose'
import type {AnimationData, Channel} from '../model/types'
import {Emitter} from './Emitter'
import {History} from './History'
import {PlaybackController} from './PlaybackController'
import {createTools, type Tool} from './tools'

export type Mode = 'setup' | 'animate'
export type ToolId = 'select' | 'bone' | 'rotate' | 'translate' | 'scale'
/** project = document changed, state = selection/mode/tool/etc, time = playhead, view = camera/preview only */
export type EditorEvent = 'project' | 'state' | 'time' | 'view'

export interface KeyRef {
    boneId: string
    channel: Channel
    time: number
}

/**
 * Single entry point the View talks to. Holds the document plus all editor state,
 * and notifies the View through `events`. It never imports React.
 */
export class EditorController {
    project = Project.createEmpty()
    history = new History()
    events = new Emitter<EditorEvent>()
    tools: Record<ToolId, Tool> = createTools()

    mode: Mode = 'setup'
    toolId: ToolId = 'select'
    boneId: string | null = null
    slotId: string | null = null
    key: KeyRef | null = null
    animationId: string | null = this.project.animations[0]?.id ?? null
    time = 0
    playing = false
    camera = {x: 0, y: 0, zoom: 1, ready: false}
    preview: { from: Vec2; to: Vec2 } | null = null
    status = 'Pick the Bone tool (B) and drag in the viewport to draw your first bone.'
    filePath: string | null = null
    dirty = false
    /** increments on every emit; used to cache derived data */
    rev = 0

    private poseCache: { rev: number; pose: Map<string, PosedBone> } | null = null
    private playback = new PlaybackController(this)

    // ---------- derived ----------
    get animation(): AnimationData | null {
        return this.project.animation(this.animationId) ?? null
    }

    /** Pose shown in the viewport: animated pose in Animate mode, setup pose otherwise. */
    get pose(): Map<string, PosedBone> {
        if (!this.poseCache || this.poseCache.rev !== this.rev) {
            const anim = this.mode === 'animate' ? this.animation : null
            this.poseCache = {rev: this.rev, pose: evaluatePose(this.project, anim, this.time)}
        }
        return this.poseCache.pose
    }

    snap = (t: number): number => Math.round(t * this.project.fps) / this.project.fps

    emit(event: EditorEvent): void {
        this.rev++
        this.events.emit(event)
    }

    say(message: string): void {
        this.status = message
        this.emit('state')
    }

    // ---------- editing (everything goes through here so undo/redo just works) ----------
    edit(label: string, mutate: () => void, mergeKey?: string): void {
        const before = this.project.snapshot()
        mutate()
        const after = this.project.snapshot()
        this.history.push({label, before, after, mergeKey, time: Date.now()})
        this.dirty = true
        this.emit('project')
    }

    undo(): void {
        const e = this.history.undo()
        if (!e) return
        this.project.restore(e.before)
        this.afterHistoryJump(`Undid: ${e.label}`)
    }

    redo(): void {
        const e = this.history.redo()
        if (!e) return
        this.project.restore(e.after)
        this.afterHistoryJump(`Redid: ${e.label}`)
    }

    private afterHistoryJump(message: string): void {
        this.dirty = true
        this.sanitize()
        this.status = message
        this.emit('project')
        this.emit('state')
    }

    /** Drop selections that no longer exist. */
    sanitize(): void {
        if (this.boneId && !this.project.bone(this.boneId)) this.boneId = null
        if (this.slotId && !this.project.slot(this.slotId)) this.slotId = null
        if (this.key && !this.project.bone(this.key.boneId)) this.key = null
        if (!this.animation) this.animationId = this.project.animations[0]?.id ?? null
    }

    // ---------- document lifecycle ----------
    loadProject(project: Project, path: string | null): void {
        this.playback.stop()
        this.playing = false
        this.project = project
        this.history.clear()
        this.boneId = this.slotId = this.key = null
        this.animationId = project.animations[0]?.id ?? null
        this.time = 0
        this.mode = 'setup'
        this.filePath = path
        this.dirty = false
        this.status = path ? `Opened ${project.name}` : 'New project'
        this.emit('project')
        this.emit('state')
    }

    // ---------- editor state ----------
    setMode(mode: Mode): void {
        if (mode === this.mode) return
        if (mode === 'setup' && this.playing) this.togglePlay()
        this.mode = mode
        this.status =
            mode === 'animate'
                ? 'Animate mode: moving, rotating or scaling a bone sets a key at the playhead.'
                : 'Setup mode: edits change the rest pose.'
        this.emit('state')
    }

    setTool(id: ToolId): void {
        this.toolId = id
        this.emit('state')
    }

    selectBone(id: string | null): void {
        this.boneId = id
        this.slotId = null
        this.key = null
        this.emit('state')
    }

    selectSlot(id: string | null): void {
        const slot = this.project.slot(id)
        this.slotId = id
        if (slot) this.boneId = slot.boneId
        this.key = null
        this.emit('state')
    }

    selectKey(key: KeyRef | null): void {
        this.key = key
        if (key) {
            this.boneId = key.boneId
            this.slotId = null
        }
        this.emit('state')
    }

    setAnimation(id: string): void {
        this.animationId = id
        this.time = 0
        this.key = null
        this.emit('state')
        this.emit('time')
    }

    setTime(t: number, snap = true): void {
        const dur = this.animation?.duration ?? 0
        const clamped = Math.min(dur, Math.max(0, t))
        this.time = snap ? this.snap(clamped) : clamped
        this.emit('time')
    }

    togglePlay(): void {
        if (this.playing) {
            this.playing = false
            this.playback.stop()
        } else {
            if (!this.animation) return this.say('Create an animation first.')
            if (this.mode !== 'animate') this.setMode('animate')
            this.playing = true
            this.playback.start()
        }
        this.emit('state')
    }
}
