import {useState} from 'react'
import {EXPORT_TARGETS, type ExportTarget} from '../../controller/exporters/BundleExporter'
import {exportProject, newProject, openProject, saveProject} from '../../controller/ProjectController'
import {TOOL_ORDER} from '../../controller/tools'
import {useEditor, useEditorEvents} from '../hooks'

export function Toolbar() {
    const c = useEditor()
    useEditorEvents(['state', 'project'])
    const [target, setTarget] = useState<ExportTarget>('cocos')

    return (
        <header className="toolbar">
            <div className="group">
                <button onClick={() => newProject(c)} title="New project (Ctrl+N)">New</button>
                <button onClick={() => openProject(c)} title="Open project (Ctrl+O)">Open</button>
                <button onClick={() => saveProject(c)} title="Save (Ctrl+S)">Save{c.dirty ? ' •' : ''}</button>
            </div>

            <div className="group">
                <button disabled={!c.history.canUndo} onClick={() => c.undo()}
                        title={`Undo ${c.history.undoLabel ?? ''} (Ctrl+Z)`}>Undo
                </button>
                <button disabled={!c.history.canRedo} onClick={() => c.redo()}
                        title={`Redo ${c.history.redoLabel ?? ''} (Ctrl+Shift+Z)`}>Redo
                </button>
            </div>

            <div className="segmented" role="group" aria-label="Mode">
                <button className={c.mode === 'setup' ? 'active' : ''} onClick={() => c.setMode('setup')}
                        title="Edit the rest pose (Tab)">Setup
                </button>
                <button className={c.mode === 'animate' ? 'active animate' : ''} onClick={() => c.setMode('animate')}
                        title="Create keyframes (Tab)">Animate
                </button>
            </div>

            <div className="segmented" role="group" aria-label="Tools">
                {TOOL_ORDER.map((id) => {
                    const t = c.tools[id]
                    return (
                        <button key={id} className={c.toolId === id ? 'active' : ''} onClick={() => c.setTool(id)}
                                title={`${t.hint} (${t.shortcut})`}>
                            {t.label} <kbd>{t.shortcut}</kbd>
                        </button>
                    )
                })}
            </div>

            <div className="spacer"/>

            <div className="group">
                <select value={target} onChange={(e) => setTarget(e.target.value as ExportTarget)}
                        aria-label="Export target">
                    {EXPORT_TARGETS.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                </select>
                <button className="primary" onClick={() => exportProject(c, target)}>Export</button>
            </div>
        </header>
    )
}
