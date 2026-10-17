import type {ToolId} from '../EditorController'
import {createBoneTool} from './CreateBoneTool'
import {selectTool} from './SelectTool'
import type {Tool} from './Tool'
import {rotateTool, scaleTool, translateTool} from './TransformTools'

export type {Tool, PointerInfo} from './Tool'

export const TOOL_ORDER: ToolId[] = ['select', 'bone', 'rotate', 'translate', 'scale']

export function createTools(): Record<ToolId, Tool> {
    return {
        select: selectTool,
        bone: createBoneTool,
        rotate: rotateTool,
        translate: translateTool,
        scale: scaleTool
    }
}
