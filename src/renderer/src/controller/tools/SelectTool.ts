import { hitBone } from './hitTest'
import type { Tool } from './Tool'

export const selectTool: Tool = {
  id: 'select',
  label: 'Select',
  shortcut: 'V',
  hint: 'Click a bone to select it.',
  cursor: 'default',
  down(c, i) {
    c.selectBone(hitBone(c, i.p, i.zoom))
  },
  move() {},
  up() {}
}
