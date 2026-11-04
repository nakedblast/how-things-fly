// The launch angle that carries furthest over level ground, for a given speed, projectile and air.

import { simulateFlight, type FlightParams } from './flight'

export type BestAngle = {
  angleDeg: number
  range: number // m, at that angle
}

const GOLDEN = (Math.sqrt(5) - 1) / 2

// Range is a single-peaked function of the launch angle, so a golden-section search finds the
// peak; `tolerance` is in degrees.
export function bestAngle(params: Omit<FlightParams, 'angleDeg'>, tolerance = 0.01): BestAngle {
  const range = (angleDeg: number) => simulateFlight({ ...params, angleDeg }).range
  let lo = 1
  let hi = 89
  let a = hi - GOLDEN * (hi - lo)
  let b = lo + GOLDEN * (hi - lo)
  let ra = range(a)
  let rb = range(b)
  while (hi - lo > tolerance) {
    if (ra > rb) {
      hi = b
      b = a
      rb = ra
      a = hi - GOLDEN * (hi - lo)
      ra = range(a)
    } else {
      lo = a
      a = b
      ra = rb
      b = lo + GOLDEN * (hi - lo)
      rb = range(b)
    }
  }
  const angleDeg = (lo + hi) / 2
  return { angleDeg, range: range(angleDeg) }
}
