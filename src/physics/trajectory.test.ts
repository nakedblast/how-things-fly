import { describe, expect, it } from 'vitest'
import {
  vacuumApexHeight,
  vacuumFlightTime,
  vacuumPositionAt,
  vacuumRange,
  vacuumTrajectory,
} from './trajectory'

describe('vacuumTrajectory', () => {
  it('lands at the analytic range', () => {
    const p = { speed: 30, angleDeg: 35 }
    const last = vacuumTrajectory(p).at(-1)!
    expect(last.pos.x).toBeCloseTo(vacuumRange(p), 6)
    expect(last.pos.y).toBeCloseTo(0, 6)
  })

  it('reaches maximum range at 45 degrees', () => {
    const r = (angleDeg: number) => vacuumRange({ speed: 50, angleDeg })
    expect(r(45)).toBeGreaterThan(r(40))
    expect(r(45)).toBeGreaterThan(r(50))
  })
})

describe('vacuumPositionAt', () => {
  const p = { speed: 30, angleDeg: 35 }

  it('peaks at the analytic apex height halfway through the flight', () => {
    const apex = vacuumPositionAt(p, vacuumFlightTime(p) / 2)
    expect(apex.y).toBeCloseTo(vacuumApexHeight(p), 6)
    expect(apex.x).toBeCloseTo(vacuumRange(p) / 2, 6)
  })

  it('rests at the launch and landing points outside the flight', () => {
    expect(vacuumPositionAt(p, -1)).toEqual({ x: 0, y: 0 })
    const after = vacuumPositionAt(p, vacuumFlightTime(p) + 5)
    expect(after.x).toBeCloseTo(vacuumRange(p), 6)
    expect(after.y).toBeCloseTo(0, 6)
  })
})
