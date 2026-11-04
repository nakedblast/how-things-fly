import { describe, expect, it } from 'vitest'
import { findEventStep, rk4Step, type Derivative } from './ode'

// Harmonic oscillator y'' = −y as [y, y']: exact solution y = cos t from (1, 0).
const oscillator: Derivative = (_t, [y, v]) => [v, -y]

describe('rk4Step', () => {
  it('integrates the harmonic oscillator at fourth order', () => {
    const run = (h: number) => {
      let y: number[] = [1, 0]
      const n = Math.round(2 / h)
      for (let i = 0; i < n; i++) y = rk4Step(oscillator, i * h, y, h)
      return Math.abs(y[0] - Math.cos(2))
    }
    const ratio = run(0.1) / run(0.05)
    expect(ratio).toBeGreaterThan(14)
    expect(ratio).toBeLessThan(18)
    expect(run(0.01)).toBeLessThan(1e-9)
  })

  it('passes time to the derivative', () => {
    // y' = t from y(0) = 0 is exact for RK4: y = t²/2.
    const y = rk4Step((t) => [t], 1, [0.5], 0.5)
    expect(y[0]).toBeCloseTo(1.125, 15)
  })
})

describe('findEventStep', () => {
  it('finds the zero crossing of the step itself', () => {
    const y0 = [1, 0]
    const hMax = 2
    const step = (h: number) => rk4Step(oscillator, 0, y0, h)
    const h = findEventStep(step, (y) => y[0], hMax)
    // The single-step RK4 polynomial 1 − h²/2 + h⁴/24 vanishes at h² = 6 − 2√3.
    expect(h).toBeCloseTo(Math.sqrt(6 - 2 * Math.sqrt(3)), 12)
  })

  it('returns hMax when there is no sign change', () => {
    const step = (h: number) => [1 + h]
    expect(findEventStep(step, (y) => y[0], 0.5)).toBe(0.5)
  })
})
