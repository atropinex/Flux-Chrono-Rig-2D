import type {ExportFile} from '../../../../shared/api'
import type {Project} from '../../model/Project'
import {buildRuntimeJson} from './RuntimeExporter'
// The runtimes ship inside every export so the files are always in sync with the data format.
import cocosRuntime from '@runtimes/cocos-creator/Sk2dAnimator.ts?raw'
import unityRuntime from '@runtimes/unity/Sk2dAnimator.cs?raw'

export type ExportTarget = 'cocos' | 'unity' | 'json'

export const EXPORT_TARGETS: { id: ExportTarget; label: string }[] = [
    {id: 'cocos', label: 'Cocos Creator'},
    {id: 'unity', label: 'Unity'},
    {id: 'json', label: 'JSON + images'}
]

const extFor = (mime: string): string => (mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png')
const safe = (s: string): string => s.replace(/[^\w\-]+/g, '_') || 'skeleton'

export function buildBundle(p: Project, target: ExportTarget): { folder: string; files: ExportFile[] } {
    const base = safe(p.name)
    const files: ExportFile[] = [
        {path: `${base}.sk2d.json`, text: JSON.stringify(buildRuntimeJson(p), null, 2)}
    ]

    for (const asset of p.assets) {
        // only export images that are actually used by a slot
        if (!p.slots.some((s) => s.attachments.some((a) => a.assetId === asset.id))) continue
        files.push({
            path: `images/${asset.name}.${extFor(asset.mime)}`,
            base64: asset.dataUrl.slice(asset.dataUrl.indexOf(',') + 1)
        })
    }

    if (target === 'cocos') {
        files.push({path: 'Sk2dAnimator.ts', text: cocosRuntime}, {path: 'README.txt', text: COCOS_README(base)})
    } else if (target === 'unity') {
        files.push({path: 'Sk2dAnimator.cs', text: unityRuntime}, {path: 'README.txt', text: UNITY_README(base)})
    }
    return {folder: `${base}_${target}`, files}
}

const COCOS_README = (base: string): string => `Bonecraft export for Cocos Creator 3.x

1. Copy this whole folder into assets/resources/${base}/  (it MUST be under "resources").
2. In the editor, select each image in images/ and set its Type to "sprite-frame".
3. Create an empty node, add the "Sk2dAnimator" component (Sk2dAnimator.ts).
4. Drag ${base}.sk2d.json onto "Skeleton Json".
5. Set "Images Path" to: ${base}/images
6. Type an animation name into "Animation" and press Play.

Scripting: node.getComponent(Sk2dAnimator).play('walk', true)
`

const UNITY_README = (base: string): string => `Bonecraft export for Unity 2021.3+

1. Install Newtonsoft Json: Package Manager > Add package by name > com.unity.nuget.newtonsoft-json
2. Copy this folder into Assets/${base}/
3. Select all images in images/ and set: Texture Type = Sprite (2D and UI), Pivot = Center,
   Pixels Per Unit = 100 (or whatever you set on the component).
4. Create an empty GameObject and add the "Sk2dAnimator" component.
5. Drag ${base}.sk2d.json into "Skeleton Json" and select all the images, drag them onto "Sprites".
6. Type an animation name into "Animation" and enter Play mode.

Scripting: GetComponent<Sk2D.Sk2dAnimator>().Play("walk", true);
`
