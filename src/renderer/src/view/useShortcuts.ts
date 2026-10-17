import {useEffect} from 'react'
import {deleteBone} from '../controller/commands/BoneCommands'
import {deleteKey, keyPose} from '../controller/commands/AnimationCommands'
import type {EditorController, ToolId} from '../controller/EditorController'
import {newProject, openProject, saveProject} from '../controller/ProjectController'

const TOOL_KEYS: Record<string, ToolId> = {v: 'select', b: 'bone', r: 'rotate', t: 'translate', s: 'scale'}

export function useShortcuts(c: EditorController): void {
    useEffect(() => {
        const onKey = (e: KeyboardEvent): void => {
            const el = e.target as HTMLElement
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return
            const k = e.key.toLowerCase()
            const mod = e.ctrlKey || e.metaKey

            if (mod) {
                if (k === 'z') {
                    e.preventDefault();
                    e.shiftKey ? c.redo() : c.undo()
                } else if (k === 'y') {
                    e.preventDefault();
                    c.redo()
                } else if (k === 's') {
                    e.preventDefault();
                    void saveProject(c, e.shiftKey)
                } else if (k === 'o') {
                    e.preventDefault();
                    void openProject(c)
                } else if (k === 'n') {
                    e.preventDefault();
                    newProject(c)
                }
                return
            }
            if (e.altKey) return

            if (TOOL_KEYS[k]) c.setTool(TOOL_KEYS[k])
            else if (k === ' ') {
                e.preventDefault();
                c.togglePlay()
            } else if (k === 'tab') {
                e.preventDefault();
                c.setMode(c.mode === 'setup' ? 'animate' : 'setup')
            } else if (k === 'k' && c.mode === 'animate' && c.boneId) keyPose(c, c.boneId)
            else if (k === 'arrowleft') c.setTime(c.time - 1 / c.project.fps)
            else if (k === 'arrowright') c.setTime(c.time + 1 / c.project.fps)
            else if (k === 'home') {
                c.camera.zoom = 1;
                c.camera.ready = false;
                c.emit('view')
            } else if (k === 'delete' || k === 'backspace') {
                if (c.key) deleteKey(c, c.key)
                else if (c.boneId) deleteBone(c, c.boneId)
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [c])
}
