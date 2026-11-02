// The lesson's set-ups, in metres and seconds. Invented scenarios, not real guns:
// the numbers are chosen to read well on screen.

import { launchFromVelocity, vacuumFlightTime, vacuumRange, type LaunchParams } from '../../physics/trajectory'
import { size, type Frame } from '../../scenes/frame'

export const LESSON_ID = 'the-arc'

// Hook, Predict and Test: a cannon on a cliff fires level; a ball is dropped beside it.
export const CLIFF_HEIGHT = 40
export const FIRED: LaunchParams = { speed: 25, angleDeg: 0, height: CLIFF_HEIGHT }
export const DROPPED: LaunchParams = { speed: 0, angleDeg: 0, height: CLIFF_HEIGHT }
export const DROP_X = 1.2 // the dropped ball is held out just beyond the cannon's mouth
export const FALL_TIME = vacuumFlightTime(FIRED)
export const FIRED_RANGE = vacuumRange(FIRED)
export const STROBE = 0.5 // s between strobe marks
export const CLIFF_FRAME: Frame = { x0: -14, x1: 86, top: 50 }
export const BALL_R = size(CLIFF_FRAME, 1.1) // reads on a phone and on a desktop

// Prove, puzzle 1: a ball tossed straight up from a rolling cart, or dropped over its side.
export interface CartPuzzle {
  kind: 'toss' | 'drop'
  cartSpeed: number
  tossSpeed: number
  bed: number // height of the cart bed, where the ball starts
}
export const CART_PUZZLES: readonly CartPuzzle[] = [
  { kind: 'toss', cartSpeed: 3, tossSpeed: 6, bed: 1 },
  { kind: 'drop', cartSpeed: 4, tossSpeed: 0, bed: 1 },
]
export function cartLaunch(p: CartPuzzle): LaunchParams {
  // A toss lands back in the bed, so it is measured from the bed; a drop falls to the ground.
  return launchFromVelocity(p.cartSpeed, p.tossSpeed, p.kind === 'drop' ? p.bed : 0)
}

// Prove, puzzle 2: three shots at one speed, which lands furthest.
export interface AnglePuzzle {
  speed: number
  angles: readonly [number, number, number]
  sliderMax: number
}
export const ANGLE_PUZZLES: readonly AnglePuzzle[] = [
  { speed: 25, angles: [30, 45, 75], sliderMax: 80 },
  { speed: 20, angles: [20, 45, 60], sliderMax: 50 },
]

// Play: the shared range.
export const NEAR_FLAG = 40
export const FLAG_TOLERANCE = 1.5 // m, counts as a hit
export const FLAG_GOLD = 0.5 // m, precision medal
export const SPEED_RANGE = { min: 10, max: 35 }
export const ANGLE_RANGE = { min: 5, max: 85 }
