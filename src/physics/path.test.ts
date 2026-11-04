import { describe, expect, it } from 'vitest'
import { dragPath, vacuumPath } from './path'
import { vacuumApexHeight, vacuumRange } from './trajectory'

const launch = { speed: 30, angleDeg: 45 }
const projectile = { mass: 0.145, diameter: 0.074, dragCoefficient: 0.47 }

describe('flight paths', () => {
  it('reports the analytic vacuum range and apex, with samples from launch to landing', () => {
    const path = vacuumPath(launch)
    expect(path.range).toBeCloseTo(vacuumRange(launch), 9)
    expect(path.apexHeight).toBeCloseTo(vacuumApexHeight(launch), 9)
    expect(path.samples[0].t).toBe(0)
    expect(path.samples[0].pos).toEqual({ x: 0, y: 0 })
    const last = path.samples.at(-1)!
    expect(last.t).toBe(path.flightTime)
    expect(last.pos.y).toBeCloseTo(0, 9)
    expect(last.pos.x).toBeCloseTo(path.range, 9)
  })

  it('matches the vacuum path within 0.1% at zero density', () => {
    const vacuum = vacuumPath(launch)
    const drag = dragPath({ ...launch, projectile, air: { density: 0 } })
    for (const key of ['range', 'flightTime', 'apexHeight'] as const) {
      expect(Math.abs(drag[key] - vacuum[key]) / vacuum[key]).toBeLessThan(0.001)
    }
  })

  it('lands short and descends more steeply in sea-level air', () => {
    const path = dragPath({ ...launch, projectile })
    expect(path.range).toBeLessThan(vacuumPath(launch).range)
    const dt = path.flightTime * 0.001
    const start = path.positionAt(0)
    const afterStart = path.positionAt(dt)
    const beforeEnd = path.positionAt(path.flightTime - dt)
    const end = path.positionAt(path.flightTime)
    const launchSlope = (afterStart.y - start.y) / (afterStart.x - start.x)
    const landingSlope = (end.y - beforeEnd.y) / (end.x - beforeEnd.x)
    expect(landingSlope).toBeLessThan(-launchSlope)
  })
})
