import { describe, expect, it } from 'vitest'
import { constantAtmosphere, geopotentialAltitude, standardAtmosphere } from './atmosphere'

function close(actual: number, reference: number, abs: number, rel: number) {
  expect(Math.abs(actual - reference)).toBeLessThanOrEqual(abs + rel * Math.abs(reference))
}

const radius = 6_356_766
const gas = 287.05287
const gravity = 9.80665
const geometric = (height: number) => radius * height / (radius - height)

describe('standardAtmosphere: acceptance 1', () => {
  it('matches the US Standard Atmosphere 1976 table at geopotential heights', () => {
    const table = [
      [0, 288.15, 101_325, 1.2250],
      [11_000, 216.65, 22_632.06, 0.363918],
      [20_000, 216.65, 5_474.889, 0.088035],
      [32_000, 228.65, 868.019, 0.013225],
      [47_000, 270.65, 110.906, 0.0014275],
    ]
    for (const [height, temperature, pressure, density] of table) {
      const actual = standardAtmosphere(geometric(height))
      close(geopotentialAltitude(geometric(height)), height, 1e-11, 1e-15)
      for (const [value, reference] of [[actual.temperature, temperature], [actual.pressure, pressure], [actual.density, density]]) {
        close(value, reference, 0, 2e-4)
      }
    }
    close(standardAtmosphere(0).speedOfSound, 340.294, 0, 2e-4)
  })

  it('joins adjacent layer formulas at the identical boundary, including 51 km', () => {
    // Hydrostatic balance and p = rho R T, evaluated independently on each side.
    const heights = [0, 11_000, 20_000, 32_000, 47_000, 51_000]
    const lapseRates = [-0.0065, 0, 0.001, 0.0028, 0, 0]
    const temperatures = [288.15, 216.65, 216.65, 228.65, 270.65, 270.65]
    const pressures = [101_325]
    const pressureInLayer = (index: number, height: number) => {
      const delta = height - heights[index]
      const lapse = lapseRates[index]
      return pressures[index] * (lapse === 0
        ? Math.exp(-gravity * delta / (gas * temperatures[index]))
        : (temperatures[index] / (temperatures[index] + lapse * delta)) ** (gravity / (gas * lapse)))
    }
    for (let i = 1; i < heights.length; i++) pressures.push(pressureInLayer(i - 1, heights[i]))
    let maxRelativeDiscontinuity = 0
    for (let i = 1; i < heights.length; i++) {
      const boundary = heights[i]
      const below = {
        temperature: temperatures[i - 1] + lapseRates[i - 1] * (boundary - heights[i - 1]),
        pressure: pressureInLayer(i - 1, boundary),
      }
      const above = { temperature: temperatures[i], pressure: pressureInLayer(i, boundary) }
      const actual = standardAtmosphere(geometric(boundary))
      const pairs = [
        [below.temperature, above.temperature, actual.temperature],
        [below.pressure, above.pressure, actual.pressure],
        [below.pressure / (gas * below.temperature), above.pressure / (gas * above.temperature), actual.density],
        [Math.sqrt(1.4 * gas * below.temperature), Math.sqrt(1.4 * gas * above.temperature), actual.speedOfSound],
      ]
      for (const [left, right, value] of pairs) {
        close(left, right, 0, 1e-12)
        close(value, right, 0, 1e-12)
        maxRelativeDiscontinuity = Math.max(maxRelativeDiscontinuity, Math.abs(left - right) / right, Math.abs(value - right) / right)
      }
    }
  })

  it('clamps below sea level and extrapolates isothermally above 51 km', () => {
    expect(standardAtmosphere(-100)).toEqual(standardAtmosphere(0))
    let previous = standardAtmosphere(geometric(51_000)).density
    for (const height of [60_000, 80_000, 100_000, 200_000]) {
      const actual = standardAtmosphere(geometric(height))
      close(actual.temperature, 270.65, 1e-12, 0)
      expect(Number.isFinite(actual.density)).toBe(true)
      expect(actual.density).toBeGreaterThan(0)
      expect(actual.density).toBeLessThan(previous)
      previous = actual.density
    }
  })
})

describe('constantAtmosphere and input checks', () => {
  it('keeps density and temperature fixed, with ideal-gas pressure and sound speed', () => {
    const air = constantAtmosphere(1.225)
    expect(air(40_000)).toEqual(air(0))
    close(air(0).temperature, 288.15, 0, 0)
    close(air(0).pressure, 1.225 * gas * 288.15, 0, 1e-15)
    close(air(0).speedOfSound, Math.sqrt(1.4 * gas * 288.15), 0, 1e-15)
    const vacuum = constantAtmosphere(0, 216.65)(0)
    expect(vacuum.density).toBe(0)
    expect(vacuum.pressure).toBe(0)
    expect(vacuum.speedOfSound).toBeGreaterThan(0)
  })

  it('rejects nonfinite altitude and nonphysical constant atmospheres', () => {
    for (const altitude of [NaN, Infinity, -Infinity]) {
      expect(() => geopotentialAltitude(altitude)).toThrow(RangeError)
      expect(() => standardAtmosphere(altitude)).toThrow(RangeError)
    }
    for (const density of [-1, NaN, Infinity]) expect(() => constantAtmosphere(density)).toThrow(RangeError)
    for (const temperature of [0, -1, NaN, Infinity]) expect(() => constantAtmosphere(1, temperature)).toThrow(RangeError)
  })
})
