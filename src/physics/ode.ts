// Shared ODE tools: classical RK4 over a flat state array, and an event finder
// that locates where a scalar function of the state crosses zero within a step.

export type Derivative = (t: number, y: readonly number[]) => number[]

export function rk4Step(f: Derivative, t: number, y: readonly number[], h: number): number[] {
  const n = y.length
  const k1 = f(t, y)
  const y2 = new Array<number>(n)
  for (let i = 0; i < n; i++) y2[i] = y[i] + (h / 2) * k1[i]
  const k2 = f(t + h / 2, y2)
  const y3 = new Array<number>(n)
  for (let i = 0; i < n; i++) y3[i] = y[i] + (h / 2) * k2[i]
  const k3 = f(t + h / 2, y3)
  const y4 = new Array<number>(n)
  for (let i = 0; i < n; i++) y4[i] = y[i] + h * k3[i]
  const k4 = f(t + h, y4)
  const out = new Array<number>(n)
  for (let i = 0; i < n; i++) out[i] = y[i] + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
  return out
}

// Sub-step h in [0, hMax] at which g(step(h)) = 0, given that g(step(0)) and
// g(step(hMax)) have opposite signs (or the end value is zero). Uses the Illinois
// variant of regula falsi on the integrator's own step, so event points carry the
// integrator's accuracy; falls back to the bracket end if the signs do not differ.
export function findEventStep(
  step: (h: number) => readonly number[],
  g: (y: readonly number[]) => number,
  hMax: number,
  g0 = g(step(0)),
): number {
  let a = 0
  let b = hMax
  let ga = g0
  let gb = g(step(hMax))
  if (gb === 0) return hMax
  if (ga === 0) return 0
  if (Math.sign(ga) === Math.sign(gb)) return hMax
  let side = 0
  const tol = 1e-13 * hMax
  for (let i = 0; i < 100 && b - a > tol; i++) {
    const c = (a * gb - b * ga) / (gb - ga)
    const gc = g(step(c))
    if (gc === 0) return c
    if (Math.sign(gc) === Math.sign(gb)) {
      b = c
      gb = gc
      if (side === -1) ga /= 2
      side = -1
    } else {
      a = c
      ga = gc
      if (side === 1) gb /= 2
      side = 1
    }
  }
  return Math.abs(ga) < Math.abs(gb) ? a : b
}
