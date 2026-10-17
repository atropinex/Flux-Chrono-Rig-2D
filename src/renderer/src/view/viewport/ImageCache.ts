import type {AssetData} from '../../model/types'

export class ImageCache {
    private images = new Map<string, HTMLImageElement>()

    constructor(private onLoad: () => void) {
    }

    /** Returns the decoded image, or null while it is still loading (onLoad fires when ready). */
    get(asset: AssetData): HTMLImageElement | null {
        let img = this.images.get(asset.id)
        if (!img) {
            img = new Image()
            img.onload = this.onLoad
            img.src = asset.dataUrl
            this.images.set(asset.id, img)
        }
        return img.complete && img.naturalWidth > 0 ? img : null
    }
}
