import {useMemo} from 'react'
import {EditorController} from '../controller/EditorController'
import {EditorContext, useEditor, useEditorEvents} from './hooks'
import {AssetsPanel} from './panels/AssetsPanel'
import {HierarchyPanel} from './panels/HierarchyPanel'
import {PropertiesPanel} from './panels/PropertiesPanel'
import {TimelinePanel} from './panels/TimelinePanel'
import {Toolbar} from './panels/Toolbar'
import {useShortcuts} from './useShortcuts'
import {ViewportView} from './viewport/ViewportView'

function StatusBar() {
    const c = useEditor()
    useEditorEvents(['state'])
    return (
        <footer className="statusbar">
            <span>{c.status}</span>
            <span className="muted">{c.filePath ?? 'Unsaved project'}</span>
        </footer>
    )
}

export function App() {
    const controller = useMemo(() => new EditorController(), [])
    useShortcuts(controller)

    return (
        <EditorContext.Provider value={controller}>
            <div className="app">
                <Toolbar/>
                <main className="workspace">
                    <aside className="left">
                        <HierarchyPanel/>
                        <AssetsPanel/>
                    </aside>
                    <ViewportView/>
                    <aside className="right">
                        <PropertiesPanel/>
                    </aside>
                </main>
                <TimelinePanel/>
                <StatusBar/>
            </div>
        </EditorContext.Provider>
    )
}
