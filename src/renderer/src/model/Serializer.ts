import {Project} from './Project'

export const PROJECT_FORMAT = 'sk2d-project'
export const PROJECT_VERSION = 1

export function serializeProject(p: Project): string {
    return JSON.stringify(
        {
            format: PROJECT_FORMAT,
            version: PROJECT_VERSION,
            name: p.name,
            fps: p.fps,
            bones: p.bones,
            slots: p.slots,
            assets: p.assets,
            animations: p.animations
        },
        null,
        1
    )
}

/** Throws an Error with a human-readable message when the file is not a valid project. */
export function parseProject(text: string): Project {
    let raw: any
    try {
        raw = JSON.parse(text)
    } catch {
        throw new Error('This file is not valid JSON.')
    }
    if (!raw || raw.format !== PROJECT_FORMAT) throw new Error('This is not a Bonecraft project file.')
    if (typeof raw.version !== 'number' || raw.version > PROJECT_VERSION)
        throw new Error('This project was saved by a newer version of Bonecraft.')
    for (const key of ['bones', 'slots', 'assets', 'animations']) {
        if (!Array.isArray(raw[key])) throw new Error(`Project is missing "${key}".`)
    }
    const p = new Project()
    p.name = String(raw.name ?? 'untitled')
    p.fps = Number(raw.fps) > 0 ? Number(raw.fps) : 30
    p.bones = raw.bones
    p.slots = raw.slots
    p.assets = raw.assets
    p.animations = raw.animations
    return p
}
