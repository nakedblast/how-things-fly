// The lesson's projectiles and launches, in metres, kilograms and seconds. The range dart, the
// arrows and the camera dart are invented to read well on screen; the shuttlecock's figures are
// cited in the sources list.

import { barrowman, simulateDart, type Dart, type DartFlight, type DartSample } from '../../physics/dart'
import type { PredictionOutcome } from '../../book/progress'

export const LESSON_ID = 'staying-pointed'

// --- Shapes, for drawing ----------------------------------------------------------------------

/** Positions along the body are measured aft from the nose; radii are in metres. */
export type Tone = 'body' | 'weight' | 'point' | 'camera' | 'cork' | 'nock'
export type Part =
  | { kind: 'cone'; from: number; to: number; r: number; tone?: Tone }
  | { kind: 'tube'; from: number; to: number; r: number; tone?: Tone }
  | { kind: 'fins'; le: number; root: number; tip: number; span: number; sweep: number; r: number; feathers?: boolean }
  | { kind: 'skirt'; from: number; to: number; r0: number; r1: number }

export interface Shape {
  length: number
  parts: Part[]
}

/** Everything a view needs about one projectile: how it looks and how it flies. */
export interface Projectile {
  shape: Shape
  dart: Dart
}

// --- Building a dart from its pieces ----------------------------------------------------------

interface Piece {
  mass: number
  /** Centre of the piece, from the nose. */
  x: number
  /** Length along the body, for its own pitch inertia (a thin rod). */
  length: number
}

interface FinSpec {
  count: 3 | 4
  le: number
  root: number
  tip: number
  span: number
  sweep: number
}

const DRAG_ZERO = 0.6 // drag coefficient of a slender finned body at zero angle (illustrative)
const DRAG_SIDEWAYS = 3 // extra drag when flying sideways, times sin² of the angle (illustrative)

function assemble(p: {
  diameter: number
  noseLength: number
  pieces: readonly Piece[]
  fins: FinSpec
}): Dart {
  const mass = p.pieces.reduce((s, q) => s + q.mass, 0)
  const xcg = p.pieces.reduce((s, q) => s + q.mass * q.x, 0) / mass
  const pitchInertia = p.pieces.reduce((s, q) => s + q.mass * (q.length ** 2 / 12 + (q.x - xcg) ** 2), 0)
  const aero = barrowman({
    noseLength: p.noseLength,
    noseShape: 'cone',
    bodyDiameter: p.diameter,
    fins: {
      count: p.fins.count,
      rootChord: p.fins.root,
      tipChord: p.fins.tip,
      span: p.fins.span,
      sweep: p.fins.sweep,
      leadingEdgeFromNose: p.fins.le,
    },
  })
  // Pitch damping from the fins (physics outline S8).
  const cmq = -2 * aero.cnAlphaFins * ((aero.xcpFins - xcg) / p.diameter) ** 2
  return {
    mass,
    diameter: p.diameter,
    xcg,
    pitchInertia,
    aero: { cnAlpha: aero.cnAlpha, xcp: aero.xcp, cd0: DRAG_ZERO, cdAlpha2: DRAG_SIDEWAYS, cmq },
  }
}

// --- The range dart: a tube with a sliding weight and sliding fins ----------------------------

export const DART = {
  length: 0.6,
  diameter: 0.025,
  noseLength: 0.06,
  tubeMass: 0.1,
  weightMass: 0.3,
  weightLength: 0.05,
  finMass: 0.01,
  fins: { count: 4 as const, root: 0.05, tip: 0.03, span: 0.025, sweep: 0.02 },
}
/** Slider limits for the weight's centre and the fins' leading edge. */
export const WEIGHT_RANGE = { min: 0.03, max: 0.57 }
export const FIN_RANGE = { min: 0.07, max: Math.round((DART.length - DART.fins.root) * 100) / 100 }
export const FINS_AT_TAIL = FIN_RANGE.max
export const FINS_MIDDLE = 0.3

export function rangeDart(weightX: number, finLE: number = FINS_AT_TAIL): Projectile {
  const { length, diameter, noseLength, fins } = DART
  const r = diameter / 2
  const dart = assemble({
    diameter,
    noseLength,
    pieces: [
      { mass: DART.tubeMass, x: length / 2, length },
      { mass: DART.weightMass, x: weightX, length: DART.weightLength },
      { mass: DART.finMass, x: finLE + fins.root / 2, length: fins.root },
    ],
    fins: { ...fins, le: finLE },
  })
  const half = DART.weightLength / 2
  return {
    dart,
    shape: {
      length,
      parts: [
        { kind: 'cone', from: 0, to: noseLength, r },
        { kind: 'tube', from: noseLength, to: length, r },
        { kind: 'fins', le: finLE, root: fins.root, tip: fins.tip, span: fins.span, sweep: fins.sweep, r },
        { kind: 'tube', from: weightX - half, to: weightX + half, r: r * 1.5, tone: 'weight' },
      ],
    },
  }
}

// --- Launches and what happened ---------------------------------------------------------------

export interface Launch {
  speed: number
  elevationDeg: number
  /** Nose above the direction of travel at release; 180 means flying backwards. */
  alphaDeg: number
  density?: number
  /** Height of the launch above the ground, m. */
  height?: number
  /** How long to watch; defaults to the whole flight. */
  duration?: number
  timeStep?: number
}

/** Launcher at 25 m/s, 30° up, with a small wobble at release: no real launch is perfectly clean. */
export const MAIN_LAUNCH: Launch = { speed: 25, elevationDeg: 30, alphaDeg: 6 }

export type Behaviour = 'true' | 'wobble' | 'tumble'

export interface DartShot {
  projectile: Projectile
  launch: Launch
  flight: DartFlight
  behaviour: Behaviour
  /** Largest angle between nose and direction of travel, degrees, after the first half second. */
  lateAlphaDeg: number
  /** Whether the end that led at launch was ever trailing. */
  turnedRound: boolean
  duration: number
  sampleAt(t: number): DartSample
}

export const SETTLE_TIME = 0.5 // s before a wobble counts
export const WOBBLE_DEG = 9
const DEG = 180 / Math.PI

export function classify(samples: readonly DartSample[], settle = SETTLE_TIME): { behaviour: Behaviour; lateAlphaDeg: number } {
  let late = 0
  let tumbled = false
  for (const s of samples) {
    const a = Math.abs(s.alpha) * DEG
    if (a > 90) tumbled = true
    if (s.t >= settle) late = Math.max(late, a)
  }
  return { behaviour: tumbled ? 'tumble' : late > WOBBLE_DEG ? 'wobble' : 'true', lateAlphaDeg: late }
}

export function fly(projectile: Projectile, launch: Launch = MAIN_LAUNCH): DartShot {
  const flight = simulateDart({
    dart: projectile.dart,
    speed: launch.speed,
    elevationDeg: launch.elevationDeg,
    initialAlphaDeg: launch.alphaDeg,
    airDensity: launch.density,
    launchHeight: launch.height,
    timeStep: launch.timeStep ?? 1 / 1000,
    maxTime: launch.duration,
  })
  const { samples } = flight
  const { behaviour, lateAlphaDeg } = classify(samples)
  const leading = Math.sign(Math.cos(samples[0].alpha))
  const turnedRound = samples.some((s) => Math.sign(Math.cos(s.alpha)) === -leading)
  const last = samples[samples.length - 1]
  const duration = last.t
  return {
    projectile,
    launch,
    flight,
    behaviour,
    lateAlphaDeg,
    turnedRound,
    duration,
    sampleAt: (t) => sampleAt(samples, t),
  }
}

/** Linear interpolation between stored samples; pitch is unwrapped, so it interpolates cleanly. */
export function sampleAt(samples: readonly DartSample[], t: number): DartSample {
  const end = samples[samples.length - 1]
  if (t <= samples[0].t) return samples[0]
  if (t >= end.t) return end
  let lo = 0
  let hi = samples.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (samples[mid].t <= t) lo = mid
    else hi = mid
  }
  const a = samples[lo]
  const b = samples[hi]
  const u = (t - a.t) / (b.t - a.t)
  const mix = (p: number, q: number) => p + (q - p) * u
  const pitch = mix(a.pitch, b.pitch)
  const vel = { x: mix(a.vel.x, b.vel.x), y: mix(a.vel.y, b.vel.y) }
  const alpha = Math.atan2(Math.sin(pitch - Math.atan2(vel.y, vel.x)), Math.cos(pitch - Math.atan2(vel.y, vel.x)))
  return { t, pos: { x: mix(a.pos.x, b.pos.x), y: mix(a.pos.y, b.pos.y) }, vel, pitch, alpha }
}

/** Static margin in body widths: how far the push point sits behind the balance point. */
export function margin(p: Projectile): number {
  return (p.dart.aero.xcp - p.dart.xcg) / p.dart.diameter
}

// --- Predict: three stops for the weight ------------------------------------------------------

export type WeightStop = 'nose' | 'middle' | 'fins'
export const WEIGHT_STOPS: readonly { value: WeightStop; label: string; x: number }[] = [
  { value: 'nose', label: 'At the nose end', x: 0.05 },
  { value: 'middle', label: 'In the middle', x: 0.3 },
  { value: 'fins', label: 'At the fin end', x: 0.56 },
]
export function stopX(stop: WeightStop): number {
  return WEIGHT_STOPS.find((s) => s.value === stop)!.x
}

/** The fin end is the myth ("the heavy end trails"); the nose end is the real idea. */
export function weightOutcome(stop: WeightStop): PredictionOutcome {
  return stop === 'fins' ? 'myth' : stop === 'nose' ? 'matched' : 'other'
}

const shotCache = new Map<string, DartShot>()
/** The range dart at the main launch, cached because the lesson redraws it often. */
export function rangeShot(weightX: number, finLE: number = FINS_AT_TAIL): DartShot {
  const key = `${weightX.toFixed(3)}:${finLE.toFixed(3)}`
  let shot = shotCache.get(key)
  if (!shot) {
    shot = fly(rangeDart(weightX, finLE))
    shotCache.set(key, shot)
  }
  return shot
}

// --- Prove, puzzle 1: will it turn round? -----------------------------------------------------

// Shuttlecock (Cohen et al. 2015; BWF Law 2): 5 g, skirt 64 mm across, drag coefficient 0.65,
// balance point 3.0 cm ahead of the push point. Normal-force slope, inertia and damping are
// illustrative, tuned so the flip takes about 20 ms as filmed.
const SHUTTLE_LENGTH = 0.085
export const SHUTTLE: Projectile = {
  dart: {
    mass: 0.005,
    diameter: 0.064,
    xcg: 0.022,
    pitchInertia: 3.5e-6,
    aero: { cnAlpha: 3.6, xcp: 0.052, cd0: 0.65, cdAlpha2: 0.5, cmq: -6 },
  },
  shape: {
    length: SHUTTLE_LENGTH,
    parts: [
      { kind: 'tube', from: 0, to: 0.025, r: 0.0132, tone: 'cork' },
      { kind: 'skirt', from: 0.02, to: SHUTTLE_LENGTH, r0: 0.012, r1: 0.032 },
    ],
  },
}

// An arrow: a light shaft with a heavy point. Fletching position is the variable.
const ARROW_LENGTH = 0.75
const ARROW_DIAMETER = 0.0075
function arrow(fletchLE: number): Projectile {
  const r = ARROW_DIAMETER / 2
  const fins: FinSpec = { count: 3, le: fletchLE, root: 0.05, tip: 0.02, span: 0.013, sweep: 0.03 }
  return {
    dart: assemble({
      diameter: ARROW_DIAMETER,
      noseLength: 0.02,
      pieces: [
        { mass: 0.0065, x: 0.012, length: 0.025 },
        { mass: 0.014, x: ARROW_LENGTH / 2, length: ARROW_LENGTH },
        { mass: 0.0015, x: fletchLE + 0.025, length: 0.05 },
        { mass: 0.001, x: ARROW_LENGTH - 0.005, length: 0.01 },
      ],
      fins,
    }),
    shape: {
      length: ARROW_LENGTH,
      parts: [
        { kind: 'cone', from: 0, to: 0.025, r: r * 1.15, tone: 'point' },
        { kind: 'tube', from: 0.025, to: ARROW_LENGTH - 0.012, r },
        { kind: 'tube', from: ARROW_LENGTH - 0.012, to: ARROW_LENGTH, r: r * 1.1, tone: 'nock' },
        { kind: 'fins', le: fletchLE, root: fins.root, tip: fins.tip, span: fins.span, sweep: fins.sweep, r, feathers: true },
      ],
    },
  }
}
export const ARROW = arrow(ARROW_LENGTH - 0.075)
export const ARROW_FRONT_FLETCHED = arrow(0.035)

// The camera dart: the range dart's tube and fins with a heavy camera fixed in place.
export const CAMERA = { mass: 0.25, length: 0.08 }
export function cameraDart(cameraX: number, finLE: number): Projectile {
  const { length, diameter, noseLength, fins } = DART
  const r = diameter / 2
  const dart = assemble({
    diameter,
    noseLength,
    pieces: [
      { mass: DART.tubeMass, x: length / 2, length },
      { mass: CAMERA.mass, x: cameraX, length: CAMERA.length },
      { mass: DART.finMass, x: finLE + fins.root / 2, length: fins.root },
    ],
    fins: { ...fins, le: finLE },
  })
  return {
    dart,
    shape: {
      length,
      parts: [
        { kind: 'cone', from: 0, to: noseLength, r },
        { kind: 'tube', from: noseLength, to: length, r },
        { kind: 'fins', le: finLE, root: fins.root, tip: fins.tip, span: fins.span, sweep: fins.sweep, r },
        { kind: 'tube', from: cameraX - CAMERA.length / 2, to: cameraX + CAMERA.length / 2, r: r * 1.7, tone: 'camera' },
      ],
    },
  }
}

export interface TurnItem {
  id: string
  name: string
  /** Which end leads at launch, in words. */
  leading: string
  projectile: Projectile
  launch: Launch
}

const SHUTTLE_LAUNCH = { speed: 30, elevationDeg: 10, height: 1.5, duration: 0.15, timeStep: 1 / 20000 }
const ARROW_LAUNCH = { speed: 55, elevationDeg: 5, height: 1.5, duration: 1.2, timeStep: 1 / 4000 }
const DART_LAUNCH = { ...MAIN_LAUNCH, duration: 1.2 }

export const TURN_SETS: readonly (readonly TurnItem[])[] = [
  [
    { id: 'shuttle-back', name: 'A shuttlecock', leading: 'hit feathers first', projectile: SHUTTLE, launch: { ...SHUTTLE_LAUNCH, alphaDeg: 170 } },
    { id: 'arrow-front', name: 'An arrow fletched just behind its point', leading: 'point first', projectile: ARROW_FRONT_FLETCHED, launch: { ...ARROW_LAUNCH, alphaDeg: 6 } },
    { id: 'dart-mid', name: 'A dart with its fins halfway along and its weight at the nose', leading: 'nose first', projectile: rangeDart(0.05, FINS_MIDDLE), launch: DART_LAUNCH },
  ],
  [
    { id: 'arrow-back', name: 'An ordinary arrow', leading: 'loosed nock first', projectile: ARROW, launch: { ...ARROW_LAUNCH, alphaDeg: 174 } },
    { id: 'shuttle-front', name: 'A shuttlecock', leading: 'hit cork first', projectile: SHUTTLE, launch: { ...SHUTTLE_LAUNCH, alphaDeg: 10 } },
    { id: 'camera-tail', name: 'A dart carrying a camera, fins at the tail', leading: 'nose first', projectile: cameraDart(0.3, FINS_AT_TAIL), launch: DART_LAUNCH },
  ],
]

// --- Prove, puzzle 2: fin the camera dart -----------------------------------------------------

export const CAMERA_POSITIONS = [0.4, 0.25] as const
/** Gold: stable, but not so stable that it swings round into every gust. */
export const GOLD_MARGIN = { min: 1, max: 3 }
