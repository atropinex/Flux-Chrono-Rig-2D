import {useState} from 'react'
import {deleteBone, renameBone} from '../../controller/commands/BoneCommands'
import {removeSlot} from '../../controller/commands/SlotCommands'
import type {BoneData} from '../../model/types'
import {TextField} from '../components/TextField'
import {useEditor, useEditorEvents} from '../hooks'

export function HierarchyPanel() {
    const c = useEditor()
    useEditorEvents(['project', 'state'])
    const [renaming, setRenaming] = useState<string | null>(null)

    const renderBone = (bone: BoneData, depth: number): React.ReactNode => (
        <div key={bone.id}>
            <div
                className={`tree-row${c.boneId === bone.id && !c.slotId ? ' selected' : ''}`}
                style={{paddingLeft: 8 + depth * 14}}
                onClick={() => c.selectBone(bone.id)}
                onDoubleClick={() => setRenaming(bone.id)}
            >
                <span className="tree-icon bone-icon"/>
                {renaming === bone.id ? (
                    <TextField
                        value={bone.name}
                        onCommit={(v) => {
                            renameBone(c, bone.id, v)
                            setRenaming(null)
                        }}
                    />
                ) : (
                    <span className="tree-name">{bone.name}</span>
                )}
                <button className="icon-btn" title="Delete bone and its children (Del)" onClick={(e) => {
                    e.stopPropagation();
                    deleteBone(c, bone.id)
                }}>×
                </button>
            </div>
            {c.project.slots
                .filter((s) => s.boneId === bone.id)
                .map((s) => (
                    <div
                        key={s.id}
                        className={`tree-row slot${c.slotId === s.id ? ' selected' : ''}`}
                        style={{paddingLeft: 8 + (depth + 1) * 14}}
                        onClick={() => c.selectSlot(s.id)}
                    >
                        <span className="tree-icon image-icon"/>
                        <span className="tree-name">{s.name}</span>
                        <button className="icon-btn" title="Remove image" onClick={(e) => {
                            e.stopPropagation();
                            removeSlot(c, s.id)
                        }}>×
                        </button>
                    </div>
                ))}
            {c.project.childrenOf(bone.id).map((child) => renderBone(child, depth + 1))}
        </div>
    )

    return (
        <section className="panel hierarchy">
            <h2>Bones</h2>
            <div className="panel-body">
                {c.project.bones.length === 0 ? (
                    <p className="empty">No bones yet. Pick the Bone tool (B) and drag in the viewport. Select a bone
                        first to make the new one its child.</p>
                ) : (
                    c.project.childrenOf(null).map((b) => renderBone(b, 0))
                )}
            </div>
        </section>
    )
}
