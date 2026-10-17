import {createContext, useContext, useEffect, useReducer} from 'react'
import type {EditorController, EditorEvent} from '../controller/EditorController'

export const EditorContext = createContext<EditorController>(null!)

export const useEditor = (): EditorController => useContext(EditorContext)

/** Re-render the calling component whenever one of the given controller events fires. */
export function useEditorEvents(events: EditorEvent[]): void {
    const c = useEditor()
    const [, force] = useReducer((n: number) => n + 1, 0)
    useEffect(() => {
        const offs = events.map((e) => c.events.on(e, force))
        return () => offs.forEach((off) => off())
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [c])
}
