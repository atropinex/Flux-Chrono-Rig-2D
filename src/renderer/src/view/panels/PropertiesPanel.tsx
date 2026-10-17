import {applyPose, renameBone, setBoneLength} from '../../controller/commands/BoneCommands'
import {deleteKey, keyPose, setFps, setKeyCurve} from '../../controller/commands/AnimationCommands'
import {
    moveSlot,
    removeSlot,
    renameSlot,
    setAttachmentProp,
    setSlotAlpha,
    toggleSlotVisible
} from '../../controller/commands/SlotCommands'
import {BEZIER_PRESETS, curveLabel} from '../../model/Curve'
import {findKey} from '../../model/Keyframes'
import type {CurveType} from '../../model/types'
import {NumberField} from '../components/NumberField'
import {TextField} from '../components/TextField'
import {useEditor, useEditorEvents} from '../hooks'

const CHANNEL_NAMES = {rotate: 'Rotate', translate: 'Translate', scale: 'Scale'} as const
const CUSTOM = 'Custom bezier'

export function PropertiesPanel() {
    const c = useEditor()
    useEditorEvents(['project', 'state', 'time'])

    const bone = c.project.bone(c.boneId)
    const slot = c.project.slot(c.slotId)
    const local = bone ? c.pose.get(bone.id)?.local : undefined
    const animate = c.mode === 'animate' && !!c.animation
    const att = slot?.attachments.find((a) => a.name === slot.attachment) ?? slot?.attachments[0]
    const key = c.key && c.animation ? findKey(c.animation.tracks[c.key.boneId]?.[c.key.channel], c.key.time) : undefined

    const setCurveByName = (name: string): void => {
        if (!c.key || !key) return
        let curve: CurveType
        if (name === 'linear' || name === 'stepped') curve = name
        else if (name === CUSTOM) curve = Array.isArray(key.curve) ? key.curve : [0.25, 0.1, 0.25, 1]
        else curve = BEZIER_PRESETS[name]
        setKeyCurve(c, c.key, curve)
    }

    return (
        <section className="panel properties">
            <h2>Properties</h2>
            <div className="panel-body">
                {!bone && !slot && <p className="empty">Select a bone or image to edit it.</p>}

                {bone && local && (
                    <div className="block">
                        <h3>
                            Bone
                            {animate && (
                                <button onClick={() => keyPose(c, bone.id)}
                                        title="Key all channels at the playhead (K)">Key pose</button>
                            )}
                        </h3>
                        <div className="field wide">
                            <span className="field-label">Name</span>
                            <TextField value={bone.name} onCommit={(v) => renameBone(c, bone.id, v)}/>
                        </div>
                        <div className="grid2">
                            <NumberField label="X" value={local.x}
                                         onChange={(v) => applyPose(c, bone.id, {x: v}, `p:${bone.id}:x`)}/>
                            <NumberField label="Y" value={local.y}
                                         onChange={(v) => applyPose(c, bone.id, {y: v}, `p:${bone.id}:y`)}/>
                            <NumberField label="Rotation" value={local.rotation} step={1}
                                         onChange={(v) => applyPose(c, bone.id, {rotation: v}, `p:${bone.id}:r`)}/>
                            <NumberField label="Length" value={bone.length} disabled={animate}
                                         onChange={(v) => setBoneLength(c, bone.id, v)}/>
                            <NumberField label="Scale X" value={local.scaleX} step={0.05}
                                         onChange={(v) => applyPose(c, bone.id, {scaleX: v}, `p:${bone.id}:sx`)}/>
                            <NumberField label="Scale Y" value={local.scaleY} step={0.05}
                                         onChange={(v) => applyPose(c, bone.id, {scaleY: v}, `p:${bone.id}:sy`)}/>
                        </div>
                        <p className="note">{animate ? 'Edits create keys at the playhead.' : 'Edits change the setup pose.'}</p>
                    </div>
                )}

                {slot && att && (
                    <div className="block">
                        <h3>Image</h3>
                        <div className="field wide">
                            <span className="field-label">Name</span>
                            <TextField value={slot.name} onCommit={(v) => renameSlot(c, slot.id, v)}/>
                        </div>
                        <div className="field wide">
                            <span className="field-label">Opacity</span>
                            <input type="range" min={0} max={1} step={0.01} value={slot.alpha}
                                   onChange={(e) => setSlotAlpha(c, slot.id, parseFloat(e.target.value))}/>
                        </div>
                        <div className="grid2">
                            <NumberField label="Offset X" value={att.x}
                                         onChange={(v) => setAttachmentProp(c, slot.id, {x: v})}/>
                            <NumberField label="Offset Y" value={att.y}
                                         onChange={(v) => setAttachmentProp(c, slot.id, {y: v})}/>
                            <NumberField label="Rotation" value={att.rotation}
                                         onChange={(v) => setAttachmentProp(c, slot.id, {rotation: v})}/>
                            <NumberField label="Scale" value={att.scaleX} step={0.05}
                                         onChange={(v) => setAttachmentProp(c, slot.id, {scaleX: v, scaleY: v})}/>
                        </div>
                        <div className="row">
                            <button
                                onClick={() => toggleSlotVisible(c, slot.id)}>{slot.attachment ? 'Hide' : 'Show'}</button>
                            <button onClick={() => moveSlot(c, slot.id, -1)} title="Draw earlier, further back">Send
                                back
                            </button>
                            <button onClick={() => moveSlot(c, slot.id, 1)} title="Draw later, in front">Bring forward
                            </button>
                            <button className="danger" onClick={() => removeSlot(c, slot.id)}>Remove</button>
                        </div>
                    </div>
                )}

                {c.key && key && (
                    <div className="block">
                        <h3>
                            Key: {CHANNEL_NAMES[c.key.channel]} at {key.time.toFixed(2)}s
                            <button className="danger" onClick={() => deleteKey(c, c.key!)}
                                    title="Delete key (Del)">Delete</button>
                        </h3>
                        <div className="field wide">
                            <span className="field-label">Easing</span>
                            <select value={curveLabel(key.curve)} onChange={(e) => setCurveByName(e.target.value)}>
                                <option>linear</option>
                                <option>stepped</option>
                                {Object.keys(BEZIER_PRESETS).map((n) => <option key={n}>{n}</option>)}
                                <option>{CUSTOM}</option>
                            </select>
                        </div>
                        {Array.isArray(key.curve) && (
                            <div className="grid2">
                                {(['x1', 'y1', 'x2', 'y2'] as const).map((label, i) => (
                                    <NumberField
                                        key={label}
                                        label={label}
                                        step={0.05}
                                        value={(key.curve as number[])[i]}
                                        onChange={(v) => {
                                            const next = [...(key.curve as number[])] as [number, number, number, number]
                                            next[i] = i % 2 === 0 ? Math.min(1, Math.max(0, v)) : v
                                            setKeyCurve(c, c.key!, next)
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="block">
                    <h3>Project</h3>
                    <div className="field wide">
                        <span className="field-label">Name</span>
                        <TextField value={c.project.name} onCommit={(v) => {
                            c.project.name = v.trim() || 'untitled';
                            c.dirty = true;
                            c.emit('project')
                        }}/>
                    </div>
                    <NumberField label="Frame rate" value={c.project.fps} onChange={(v) => setFps(c, v)}/>
                </div>
            </div>
        </section>
    )
}
