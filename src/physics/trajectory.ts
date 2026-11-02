// Renderer-independent projectile physics. SI units throughout; +y is up.

export type Vec2 = { x: number; y: number }

export type LaunchParams = {
  speed: number // m/s
  angleDeg: number // above horizontal
  gravity?: number // m/s², defaults to standard gravity
  height?: number // m above the ground (y = 0) at launch, defaults to 0
}

export const STANDARD_GRAVITY = 9.80665

export type Sample = { t: number; pos: Vec2 }

function components(p: LaunchParams) {
  const a = (p.angleDeg * Math.PI) / 180
  return {
    vx: p.speed * Math.cos(a),
    vy: p.speed * Math.sin(a),
    g: p.gravity ?? STANDARD_GRAVITY,
    h: p.height ?? 0,
  }
}

// Launch parameters for a given velocity, e.g. a ball tossed from a moving cart.
export function launchFromVelocity(vx: number, vy: number, height = 0): LaunchParams {
  return { speed: Math.hypot(vx, vy), angleDeg: (Math.atan2(vy, vx) * 180) / Math.PI, height }
}

// Time to reach the ground (launch height when launched from the ground).
export function vacuumFlightTime(p: LaunchParams): number {
  const { vy, g, h } = components(p)
  return (vy + Math.sqrt(vy * vy + 2 * g * h)) / g
}

// Position at time t, clamped to the flight (before launch it sits at the launch point,
// after landing it rests at the landing point).
export function vacuumPositionAt(p: LaunchParams, t: number): Vec2 {
  const { vx, vy, g, h } = components(p)
  const tc = Math.min(Math.max(t, 0), vacuumFlightTime(p))
  return { x: vx * tc, y: h + vy * tc - 0.5 * g * tc * tc }
}

// Vacuum trajectory sampled from launch until it reaches the ground.
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
  return components(p).vx * vacuumFlightTime(p)
}

export function vacuumApexHeight(p: LaunchParams): number {
  const { vy, g, h } = components(p)
  return h + (Math.max(vy, 0) * Math.max(vy, 0)) / (2 * g)
}

// Height when the ball is x metres downrange, or null if it lands before getting there.
export function vacuumHeightAt(p: LaunchParams, x: number): number | null {
  const { vx } = components(p)
  if (vx <= 0 || x > vacuumRange(p)) return null
  return vacuumPositionAt(p, x / vx).y
}
