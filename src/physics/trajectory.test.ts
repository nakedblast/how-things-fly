import { describe, expect, it } from 'vitest'
import {
  vacuumApexHeight,
  vacuumFlightTime,
  vacuumPositionAt,
  vacuumRange,
  vacuumTrajectory,
  launchFromVelocity,
  vacuumHeightAt,
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

describe('launch from a height', () => {
  const g = 9.80665

  it('a ball fired level and a dropped ball hit the ground together', () => {
    const fired = { speed: 25, angleDeg: 0, height: 40 }
    const dropped = { speed: 0, angleDeg: 0, height: 40 }
    const fall = Math.sqrt((2 * 40) / g)
    expect(vacuumFlightTime(fired)).toBeCloseTo(fall, 12)
    expect(vacuumFlightTime(dropped)).toBeCloseTo(fall, 12)
    expect(vacuumRange(fired)).toBeCloseTo(25 * fall, 9)
    for (const t of [0.5, 1, 2, 2.5]) {
      expect(vacuumPositionAt(fired, t).y).toBeCloseTo(vacuumPositionAt(dropped, t).y, 12)
    }
  })

  it('lands where the height equation reaches zero', () => {
    const p = { speed: 20, angleDeg: 30, height: 12 }
    const t = vacuumFlightTime(p)
    expect(vacuumPositionAt(p, t).y).toBeCloseTo(0, 9)
    // Hand-solved: vy = 10 m/s, 12 + 10t - g t²/2 = 0.
    expect(t).toBeCloseTo((10 + Math.sqrt(100 + 2 * g * 12)) / g, 12)
    expect(vacuumApexHeight(p)).toBeCloseTo(12 + 100 / (2 * g), 12)
  })
})

describe('launchFromVelocity', () => {
  it('a ball tossed straight up from a moving cart stays above the cart', () => {
    const cartSpeed = 4
    const p = launchFromVelocity(cartSpeed, 6, 1)
    const t = vacuumFlightTime(p)
    expect(vacuumPositionAt(p, t).x).toBeCloseTo(cartSpeed * t, 9)
    expect(vacuumPositionAt(p, t / 3).x).toBeCloseTo((cartSpeed * t) / 3, 9)
  })
})

describe('vacuumHeightAt', () => {
  it('matches the path equation and stops at the landing point', () => {
    const p = { speed: 20, angleDeg: 45 }
    // y = x tan(a) - g x² / (2 v² cos²(a)); at 45°: y = x - g x² / v².
    expect(vacuumHeightAt(p, 10)).toBeCloseTo(10 - (9.80665 * 100) / 400, 9)
    expect(vacuumHeightAt(p, vacuumRange(p) + 1)).toBeNull()
  })
})
