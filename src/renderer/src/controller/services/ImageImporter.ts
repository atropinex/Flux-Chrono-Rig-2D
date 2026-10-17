import {makeId, Project} from '../../model/Project'
import type {AssetData} from '../../model/types'
import type {EditorController} from '../EditorController'

const readAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result))
        r.onerror = () => reject(new Error(`Could not read ${file.name}`))
        r.readAsDataURL(file)
    })

const measure = (dataUrl: string): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({width: img.naturalWidth, height: img.naturalHeight})
        img.onerror = () => reject(new Error('Not a valid image'))
        img.src = dataUrl
    })

/** Adds images to the project's asset library. Assets are not part of undo history. */
export async function importImages(c: EditorController, files: File[]): Promise<void> {
    const images = files.filter((f) => /^image\/(png|jpeg|webp)$/.test(f.type))
    if (images.length === 0) return c.say('Drop PNG, JPG or WebP files to import them.')
    const added: AssetData[] = []
    for (const file of images) {
        try {
            const dataUrl = await readAsDataUrl(file)
            const {width, height} = await measure(dataUrl)
            const base = file.name.replace(/\.[^.]+$/, '').replace(/[^\w\-]+/g, '_') || 'image'
            const taken = [...c.project.assets, ...added].map((a) => a.name)
            added.push({
                id: makeId('asset'),
                name: Project.uniqueName(base, taken),
                mime: file.type,
                dataUrl,
                width,
                height
            })
        } catch (e) {
            c.say((e as Error).message)
        }
    }
    if (added.length === 0) return
    c.project.assets.push(...added)
    c.dirty = true
    c.status = `Imported ${added.length} image${added.length > 1 ? 's' : ''}. Select a bone, then click an image to attach it.`
    c.emit('project')
    c.emit('state')
}
