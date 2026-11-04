// Planar rigid-body flight. SI units; pitch is positive nose-up and axial
// distances are measured aft from the nose.
import { findEventStep, rk4Step, type Derivative } from './ode'
import { STANDARD_GRAVITY, type Vec2 } from './trajectory'

export type DartAero = {
  cnAlpha: number // per radian
  xcp: number // m from nose
  cd0: number
  cdAlpha2: number
  cmq: number
}

export type Dart = {
  mass: number // kg
  diameter: number // m
  xcg: number // m from nose
  pitchInertia: number // kg m²
  aero: DartAero
}

export type FinSet = {
  count: 3 | 4
  rootChord: number
  tipChord: number
  span: number
  sweep: number // leading-edge sweep distance, m
  leadingEdgeFromNose: number
}

export type DartParams = {
  dart: Dart
  speed: number
  elevationDeg: number
  initialAlphaDeg?: number
  initialPitchRate?: number // rad/s
  airDensity?: number
  gravity?: number
  launchHeight?: number
  timeStep?: number
  maxTime?: number
}

export type DartSample = {
  t: number
  pos: Vec2
  vel: Vec2
  pitch: number // rad, unwrapped
  alpha: number // rad in (-pi, pi]
}

export type DartFlight = {
  samples: DartSample[]
  landed: boolean
  flightTime: number
  range: number
}

function finite(name: string, value: number): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`)
}

function nonnegative(name: string, value: number): void {
  finite(name, value)
  if (value < 0) throw new RangeError(`${name} must be zero or positive`)
}

function positive(name: string, value: number): void {
  finite(name, value)
  if (value <= 0) throw new RangeError(`${name} must be positive`)
}

function validateDart(dart: Dart): void {
  positive('mass', dart.mass)
  positive('diameter', dart.diameter)
  positive('pitchInertia', dart.pitchInertia)
  nonnegative('xcg', dart.xcg)
  nonnegative('xcp', dart.aero.xcp)
  nonnegative('cnAlpha', dart.aero.cnAlpha)
  nonnegative('cd0', dart.aero.cd0)
  nonnegative('cdAlpha2', dart.aero.cdAlpha2)
  finite('cmq', dart.aero.cmq)
}

export function staticMargin(dart: Dart): number {
  validateDart(dart)
  return (dart.aero.xcp - dart.xcg) / dart.diameter
}

function wrapAngle(angle: number): number {
  const wrapped = Math.atan2(Math.sin(angle), Math.cos(angle))
  return wrapped <= -Math.PI ? Math.PI : wrapped
}

function toSample(t: number, state: readonly number[]): DartSample {
  const [x, y, vx, vy, pitch] = state
  return {
    t, pos: { x, y }, vel: { x: vx, y: vy }, pitch,
    alpha: wrapAngle(pitch - Math.atan2(vy, vx)),
  }
}

export function simulateDart(p: DartParams): DartFlight {
  const { dart } = p
  const density = p.airDensity ?? 1.225
  const gravity = p.gravity ?? STANDARD_GRAVITY
  const height = p.launchHeight ?? 0
  const dt = p.timeStep ?? 1 / 200
  const maxTime = p.maxTime ?? 600
  validateDart(dart)
  nonnegative('speed', p.speed)
  finite('elevationDeg', p.elevationDeg)
  finite('initialAlphaDeg', p.initialAlphaDeg ?? 0)
  finite('initialPitchRate', p.initialPitchRate ?? 0)
  nonnegative('airDensity', density)
  nonnegative('gravity', gravity)
  nonnegative('launchHeight', height)
  positive('timeStep', dt)
  positive('maxTime', maxTime)

  const { mass, diameter, pitchInertia, xcg, aero } = dart
  const area = Math.PI * diameter * diameter / 4
  const derivative: Derivative = (_t, [, , vx, vy, pitch, q]) => {
    const speed = Math.hypot(vx, vy)
    const alpha = wrapAngle(pitch - Math.atan2(vy, vx))
    const sinAlpha = Math.sin(alpha)
    const pressureArea = 0.5 * density * speed * speed * area
    const axial = -pressureArea * (aero.cd0 + aero.cdAlpha2 * sinAlpha * sinAlpha)
      * Math.sign(Math.cos(alpha))
    const normal = pressureArea * aero.cnAlpha * sinAlpha
    const cosPitch = Math.cos(pitch)
    const sinPitch = Math.sin(pitch)
    // qbar/V = rho V/2: this form stays finite when airspeed is zero.
    const dampingMoment = 0.25 * density * speed * area * diameter * diameter * aero.cmq * q
    const moment = -normal * (aero.xcp - xcg) + dampingMoment
    return [
      vx, vy, (axial * cosPitch - normal * sinPitch) / mass,
      (axial * sinPitch + normal * cosPitch) / mass - gravity,
      q, moment / pitchInertia,
    ]
  }

  const elevation = p.elevationDeg * Math.PI / 180
  const vx = p.speed * Math.cos(elevation)
  const vy = p.speed * Math.sin(elevation)
  let state = [0, height, vx, vy, elevation + (p.initialAlphaDeg ?? 0) * Math.PI / 180, p.initialPitchRate ?? 0]
  let t = 0
  let landed = false
  const samples = [toSample(t, state)]
  while (t < maxTime) {
    const h = Math.min(dt, maxTime - t)
    const step = (duration: number) => rk4Step(derivative, t, state, duration)
    const next = step(h)
    if (next[1] <= 0 && next[3] < 0) {
      let eventStep = step
      let offset = 0
      // A coarse first step can include the whole hop. Start the landing
      // bracket at its apex so the launch point is not mistaken for impact.
      if (state[1] === 0 && state[3] > 0) {
        offset = findEventStep(step, (s) => s[3], h, state[3])
        const apex = step(offset)
        eventStep = (duration) => rk4Step(derivative, t + offset, apex, duration)
      }
      const landingStep = findEventStep(eventStep, (s) => s[1], h - offset)
      const land = eventStep(landingStep)
      land[1] = 0
      t += offset + landingStep
      if (t > samples.at(-1)!.t) samples.push(toSample(t, land))
      landed = true
      break
    }
    state = next
    t += h
    samples.push(toSample(t, state))
  }
  const last = samples.at(-1)!
  return { samples, landed, flightTime: last.t, range: last.pos.x }
}

export function barrowman(geom: {
  noseLength: number
  noseShape: 'cone' | 'tangentOgive'
  bodyDiameter: number
  fins?: FinSet
}): {
  cnAlpha: number
  xcp: number
  cnAlphaNose: number
  xcpNose: number
  cnAlphaFins: number
  xcpFins: number
  finInterference: number
} {
  const { noseLength: length, bodyDiameter: diameter, fins } = geom
  positive('noseLength', length)
  positive('bodyDiameter', diameter)
  if (geom.noseShape !== 'cone' && geom.noseShape !== 'tangentOgive') {
    throw new RangeError('noseShape must be cone or tangentOgive')
  }
  let xcpNose = (2 * length) / 3
  if (geom.noseShape === 'tangentOgive') {
    const radiusRatio = diameter / (2 * length)
    if (radiusRatio > 1) throw new RangeError('tangent ogive noseLength must be at least the body radius')
    const curvature = (1 + radiusRatio * radiusRatio) / (2 * radiusRatio)
    // Simpson quadrature of V/(A_base L); rationalising the circular profile
    // avoids subtracting nearly equal radii for slender noses.
    const intervals = 512
    let integral = 0
    for (let i = 0; i <= intervals; i++) {
      const u = 1 - i / intervals
      const profile = 1 - (u * u) / (radiusRatio * (curvature + Math.sqrt(curvature * curvature - u * u)))
      const weight = i === 0 || i === intervals ? 1 : i % 2 === 0 ? 2 : 4
      integral += weight * profile * profile
    }
    xcpNose = length * (1 - integral / (3 * intervals))
  }

  const cnAlphaNose = 2
  let cnAlphaFins = 0
  let xcpFins = 0
  let finInterference = 1
  if (fins) {
    if (fins.count !== 3 && fins.count !== 4) throw new RangeError('fin count must be 3 or 4')
    positive('rootChord', fins.rootChord)
    nonnegative('tipChord', fins.tipChord)
    positive('span', fins.span)
    finite('sweep', fins.sweep)
    nonnegative('leadingEdgeFromNose', fins.leadingEdgeFromNose)
    const { rootChord: root, tipChord: tip, span, sweep } = fins
    const chordSum = root + tip
    const midChordLength = Math.hypot(span, sweep + (tip - root) / 2)
    const radius = diameter / 2
    finInterference = 1 + radius / (span + radius)
    cnAlphaFins = (finInterference * 4 * fins.count * (span / diameter) ** 2)
      / (1 + Math.hypot(1, (2 * midChordLength) / chordSum))
    xcpFins = fins.leadingEdgeFromNose + (sweep / 3) * (root + 2 * tip) / chordSum
      + (chordSum - root * tip / chordSum) / 6
  }
  const cnAlpha = cnAlphaNose + cnAlphaFins
  return {
    cnAlpha,
    xcp: (cnAlphaNose * xcpNose + cnAlphaFins * xcpFins) / cnAlpha,
    cnAlphaNose,
    xcpNose,
    cnAlphaFins,
    xcpFins,
    finInterference,
  }
}
