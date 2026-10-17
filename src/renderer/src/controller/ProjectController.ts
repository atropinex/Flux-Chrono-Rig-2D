import {parseProject, serializeProject} from '../model/Serializer'
import {Project} from '../model/Project'
import type {EditorController} from './EditorController'
import {buildBundle, type ExportTarget} from './exporters/BundleExporter'

const needDesktop = (c: EditorController): void => c.say('File access needs the desktop app (run with npm run dev).')

export function newProject(c: EditorController): void {
    if (c.dirty && !confirm('Discard unsaved changes?')) return
    c.loadProject(Project.createEmpty(), null)
}

export async function openProject(c: EditorController): Promise<void> {
    if (!window.api) return needDesktop(c)
    if (c.dirty && !confirm('Discard unsaved changes?')) return
    const res = await window.api.openProject()
    if (!res) return
    try {
        c.loadProject(parseProject(res.text), res.path)
    } catch (e) {
        c.say(`Could not open file: ${(e as Error).message}`)
    }
}

export async function saveProject(c: EditorController, saveAs = false): Promise<void> {
    if (!window.api) return needDesktop(c)
    const path = await window.api.saveProject(serializeProject(c.project), saveAs ? null : c.filePath, c.project.name)
    if (!path) return
    c.filePath = path
    c.dirty = false
    c.say(`Saved ${path}`)
}

export async function exportProject(c: EditorController, target: ExportTarget): Promise<void> {
    if (!window.api) return needDesktop(c)
    if (c.project.bones.length === 0) return c.say('Nothing to export yet. Create a bone first.')
    const {folder, files} = buildBundle(c.project, target)
    try {
        const dir = await window.api.exportBundle(folder, files)
        if (dir) c.say(`Exported to ${dir}`)
    } catch (e) {
        c.say(`Export failed: ${(e as Error).message}`)
    }
}
