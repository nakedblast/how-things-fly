// Point-mass flight with quadratic air drag, integrated with classical RK4.
// SI units throughout; +x is downrange, +y is up, the ground is y = 0.

import { STANDARD_GRAVITY, type LaunchParams, type Sample, type Vec2 } from './trajectory'

export type Projectile = {
  mass: number // kg
  diameter: number // m, sets the frontal area
  dragCoefficient: number // dimensionless, referenced to the frontal area
}

export type Air = {
  density: number // kg/m³; 0 is a vacuum
}

// Sea-level density of the ISA standard atmosphere (15 °C, 101 325 Pa).
export const SEA_LEVEL_AIR_DENSITY = 1.225

export type FlightParams = LaunchParams & {
  projectile: Projectile
  air?: Air // defaults to sea-level standard air
  launchHeight?: number // m above the ground, defaults to 0
  timeStep?: number // s, integrator step, defaults to DEFAULT_TIME_STEP
  maxTime?: number // s, the simulation stops here if the projectile has not landed
}

export const DEFAULT_TIME_STEP = 1 / 200
const DEFAULT_MAX_TIME = 600

export type FlightSample = Sample & { vel: Vec2 }

export type Flight = {
  samples: FlightSample[] // from launch to landing (or maxTime); the last is the landing point
  landed: boolean
  flightTime: number // s
  range: number // m, horizontal distance at landing (or at maxTime)
  apex: FlightSample // highest point
  impactSpeed: number // m/s, speed at the last sample
}

type State = { x: number; y: number; vx: number; vy: number }

export function frontalArea(p: Projectile): number {
  return (Math.PI * p.diameter * p.diameter) / 4
}

// Drag force per unit mass per speed squared: |a_drag| = k v².
export function dragFactor(p: Projectile, air: Air): number {
  return (0.5 * air.density * p.dragCoefficient * frontalArea(p)) / p.mass
}

// Speed at which drag balances weight in a straight fall.
export function terminalVelocity(p: Projectile, air: Air, gravity = STANDARD_GRAVITY): number {
  const k = dragFactor(p, air)
  return k > 0 ? Math.sqrt(gravity / k) : Infinity
}

function validate(p: FlightParams, air: Air, dt: number) {
  const { mass, diameter, dragCoefficient } = p.projectile
  if (!(mass > 0)) throw new RangeError('mass must be positive')
  if (!(diameter >= 0)) throw new RangeError('diameter must be zero or positive')
  if (!(dragCoefficient >= 0)) throw new RangeError('dragCoefficient must be zero or positive')
  if (!(air.density >= 0)) throw new RangeError('air density must be zero or positive')
  if (!(dt > 0)) throw new RangeError('timeStep must be positive')
  if (!((p.launchHeight ?? 0) >= 0)) throw new RangeError('launchHeight must be zero or positive')
}

export function simulateFlight(p: FlightParams): Flight {
  const air = p.air ?? { density: SEA_LEVEL_AIR_DENSITY }
  const dt = p.timeStep ?? DEFAULT_TIME_STEP
  const maxTime = p.maxTime ?? DEFAULT_MAX_TIME
  validate(p, air, dt)

  const g = p.gravity ?? STANDARD_GRAVITY
  const k = dragFactor(p.projectile, air)
  const accel = (s: State): Vec2 => {
    const v = Math.hypot(s.vx, s.vy)
    return { x: -k * v * s.vx, y: -g - k * v * s.vy }
  }
  const step = (s: State, h: number): State => rk4(s, h, accel)

  const a = (p.angleDeg * Math.PI) / 180
  let s: State = {
    x: 0,
    y: p.launchHeight ?? 0,
    vx: p.speed * Math.cos(a),
    vy: p.speed * Math.sin(a),
  }
  let t = 0
  const samples: FlightSample[] = [toSample(t, s)]
  let apex = samples[0]
  let landed = false

  while (t < maxTime) {
    const h = Math.min(dt, maxTime - t)
    const next = step(s, h)

    // Highest point: vy changes sign from positive to non-positive within the step.
    if (s.vy > 0 && next.vy <= 0) {
      const hApex = refineRoot(s, h, step, (q) => q.vy, (q) => accel(q).y)
      apex = toSample(t + hApex, step(s, hApex))
    }

    // Landing: y crosses the ground while descending.
    if (next.y <= 0 && next.vy < 0) {
      const hLand = refineRoot(s, h, step, (q) => q.y, (q) => q.vy)
      const land = step(s, hLand)
      land.y = 0
      t += hLand
      samples.push(toSample(t, land))
      landed = true
      break
    }

    s = next
    t += h
    samples.push(toSample(t, s))
  }

  const last = samples[samples.length - 1]
  return {
    samples,
    landed,
    flightTime: last.t,
    range: last.pos.x,
    apex,
    impactSpeed: Math.hypot(last.vel.x, last.vel.y),
  }
}

// Position at time t, interpolated between samples with cubic Hermite (positions
// and velocities), clamped to the flight like vacuumPositionAt.
export function flightPositionAt(f: Flight, t: number): Vec2 {
  const ss = f.samples
  if (t <= ss[0].t) return { ...ss[0].pos }
  const last = ss[ss.length - 1]
  if (t >= last.t) return { ...last.pos }
  let lo = 0
  let hi = ss.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (ss[mid].t <= t) lo = mid
    else hi = mid
  }
  const a = ss[lo]
  const b = ss[hi]
  const h = b.t - a.t
  const u = (t - a.t) / h
  const u2 = u * u
  const u3 = u2 * u
  const h00 = 2 * u3 - 3 * u2 + 1
  const h10 = u3 - 2 * u2 + u
  const h01 = -2 * u3 + 3 * u2
  const h11 = u3 - u2
  return {
    x: h00 * a.pos.x + h10 * h * a.vel.x + h01 * b.pos.x + h11 * h * b.vel.x,
    y: h00 * a.pos.y + h10 * h * a.vel.y + h01 * b.pos.y + h11 * h * b.vel.y,
  }
}

function toSample(t: number, s: State): FlightSample {
  return { t, pos: { x: s.x, y: s.y }, vel: { x: s.vx, y: s.vy } }
}

function rk4(s: State, h: number, accel: (s: State) => Vec2): State {
  const a1 = accel(s)
  const s2 = { x: s.x + (h / 2) * s.vx, y: s.y + (h / 2) * s.vy, vx: s.vx + (h / 2) * a1.x, vy: s.vy + (h / 2) * a1.y }
  const a2 = accel(s2)
  const s3 = { x: s.x + (h / 2) * s2.vx, y: s.y + (h / 2) * s2.vy, vx: s.vx + (h / 2) * a2.x, vy: s.vy + (h / 2) * a2.y }
  const a3 = accel(s3)
  const s4 = { x: s.x + h * s3.vx, y: s.y + h * s3.vy, vx: s.vx + h * a3.x, vy: s.vy + h * a3.y }
  const a4 = accel(s4)
  return {
    x: s.x + (h / 6) * (s.vx + 2 * s2.vx + 2 * s3.vx + s4.vx),
    y: s.y + (h / 6) * (s.vy + 2 * s2.vy + 2 * s3.vy + s4.vy),
    vx: s.vx + (h / 6) * (a1.x + 2 * a2.x + 2 * a3.x + a4.x),
    vy: s.vy + (h / 6) * (a1.y + 2 * a2.y + 2 * a3.y + a4.y),
  }
}

// Sub-step h in [0, hMax] at which f(step(s, h)) = 0, by Newton's method on the
// RK4 step itself, so event points carry the integrator's own accuracy.
function refineRoot(
  s: State,
  hMax: number,
  step: (s: State, h: number) => State,
  f: (s: State) => number,
  df: (s: State) => number,
): number {
  const f0 = f(s)
  const f1 = f(step(s, hMax))
  let h = f0 === f1 ? hMax : (hMax * f0) / (f0 - f1)
  for (let i = 0; i < 8; i++) {
    const q = step(s, h)
    const d = df(q)
    if (d === 0) break
    const dh = f(q) / d
    h = Math.min(Math.max(h - dh, 0), hMax)
    if (Math.abs(dh) < 1e-12 * hMax) break
  }
  return h
}
