import {useRef, useState} from 'react'
import {
    createAnimation,
    deleteAnimation,
    moveKey,
    renameAnimation,
    setDuration
} from '../../controller/commands/AnimationCommands'
import {newGesture} from '../../controller/tools/Tool'
import type {BoneData, Channel} from '../../model/types'
import {NumberField} from '../components/NumberField'
import {TextField} from '../components/TextField'
import {useEditor, useEditorEvents} from '../hooks'

const LABEL_W = 176
const CHANNELS: { id: Channel; label: string; top: number }[] = [
    {id: 'rotate', label: 'Rotate', top: 3},
    {id: 'translate', label: 'Translate', top: 12},
    {id: 'scale', label: 'Scale', top: 21}
]

export function TimelinePanel() {
    const c = useEditor()
    useEditorEvents(['project', 'state', 'time'])
    const [pps, setPps] = useState(240) // pixels per second
    const rulerRef = useRef<HTMLDivElement>(null)
    const anim = c.animation
    const fps = c.project.fps

    const depth = (b: BoneData): number => {
        let d = 0
        for (let p = c.project.bone(b.parentId); p; p = c.project.bone(p.parentId)) d++
        return d
    }

    /** Move the playhead to the pointer and keep following it while dragging. */
    const scrub = (e: React.PointerEvent): void => {
        const left = rulerRef.current!.getBoundingClientRect().left
        c.setTime((e.clientX - left) / pps)
        const move = (ev: PointerEvent): void => c.setTime((ev.clientX - left) / pps)
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', () => window.removeEventListener('pointermove', move), {once: true})
    }

    const dragKey = (e: React.PointerEvent, boneId: string, channel: Channel, time: number): void => {
        e.stopPropagation()
        if (!anim) return
        const gesture = newGesture()
        const x0 = e.clientX
        let cur = {boneId, channel, time}
        c.selectKey(cur)
        c.setTime(time)
        const move = (ev: PointerEvent): void => {
            const t = c.snap(Math.min(anim.duration, Math.max(0, time + (ev.clientX - x0) / pps)))
            if (Math.abs(t - cur.time) < 1e-6) return
            cur = moveKey(c, cur, t, `mk:${gesture}`)
            c.selectKey(cur)
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', () => window.removeEventListener('pointermove', move), {once: true})
    }

    const step = (frames: number): void => c.setTime(c.time + frames / fps)
    const width = Math.max(anim?.duration ?? 1, 0.1) * pps + 40

    return (
        <section className="timeline">
            <div className="timeline-head">
                <select value={c.animationId ?? ''} onChange={(e) => c.setAnimation(e.target.value)}
                        aria-label="Animation">
                    {c.project.animations.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                </select>
                <button onClick={() => createAnimation(c)} title="New animation">+ New</button>
                {anim && (
                    <>
                        <TextField className="anim-name" value={anim.name}
                                   onCommit={(v) => renameAnimation(c, anim.id, v)}/>
                        <button className="danger" onClick={() => deleteAnimation(c, anim.id)}
                                title="Delete animation">Delete
                        </button>
                        <NumberField label="Duration (s)" value={anim.duration} step={0.1}
                                     onChange={(v) => setDuration(c, v)}/>
                    </>
                )}
                <div className="spacer"/>
                <div className="transport">
                    <button onClick={() => c.setTime(0)} title="Go to start">⏮</button>
                    <button onClick={() => step(-1)} title="Previous frame (←)">◀</button>
                    <button className={c.playing ? 'active' : ''} onClick={() => c.togglePlay()}
                            title="Play / pause (Space)">{c.playing ? '❚❚' : '▶'}</button>
                    <button onClick={() => step(1)} title="Next frame (→)">▶</button>
                    <button onClick={() => c.setTime(anim?.duration ?? 0)} title="Go to end">⏭</button>
                </div>
                <span className="time-readout">{c.time.toFixed(2)}s · frame {Math.round(c.time * fps)}</span>
                <input type="range" min={60} max={640} value={pps} onChange={(e) => setPps(Number(e.target.value))}
                       title="Timeline zoom" aria-label="Timeline zoom"/>
            </div>

            {!anim ? (
                <p className="empty pad">No animation yet. Use “+ New” to create one.</p>
            ) : (
                <div className="timeline-scroll">
                    <div className="timeline-inner" style={{width: LABEL_W + width}}>
                        <div className="tl-row ruler-row">
                            <div className="tl-name corner">
                                {c.mode === 'setup' ?
                                    <button onClick={() => c.setMode('animate')}>Switch to Animate to set
                                        keys</button> : 'Bones'}
                            </div>
                            <div
                                className="tl-ruler"
                                ref={rulerRef}
                                onPointerDown={scrub}
                                style={{
                                    width,
                                    backgroundImage:
                                        'linear-gradient(90deg,#667184 1px,transparent 1px),linear-gradient(90deg,#434b59 1px,transparent 1px)',
                                    backgroundSize: `${pps}px 100%, ${pps / fps}px 30%`,
                                    backgroundPosition: '0 0, 0 100%',
                                    backgroundRepeat: 'repeat-x'
                                }}
                            >
                                {Array.from({length: Math.floor(anim.duration) + 1}, (_, s) => (
                                    <span key={s} className="tick-label" style={{left: s * pps + 4}}>{s}s</span>
                                ))}
                            </div>
                        </div>

                        {c.project.bones.map((bone) => {
                            const tracks = anim.tracks[bone.id]
                            return (
                                <div key={bone.id} className={`tl-row${c.boneId === bone.id ? ' selected' : ''}`}>
                                    <div className="tl-name" style={{paddingLeft: 8 + depth(bone) * 12}}
                                         onClick={() => c.selectBone(bone.id)}>
                                        {bone.name}
                                    </div>
                                    <div
                                        className="tl-lane"
                                        style={{width}}
                                        onPointerDown={(e) => {
                                            c.selectBone(bone.id)
                                            scrub(e)
                                        }}
                                    >
                                        {CHANNELS.flatMap((ch) =>
                                            (tracks?.[ch.id] ?? []).map((k) => {
                                                const selected = c.key?.boneId === bone.id && c.key.channel === ch.id && Math.abs(c.key.time - k.time) < 1e-4
                                                return (
                                                    <button
                                                        key={`${ch.id}${k.time}`}
                                                        className={`key ${ch.id}${selected ? ' selected' : ''}`}
                                                        style={{left: k.time * pps, top: ch.top}}
                                                        title={`${ch.label} at ${k.time.toFixed(2)}s`}
                                                        onPointerDown={(e) => dragKey(e, bone.id, ch.id, k.time)}
                                                    />
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                        {c.project.bones.length === 0 &&
                            <p className="empty pad">Create bones in Setup mode, then switch to Animate.</p>}
                        <div className="playhead" style={{left: LABEL_W + c.time * pps}}/>
                    </div>
                </div>
            )}
        </section>
    )
}
