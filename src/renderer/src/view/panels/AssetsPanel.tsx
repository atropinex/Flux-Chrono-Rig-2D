import {useRef} from 'react'
import {attachAsset} from '../../controller/commands/SlotCommands'
import {importImages} from '../../controller/services/ImageImporter'
import {useEditor, useEditorEvents} from '../hooks'

export function AssetsPanel() {
    const c = useEditor()
    useEditorEvents(['project'])
    const input = useRef<HTMLInputElement>(null)

    return (
        <section
            className="panel assets"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
                e.preventDefault()
                void importImages(c, Array.from(e.dataTransfer.files))
            }}
        >
            <h2>
                Images
                <button onClick={() => input.current?.click()}>Import</button>
            </h2>
            <input
                ref={input}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                hidden
                onChange={(e) => {
                    void importImages(c, Array.from(e.target.files ?? []))
                    e.target.value = ''
                }}
            />
            <div className="panel-body">
                {c.project.assets.length === 0 ? (
                    <p className="empty">Drop PNG, JPG or WebP files here, or use Import.</p>
                ) : (
                    <div className="asset-grid">
                        {c.project.assets.map((a) => (
                            <button
                                key={a.id}
                                className="asset"
                                title={`${a.name} (${a.width}×${a.height}). Click to attach to the selected bone.`}
                                onClick={() => (c.boneId ? attachAsset(c, c.boneId, a.id) : c.say('Select a bone first, then click an image to attach it.'))}
                            >
                                <img src={a.dataUrl} alt={a.name} draggable={false}/>
                                <span>{a.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </section>
    )
}
