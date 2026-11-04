// The lesson's set-ups, in metres and seconds. The balls are real (sizes and masses cited in the
// sources list); the launches are invented to read well on screen.

import { standardAtmosphere } from '../../physics/atmosphere'
import { bestAngle } from '../../physics/bestAngle'
import { SEA_LEVEL_AIR_DENSITY, simulateFlight, type Flight, type Projectile } from '../../physics/flight'
import { dragPath, type FlightPath } from '../../physics/path'
import { vacuumRange } from '../../physics/trajectory'
import type { PredictionOutcome } from '../../book/progress'
import type { Frame } from '../../scenes/frame'

export const LESSON_ID = 'air-fights-back'

// A smooth sphere, as in the proving ground (NASA Glenn, "Shape Effects on Drag").
export const SPHERE_CD = 0.47

// ITF: 56.0–59.4 g, 6.54–6.86 cm; the middle of each range.
export const TENNIS_BALL: Projectile = { mass: 0.0577, diameter: 0.067, dragCoefficient: SPHERE_CD }
// ITTF Law 2.3: 40 mm, 2.7 g.
export const TABLE_TENNIS_BALL: Projectile = { mass: 0.0027, diameter: 0.04, dragCoefficient: SPHERE_CD }
// The proving ground's range ball: baseball size (MLB Rule 3.01).
export const RANGE_BALL: Projectile = { mass: 0.145, diameter: 0.074, dragCoefficient: SPHERE_CD }

/** A flight split at its highest point, which is what this lesson is about. */
export interface Shot {
  speed: number
  angleDeg: number
  flight: Flight
  path: FlightPath
  apexX: number
  apexY: number
  apexTime: number
  /** Where the ball would land if the way down mirrored the way up. */
  mirrorX: number
  range: number
  /** Speed at the top, all of it forwards. */
  apexSpeed: number
  /** Angle below the horizontal at landing, degrees. */
  impactAngleDeg: number
  impactSpeed: number
}

export function makeShot(projectile: Projectile, speed: number, angleDeg: number, density = SEA_LEVEL_AIR_DENSITY): Shot {
  const params = { speed, angleDeg, projectile, air: { density } }
  const flight = simulateFlight(params)
  const last = flight.samples[flight.samples.length - 1]
  return {
    speed,
    angleDeg,
    flight,
    path: dragPath(params),
    apexX: flight.apex.pos.x,
    apexY: flight.apex.pos.y,
    apexTime: flight.apex.t,
    mirrorX: 2 * flight.apex.pos.x,
    range: flight.range,
    apexSpeed: Math.hypot(flight.apex.vel.x, flight.apex.vel.y),
    impactAngleDeg: (Math.atan2(-last.vel.y, last.vel.x) * 180) / Math.PI,
    impactSpeed: flight.impactSpeed,
  }
}

// Hook, Predict and Test: a ball machine fires a tennis ball at 30 m/s, 45° up.
export const MAIN = makeShot(TENNIS_BALL, 30, 45)
export const MAIN_VACUUM_RANGE = vacuumRange({ speed: 30, angleDeg: 45 })
export const STROBE = 0.25 // s between strobe marks
/** A marker this far or more short of the mirror point counts as "it comes down short". */
export const SHORT_MARGIN = 2
export const MARKER_MAX = 62
export const MAIN_FRAME: Frame = { x0: -4, x1: MARKER_MAX + 4, top: 20 }

/** A marker clearly short of the mirror point saw that air shortens the way down; anything else is the myth. */
export function landingOutcome(x: number): PredictionOutcome {
  return x <= MAIN.mirrorX - SHORT_MARGIN ? 'matched' : 'myth'
}

// Play: the range ball.
export const PLAY_SPEED_RANGE = { min: 10, max: 60 }
export const PLAY_ANGLE_RANGE = { min: 5, max: 85 }
export const PLAY_DENSITY_RANGE = { min: 0, max: 1.5, step: 0.005 }
export const BEST_ANGLE_SPEED = 50
/** Denver: one mile (1609 m) up; air density there on a standard day. */
export const DENVER_ALTITUDE = 1609.344
export const DENVER_DENSITY = Math.round(standardAtmosphere(DENVER_ALTITUDE).density * 1000) / 1000
export const DENSITY_TOLERANCE = 0.02

// Prove, puzzle 1: another ball's way up; where does it land?
export interface LandingPuzzle {
  name: string
  projectile: Projectile
  speed: number
  angleDeg: number
  /** Marker slider step and furthest value, metres. */
  step: number
  max: number
}
export const LANDING_PUZZLES: readonly LandingPuzzle[] = [
  { name: 'A table-tennis ball, lobbed high', projectile: TABLE_TENNIS_BALL, speed: 12, angleDeg: 50, step: 0.1, max: 10 },
  { name: 'The range ball, fired hard', projectile: RANGE_BALL, speed: 50, angleDeg: 50, step: 1, max: 160 },
]

// Prove, puzzle 2: the best angle at a slow and a fast speed.
export interface AnglePair {
  slow: number
  fast: number
}
export const ANGLE_PAIRS: readonly AnglePair[] = [
  { slow: 10, fast: 60 },
  { slow: 20, fast: 50 },
]
/** A chosen angle passes if its range is within this fraction of the best range. */
export const ANGLE_RANGE_TOLERANCE = 0.02
export const ANGLE_GOLD = 1.5 // degrees

const bestCache = new Map<string, { angleDeg: number; range: number }>()
export function rangeBallBest(speed: number, density = SEA_LEVEL_AIR_DENSITY) {
  const key = `${speed}:${density}`
  let best = bestCache.get(key)
  if (!best) {
    best = bestAngle({ speed, projectile: RANGE_BALL, air: { density } })
    bestCache.set(key, best)
  }
  return best
}

export function rangeBallRange(speed: number, angleDeg: number, density = SEA_LEVEL_AIR_DENSITY): number {
  return simulateFlight({ speed, angleDeg, projectile: RANGE_BALL, air: { density } }).range
}
