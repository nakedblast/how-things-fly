import { describe, expect, it } from 'vitest'
import {
  dragFactor,
  flightPositionAt,
  simulateFlight,
  terminalVelocity,
  type FlightParams,
  type Projectile,
} from './flight'
import {
  STANDARD_GRAVITY as g,
  vacuumApexHeight,
  vacuumFlightTime,
  vacuumPositionAt,
  vacuumRange,
} from './trajectory'

// Baseball-sized ball: 145 g, 73.7 mm, Cd 0.35.
const ball: Projectile = { mass: 0.145, diameter: 0.0737, dragCoefficient: 0.35 }
const air = { density: 1.225 }

describe('simulateFlight without drag', () => {
  const launch = { speed: 30, angleDeg: 35 }

  for (const [name, p] of [
    ['zero air density', { ...launch, projectile: ball, air: { density: 0 } }],
    ['zero drag coefficient', { ...launch, projectile: { ...ball, dragCoefficient: 0 }, air }],
  ] as [string, FlightParams][]) {
    it(`matches the analytic vacuum flight with ${name}`, () => {
      const f = simulateFlight(p)
      expect(f.landed).toBe(true)
      expect(f.range).toBeCloseTo(vacuumRange(launch), 9)
      expect(f.flightTime).toBeCloseTo(vacuumFlightTime(launch), 9)
      expect(f.apex.pos.y).toBeCloseTo(vacuumApexHeight(launch), 9)
      expect(f.apex.t).toBeCloseTo(vacuumFlightTime(launch) / 2, 9)
      expect(f.impactSpeed).toBeCloseTo(launch.speed, 9)
      for (const s of f.samples) {
        const v = vacuumPositionAt(launch, s.t)
        expect(s.pos.x).toBeCloseTo(v.x, 9)
        expect(s.pos.y).toBeCloseTo(v.y, 9)
      }
    })
  }
})

describe('simulateFlight with quadratic drag', () => {
  // Reference: the classical solution parametrised by flight-path angle θ, with
  // u = v cos θ and k = ρ Cd A / 2m:  1/u² = 1/u0² + (2k/g)(F(θ0) − F(θ)),
  // F(θ) = ½(sec θ tan θ + ln(sec θ + tan θ)),  dx = −u² sec²θ dθ / g,
  // dy = tan θ dx,  dt = −u sec²θ dθ / g. Integrated independently by adaptive
  // Simpson quadrature in double precision (no time stepping).
  const p: FlightParams = { speed: 45, angleDeg: 35, projectile: ball, air }
  const ref = {
    k: 0.006307118521980562,
    apex: { x: 60.97015345222637, y: 24.27484043227914, t: 2.0715404156706683 },
    land: { x: 109.1447765403631, t: 4.42528399929407, speed: 25.828899869644644, angleDeg: -48.72201164008436 },
  }

  it('uses the drag factor ρ Cd A / 2m', () => {
    expect(dragFactor(ball, air)).toBeCloseTo(ref.k, 15)
  })

  it('matches the angle-parametric reference at the apex and landing', () => {
    const f = simulateFlight(p)
    expect(f.landed).toBe(true)
    expect(f.apex.pos.x).toBeCloseTo(ref.apex.x, 6)
    expect(f.apex.pos.y).toBeCloseTo(ref.apex.y, 6)
    expect(f.apex.t).toBeCloseTo(ref.apex.t, 7)
    expect(f.range).toBeCloseTo(ref.land.x, 6)
    expect(f.flightTime).toBeCloseTo(ref.land.t, 7)
    expect(f.impactSpeed).toBeCloseTo(ref.land.speed, 6)
    const last = f.samples.at(-1)!
    const impactAngle = (Math.atan2(last.vel.y, last.vel.x) * 180) / Math.PI
    expect(impactAngle).toBeCloseTo(ref.land.angleDeg, 5)
  })

  it('converges at fourth order as the time step shrinks', () => {
    const err = (timeStep: number) => Math.abs(simulateFlight({ ...p, timeStep }).range - ref.land.x)
    const ratio = err(0.1) / err(0.05)
    expect(ratio).toBeGreaterThan(12)
    expect(ratio).toBeLessThan(20)
  })

  it('comes down steeper than it went up, short of the vacuum range', () => {
    const f = simulateFlight(p)
    expect(f.range).toBeLessThan(vacuumRange(p))
    expect(f.apex.pos.x).toBeGreaterThan(f.range / 2)
  })

  it('reaches its best range below 45 degrees', () => {
    const r = (angleDeg: number) => simulateFlight({ ...p, angleDeg }).range
    expect(r(40)).toBeGreaterThan(r(45))
  })
})

describe('vertical motion with quadratic drag (closed form)', () => {
  const vt = terminalVelocity(ball, air)

  it('rises to (vt²/2g) ln(1 + v0²/vt²) in (vt/g) atan(v0/vt)', () => {
    const v0 = 40
    const f = simulateFlight({ speed: v0, angleDeg: 90, projectile: ball, air })
    expect(f.apex.pos.y).toBeCloseTo(((vt * vt) / (2 * g)) * Math.log(1 + (v0 * v0) / (vt * vt)), 7)
    expect(f.apex.t).toBeCloseTo((vt / g) * Math.atan(v0 / vt), 8)
  })

  it('falls from rest with v = vt tanh(gt/vt) and drop (vt²/g) ln cosh(gt/vt)', () => {
    const H = 100
    const f = simulateFlight({ speed: 0, angleDeg: 0, launchHeight: H, projectile: ball, air })
    const tLand = (vt / g) * Math.acosh(Math.exp((g * H) / (vt * vt)))
    expect(f.flightTime).toBeCloseTo(tLand, 8)
    expect(f.impactSpeed).toBeCloseTo(vt * Math.tanh((g * tLand) / vt), 7)
    expect(f.range).toBe(0)
  })
})

describe('flightPositionAt', () => {
  const f = simulateFlight({ speed: 45, angleDeg: 35, projectile: ball, air })

  it('returns the samples at sample times and interpolates between them', () => {
    const s = f.samples[100]
    expect(flightPositionAt(f, s.t)).toEqual(s.pos)
    const mid = flightPositionAt(f, (f.samples[100].t + f.samples[101].t) / 2)
    const fine = simulateFlight({ speed: 45, angleDeg: 35, projectile: ball, air, maxTime: (f.samples[100].t + f.samples[101].t) / 2 })
    const exact = fine.samples.at(-1)!.pos
    expect(mid.x).toBeCloseTo(exact.x, 7)
    expect(mid.y).toBeCloseTo(exact.y, 7)
  })

  it('rests at the launch and landing points outside the flight', () => {
    expect(flightPositionAt(f, -1)).toEqual({ x: 0, y: 0 })
    expect(flightPositionAt(f, f.flightTime + 5)).toEqual({ x: f.range, y: 0 })
  })
})

describe('simulateFlight input checks', () => {
  it('rejects non-physical parameters', () => {
    const base = { speed: 10, angleDeg: 30, projectile: ball }
    expect(() => simulateFlight({ ...base, projectile: { ...ball, mass: 0 } })).toThrow(RangeError)
    expect(() => simulateFlight({ ...base, air: { density: -1 } })).toThrow(RangeError)
    expect(() => simulateFlight({ ...base, timeStep: 0 })).toThrow(RangeError)
  })

  it('stops at maxTime if the projectile has not landed', () => {
    const f = simulateFlight({ speed: 10, angleDeg: 80, projectile: ball, maxTime: 0.5 })
    expect(f.landed).toBe(false)
    expect(f.flightTime).toBeCloseTo(0.5, 12)
  })
})
