// Launch-site frame: +x downrange, +y up, +z right; SI units throughout.
import { standardAtmosphere, type Atmosphere } from './atmosphere'
import { findEventStep, rk4Step, type Derivative } from './ode'
import { STANDARD_GRAVITY } from './trajectory'
import { add, cross, dot, norm, scale, sub, type Vec3 } from './vec3'

export type Projectile3D = { mass: number; diameter: number; drag: number | ((mach: number) => number) }
export type Environment = {
  atmosphere?: Atmosphere
  wind?: Vec3 | ((altitude: number) => Vec3)
  earthRotation?: { latitudeDeg: number; azimuthDeg: number }
  curvedEarth?: boolean
  gravity?: number
}
export type Launch3D = { speed: number; elevationDeg: number; launchHeight?: number }
export type Flight3DSample = { t: number; pos: Vec3; vel: Vec3 }
export type Flight3D = {
  samples: Flight3DSample[]
  landed: boolean
  flightTime: number
  range: number
  drift: number
  apex: Flight3DSample
  impactSpeed: number
}

const EARTH_RADIUS = 6_371_000
const EARTH_ROTATION = 7.2921159e-5
const ZERO: Vec3 = { x: 0, y: 0, z: 0 }

function finite(value: number, name: string) {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`)
}

function nonnegative(value: number, name: string) {
  finite(value, name)
  if (value < 0) throw new RangeError(`${name} must be nonnegative`)
}

function positive(value: number, name: string) {
  finite(value, name)
  if (value <= 0) throw new RangeError(`${name} must be positive`)
}

function vector(value: Vec3, name: string) {
  finite(value.x, `${name}.x`)
  finite(value.y, `${name}.y`)
  finite(value.z, `${name}.z`)
}

export function dragTable(points: readonly (readonly [mach: number, cd: number])[]): (mach: number) => number {
  if (points.length === 0) throw new RangeError('drag table must contain at least one point')
  const table = points.map(([mach, cd], i) => {
    nonnegative(mach, 'Mach')
    nonnegative(cd, 'Cd')
    if (i > 0 && mach <= points[i - 1][0]) throw new RangeError('Mach nodes must be strictly increasing')
    return [mach, cd] as const
  })
  return (mach) => {
    finite(mach, 'Mach')
    if (mach <= table[0][0]) return table[0][1]
    const last = table.length - 1
    if (mach >= table[last][0]) return table[last][1]
    let lo = 0
    let hi = last
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (mach < table[mid][0]) hi = mid
      else lo = mid
    }
    const [m0, c0] = table[lo]
    const [m1, c1] = table[hi]
    return c0 + ((mach - m0) / (m1 - m0)) * (c1 - c0)
  }
}

export function simulateFlight3D(p: {
  launch: Launch3D
  projectile: Projectile3D
  environment?: Environment
  timeStep?: number
  maxTime?: number
}): Flight3D {
  const { launch, projectile } = p
  const environment = p.environment ?? {}
  const atmosphere = environment.atmosphere ?? standardAtmosphere
  const g = environment.gravity ?? STANDARD_GRAVITY
  const height = launch.launchHeight ?? 0
  const maxTime = p.maxTime ?? 600
  positive(projectile.mass, 'mass')
  nonnegative(projectile.diameter, 'diameter')
  if (typeof projectile.drag !== 'function') nonnegative(projectile.drag, 'drag')
  nonnegative(launch.speed, 'speed')
  finite(launch.elevationDeg, 'elevationDeg')
  nonnegative(height, 'launchHeight')
  nonnegative(g, 'gravity')
  positive(maxTime, 'maxTime')
  const angle = (launch.elevationDeg * Math.PI) / 180
  const vy = launch.speed * Math.sin(angle)
  const flightEstimate = g > 0 ? (vy + Math.hypot(vy, Math.sqrt(2 * g * height))) / g : maxTime
  const dt = p.timeStep ?? Math.max(1 / 200, flightEstimate / 20_000)
  positive(dt, 'timeStep')
  const areaPerMass = (Math.PI * projectile.diameter * projectile.diameter) / (8 * projectile.mass)
  finite(areaPerMass, 'frontal area per mass')

  let omega = ZERO
  if (environment.earthRotation) {
    const { latitudeDeg, azimuthDeg } = environment.earthRotation
    finite(latitudeDeg, 'latitudeDeg')
    finite(azimuthDeg, 'azimuthDeg')
    if (Math.abs(latitudeDeg) > 90) throw new RangeError('latitudeDeg must be between -90 and 90')
    const latitude = (latitudeDeg * Math.PI) / 180
    const azimuth = (azimuthDeg * Math.PI) / 180
    omega = scale({ x: Math.cos(latitude) * Math.cos(azimuth), y: Math.sin(latitude), z: -Math.cos(latitude) * Math.sin(azimuth) }, EARTH_ROTATION)
  }
  if (environment.wind && typeof environment.wind !== 'function') vector(environment.wind, 'wind')

  const radial = (s: readonly number[]): Vec3 => ({ x: s[0], y: s[1] + EARTH_RADIUS, z: s[2] })
  const altitude = environment.curvedEarth
    ? (s: readonly number[]) => {
      // Rationalising r - R preserves small heights near the surface.
      const r = norm(radial(s))
      return (s[0] * s[0] + s[1] * (2 * EARTH_RADIUS + s[1]) + s[2] * s[2]) / (r + EARTH_RADIUS)
    }
    : (s: readonly number[]) => s[1]
  const climbRate = environment.curvedEarth
    ? (s: readonly number[]) => dot(radial(s), { x: s[3], y: s[4], z: s[5] }) / norm(radial(s))
    : (s: readonly number[]) => s[4]

  const derivative: Derivative = (_t, s) => {
    const velocity = { x: s[3], y: s[4], z: s[5] }
    const h = Math.max(0, altitude(s))
    const air = atmosphere(h)
    positive(air.temperature, 'air temperature')
    nonnegative(air.pressure, 'air pressure')
    nonnegative(air.density, 'air density')
    positive(air.speedOfSound, 'speed of sound')
    const wind = typeof environment.wind === 'function' ? environment.wind(h) : environment.wind ?? ZERO
    vector(wind, 'wind')
    const relative = sub(velocity, wind)
    const speed = norm(relative)
    const radius = norm(radial(s))
    const gravity = environment.curvedEarth
      ? scale(radial(s), -g * (EARTH_RADIUS / radius) ** 2 / radius)
      : { x: 0, y: -g, z: 0 }
    let acceleration = sub(gravity, scale(cross(omega, velocity), 2))
    if (speed > 0 && air.density > 0 && areaPerMass > 0) {
      const cd = typeof projectile.drag === 'function' ? projectile.drag(speed / air.speedOfSound) : projectile.drag
      nonnegative(cd, 'Cd')
      acceleration = add(acceleration, scale(relative, -air.density * areaPerMass * cd * speed))
    }
    return [s[3], s[4], s[5], acceleration.x, acceleration.y, acceleration.z]
  }

  const sample = (t: number, s: readonly number[]): Flight3DSample => ({ t, pos: { x: s[0], y: s[1], z: s[2] }, vel: { x: s[3], y: s[4], z: s[5] } })
  let state = [0, height, 0, launch.speed * Math.cos(angle), vy, 0]
  let t = 0
  const samples = [sample(t, state)]
  let apex = samples[0]
  let apexAltitude = height
  let landed = false

  while (t < maxTime) {
    const h = Math.min(dt, maxTime - t)
    if (t + h === t) throw new RangeError('timeStep is too small to advance time')
    const step = (delta: number) => rk4Step(derivative, t, state, delta)
    const next = step(h)
    if (!next.every(Number.isFinite)) throw new RangeError('flight state is not finite; reduce timeStep')
    let landingStart = 0
    if (climbRate(state) > 0 && climbRate(next) <= 0) {
      const hApex = findEventStep(step, climbRate, h)
      const top = step(hApex)
      const topAltitude = altitude(top)
      if (topAltitude > apexAltitude) {
        apex = sample(t + hApex, top)
        apexAltitude = topAltitude
      }
      // A coarse first step may contain both apex and landing; exclude t = 0.
      if (altitude(state) <= 0 && topAltitude > 0) landingStart = hApex
    }
    if (altitude(step(landingStart)) > 0 && altitude(next) <= 0 && climbRate(next) < 0) {
      const hLand = landingStart + findEventStep((delta) => step(landingStart + delta), altitude, h - landingStart)
      const land = step(hLand)
      if (!environment.curvedEarth) land[1] = 0
      samples.push(sample(t + hLand, land))
      landed = true
      break
    }
    state = next
    t += h
    const current = sample(t, state)
    samples.push(current)
    if (altitude(state) > apexAltitude) {
      apex = current
      apexAltitude = altitude(state)
    }
  }

  const last = samples[samples.length - 1]
  const radius = norm({ x: last.pos.x, y: last.pos.y + EARTH_RADIUS, z: last.pos.z })
  return {
    samples,
    landed,
    flightTime: last.t,
    range: environment.curvedEarth ? EARTH_RADIUS * Math.atan2(last.pos.x, last.pos.y + EARTH_RADIUS) : last.pos.x,
    drift: environment.curvedEarth ? EARTH_RADIUS * Math.asin(Math.max(-1, Math.min(1, last.pos.z / radius))) : last.pos.z,
    apex,
    impactSpeed: norm(last.vel),
  }
}
