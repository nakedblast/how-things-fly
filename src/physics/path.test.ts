import { describe, expect, it } from 'vitest'
import { simulateDart, type Dart } from './dart'
import { constantAtmosphere } from './atmosphere'
import { simulateFlight3D } from './flight3d'
import { dartPath, dragPath, flight3dPath, vacuumPath } from './path'
import type { Flight3D } from './flight3d'
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

  it('carries a dart flight with its pitch, interpolated between samples', () => {
    const dart: Dart = { mass: 0.4, diameter: 0.025, xcg: 0.15, pitchInertia: 0.01, aero: { cnAlpha: 30, xcp: 0.5, cd0: 0.6, cdAlpha2: 3, cmq: -2000 } }
    const flight = simulateDart({ dart, speed: 25, elevationDeg: 30, initialAlphaDeg: 6, timeStep: 1 / 1000 })
    const path = dartPath(flight)
    expect(path.range).toBe(flight.range)
    expect(path.flightTime).toBe(flight.flightTime)
    const [a, b] = [flight.samples[100], flight.samples[101]]
    const mid = (a.t + b.t) / 2
    expect(path.pitchAt!(mid)).toBeCloseTo((a.pitch + b.pitch) / 2, 12)
    expect(path.positionAt(mid).x).toBeCloseTo((a.pos.x + b.pos.x) / 2, 12)
    expect(path.positionAt(99).x).toBe(flight.range)
  })

  it('projects a 3D flight to downrange and height while retaining signed landing drift', () => {
    const flight: Flight3D = {
      samples: [
        { t: 0, pos: { x: 0, y: 0, z: 0 }, vel: { x: 100, y: 0, z: 0 } },
        { t: 1, pos: { x: 100, y: 20, z: -4 }, vel: { x: 100, y: -10, z: -4 } },
        { t: 2, pos: { x: 200, y: 0, z: -8 }, vel: { x: 100, y: -20, z: -4 } },
      ],
      landed: true,
      flightTime: 2,
      range: 200,
      drift: -8,
      apex: { t: 1, pos: { x: 100, y: 20, z: -4 }, vel: { x: 100, y: 0, z: -4 } },
      impactSpeed: 100,
    }
    const path = flight3dPath(flight, 4)
    expect(path.range).toBe(200)
    expect(path.apexHeight).toBe(20)
    expect(path.lateralDrift).toBe(-8)
    expect(path.samples).toHaveLength(5)
    expect(path.samples[0]).toEqual({ t: 0, pos: { x: 0, y: 0 } })
    expect(path.samples.at(-1)).toEqual({ t: 2, pos: { x: 200, y: 0 } })
    expect(path.positionAt(0.5)).toEqual({ x: 50, y: 10 })
    expect(path.positionAt(2)).toEqual({ x: 200, y: 0 })
  })

  it('keeps a bounded high-speed, high-drag ball flight finite with an adaptive step', () => {
    const mass = 0.01
    const diameter = 0.25
    const speed = 1600
    const density = 1.5
    const areaPerMass = (Math.PI * diameter ** 2) / (8 * mass)
    const timeStep = 0.12 / (density * areaPerMass * 1.05 * speed)
    const flight = simulateFlight3D({
      launch: { speed, elevationDeg: 45 },
      projectile: { mass, diameter, drag: 1.05 },
      environment: { atmosphere: constantAtmosphere(density) },
      timeStep,
      maxTime: 0.25,
    })
    expect(flight.samples.length).toBeGreaterThan(2)
    expect(flight.samples.every((sample) => Object.values(sample.pos).every(Number.isFinite))).toBe(true)
    expect(Number.isFinite(flight.impactSpeed)).toBe(true)
  })
})
