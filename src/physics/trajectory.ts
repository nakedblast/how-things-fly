// Renderer-independent projectile physics. SI units throughout; +y is up.

export type Vec2 = { x: number; y: number }

export type LaunchParams = {
  speed: number // m/s
  angleDeg: number // above horizontal
  gravity?: number // m/s², defaults to standard gravity
}

export const STANDARD_GRAVITY = 9.80665

export type Sample = { t: number; pos: Vec2 }

function components(p: LaunchParams) {
  const a = (p.angleDeg * Math.PI) / 180
  return { vx: p.speed * Math.cos(a), vy: p.speed * Math.sin(a), g: p.gravity ?? STANDARD_GRAVITY }
}

// Time to return to launch height.
export function vacuumFlightTime(p: LaunchParams): number {
  const { vy, g } = components(p)
  return (2 * vy) / g
}

// Position at time t, clamped to the flight (before launch it sits at the origin,
// after landing it rests at the landing point).
export function vacuumPositionAt(p: LaunchParams, t: number): Vec2 {
  const { vx, vy, g } = components(p)
  const tc = Math.min(Math.max(t, 0), vacuumFlightTime(p))
  return { x: vx * tc, y: vy * tc - 0.5 * g * tc * tc }
}

// Vacuum trajectory sampled from launch until it returns to launch height.
export function vacuumTrajectory(p: LaunchParams, steps = 64): Sample[] {
  const flightTime = vacuumFlightTime(p)
  const samples: Sample[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (flightTime * i) / steps
    samples.push({ t, pos: vacuumPositionAt(p, t) })
  }
  return samples
}

export function vacuumRange(p: LaunchParams): number {
  const { g } = components(p)
  return (p.speed * p.speed * Math.sin((2 * p.angleDeg * Math.PI) / 180)) / g
}

export function vacuumApexHeight(p: LaunchParams): number {
  const { vy, g } = components(p)
  return (vy * vy) / (2 * g)
}
