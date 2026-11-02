import { describe, expect, it } from 'vitest'
import { frameFor, tickStep } from './frame'
import { vacuumTrajectory } from '../physics/trajectory'

describe('frameFor', () => {
  it('frames a short shot much tighter than the whole range', () => {
    const shot = vacuumTrajectory({ speed: 15, angleDeg: 40 }).map((s) => s.pos)
    const f = frameFor(shot)
    expect(f.x1 - f.x0).toBeLessThanOrEqual(40)
    expect(f.x1).toBeGreaterThan(shot.at(-1)!.x)
  })

  it('keeps the whole arc in view', () => {
    const shot = vacuumTrajectory({ speed: 35, angleDeg: 60 }).map((s) => s.pos)
    const f = frameFor(shot)
    for (const p of shot) {
      expect(p.x).toBeGreaterThanOrEqual(f.x0)
      expect(p.x).toBeLessThanOrEqual(f.x1)
      expect(p.y).toBeLessThanOrEqual(f.top)
    }
  })

  it('rounds the width so nearby shots share a frame', () => {
    const a = frameFor(vacuumTrajectory({ speed: 30, angleDeg: 35 }).map((s) => s.pos))
    const b = frameFor(vacuumTrajectory({ speed: 30, angleDeg: 36 }).map((s) => s.pos))
    expect(a.x1).toBe(b.x1)
  })
})

describe('tickStep', () => {
  it('keeps the number of labels readable', () => {
    for (const w of [20, 60, 140, 400]) {
      const n = w / tickStep(w)
      expect(n).toBeGreaterThanOrEqual(2)
      expect(n).toBeLessThanOrEqual(12)
    }
  })
})
