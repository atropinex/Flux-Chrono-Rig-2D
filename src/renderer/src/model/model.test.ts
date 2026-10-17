import {describe, expect, it} from 'vitest'
import {EditorController} from '../controller/EditorController'
import {applyPose, createBone} from '../controller/commands/BoneCommands'
import {keyPose} from '../controller/commands/AnimationCommands'
import {ease} from './Curve'
import {sample, upsertKey} from './Keyframes'
import {apply} from './math'
import {evaluatePose} from './Pose'
import {parseProject, serializeProject} from './Serializer'
import type {Keyframe} from './types'

describe('curves and keyframes', () => {
    it('eases between 0 and 1', () => {
        expect(ease('linear', 0.3)).toBeCloseTo(0.3)
        expect(ease([0.42, 0, 0.58, 1], 0)).toBe(0)
        expect(ease([0.42, 0, 0.58, 1], 1)).toBe(1)
        expect(ease([0.42, 0, 0.58, 1], 0.5)).toBeCloseTo(0.5, 2)
        expect(ease([0.42, 0, 1, 1], 0.25)).toBeLessThan(0.25)
    })

    it('interpolates, holds ends and steps', () => {
        const keys: Keyframe[] = []
        upsertKey(keys, 0, [0, 0])
        upsertKey(keys, 1, [90, 0])
        expect(sample(keys, -1)![0]).toBe(0)
        expect(sample(keys, 0.5)![0]).toBeCloseTo(45)
        expect(sample(keys, 2)![0]).toBe(90)
        keys[0].curve = 'stepped'
        expect(sample(keys, 0.9)![0]).toBe(0)
    })
})

describe('pose', () => {
    it('children inherit parent rotation', () => {
        const c = new EditorController()
        const root = createBone(c, {x: 0, y: 0}, {x: 100, y: 0}, null)
        const child = createBone(c, {x: 100, y: 0}, {x: 200, y: 0}, root)
        c.project.bone(root)!.rotation = 90
        const pose = evaluatePose(c.project, null, 0)
        const tip = apply(pose.get(child)!.world, 100, 0)
        expect(tip.x).toBeCloseTo(0, 5)
        expect(tip.y).toBeCloseTo(200, 5)
    })
})

describe('editing', () => {
    it('undo and redo restore the document', () => {
        const c = new EditorController()
        createBone(c, {x: 0, y: 0}, {x: 50, y: 0}, null)
        expect(c.project.bones).toHaveLength(1)
        c.undo()
        expect(c.project.bones).toHaveLength(0)
        c.redo()
        expect(c.project.bones).toHaveLength(1)
    })

    it('merges drag edits into one undo step', () => {
        const c = new EditorController()
        const id = createBone(c, {x: 0, y: 0}, {x: 50, y: 0}, null)
        for (let r = 1; r <= 10; r++) applyPose(c, id, {rotation: r}, 'rot:1')
        expect(c.project.bone(id)!.rotation).toBe(10)
        c.undo()
        expect(c.project.bone(id)!.rotation).toBe(0)
    })

    it('animate mode writes offset keys instead of changing setup', () => {
        const c = new EditorController()
        const id = createBone(c, {x: 0, y: 0}, {x: 50, y: 0}, null)
        c.project.bone(id)!.rotation = 10
        c.setMode('animate')
        c.setTime(0.5)
        applyPose(c, id, {rotation: 40})
        expect(c.project.bone(id)!.rotation).toBe(10)
        const keys = c.animation!.tracks[id]!.rotate!
        expect(keys).toHaveLength(1)
        expect(keys[0].v[0]).toBe(30)
        expect(c.pose.get(id)!.local.rotation).toBeCloseTo(40)
        keyPose(c, id)
        expect(c.animation!.tracks[id]!.translate).toHaveLength(1)
    })

    it('round-trips through the project file format', () => {
        const c = new EditorController()
        createBone(c, {x: 0, y: 0}, {x: 50, y: 0}, null)
        const copy = parseProject(serializeProject(c.project))
        expect(copy.bones).toEqual(c.project.bones)
        expect(() => parseProject('{"format":"nope"}')).toThrow()
    })
})
