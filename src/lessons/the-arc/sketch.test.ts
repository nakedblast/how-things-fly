import { describe, expect, it } from 'vitest'
import { vacuumTrajectory } from '../../physics/trajectory'
import { classifyPath, presetPath, simplify, sketchProblem, type Point } from './sketch'

const h = 40

describe('classifyPath', () => {
  it('reads the real trajectory as an arc', () => {
    const real = vacuumTrajectory({ speed: 25, angleDeg: 0, height: h }).map((s): Point => [s.pos.x, s.pos.y])
    expect(classifyPath(real)).toBe('arc')
  })

  it('reads the preset shapes as what they show', () => {
    expect(classifyPath(presetPath('arc', h, 70))).toBe('arc')
    expect(classifyPath(presetPath('impetus', h, 70))).toBe('impetus')
    expect(classifyPath(presetPath('other', h, 70))).toBe('other')
  })

  it('reads "straight out, then straight down" as the impetus myth', () => {
    const sketch: Point[] = [
      [0, 40],
      [20, 40],
      [45, 39],
      [60, 38],
      [62, 30],
      [62, 10],
      [62, 0],
    ]
    expect(classifyPath(sketch)).toBe('impetus')
  })

  it('reads a path that drops straight away as neither', () => {
    const sketch: Point[] = [
      [0, 40],
      [5, 20],
      [10, 8],
      [30, 2],
      [60, 0],
    ]
    expect(classifyPath(sketch)).toBe('other')
  })
})

describe('sketchProblem', () => {
  it('asks for a path that reaches the water', () => {
    expect(sketchProblem([[0, 40], [10, 40], [30, 38]], 10, 20)).toMatch(/water/)
    expect(sketchProblem(presetPath('arc', h, 70), 10, 20)).toBeNull()
  })
})

describe('simplify', () => {
  it('keeps the end points and caps the size', () => {
    const many = Array.from({ length: 500 }, (_, i): Point => [i / 7, 40 - i / 13])
    const few = simplify(many)
    expect(few.length).toBeLessThanOrEqual(41)
    expect(few[0]).toEqual([0, 40])
    expect(few.at(-1)).toEqual([71.3, 1.6])
  })
})
