import { STANDARD_GRAVITY } from './trajectory'

export type AtmosphereState = {
  temperature: number // K
  pressure: number // Pa
  density: number // kg/m³
  speedOfSound: number // m/s
}

export type Atmosphere = (altitude: number) => AtmosphereState

const GEOPOTENTIAL_RADIUS = 6_356_766
const AIR_GAS_CONSTANT = 287.05287
const HEAT_CAPACITY_RATIO = 1.4

function nonnegative(value: number, name: string) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be finite and nonnegative`)
}

export function geopotentialAltitude(h: number): number {
  if (!Number.isFinite(h)) throw new RangeError('altitude must be finite')
  const height = Math.max(0, h)
  return height / (1 + height / GEOPOTENTIAL_RADIUS)
}

function pressureAt(pressure: number, temperature: number, lapse: number, height: number): number {
  return lapse === 0
    ? pressure * Math.exp((-STANDARD_GRAVITY * height) / (AIR_GAS_CONSTANT * temperature))
    : pressure * ((temperature + lapse * height) / temperature) ** (-STANDARD_GRAVITY / (AIR_GAS_CONSTANT * lapse))
}

// US Standard Atmosphere 1976: geopotential layer bases and lapse rates in K/m.
const layers = [
  { height: 0, lapse: -0.0065, temperature: 288.15, pressure: 101_325 },
  { height: 11_000, lapse: 0, temperature: 0, pressure: 0 },
  { height: 20_000, lapse: 0.001, temperature: 0, pressure: 0 },
  { height: 32_000, lapse: 0.0028, temperature: 0, pressure: 0 },
  { height: 47_000, lapse: 0, temperature: 0, pressure: 0 },
  { height: 51_000, lapse: 0, temperature: 0, pressure: 0 },
]

for (let i = 1; i < layers.length; i++) {
  const below = layers[i - 1]
  const layer = layers[i]
  const height = layer.height - below.height
  layer.temperature = below.temperature + below.lapse * height
  layer.pressure = pressureAt(below.pressure, below.temperature, below.lapse, height)
}

function state(temperature: number, pressure: number, density: number): AtmosphereState {
  return { temperature, pressure, density, speedOfSound: Math.sqrt(HEAT_CAPACITY_RATIO * AIR_GAS_CONSTANT * temperature) }
}

export const standardAtmosphere: Atmosphere = (altitude) => {
  const height = geopotentialAltitude(altitude)
  let index = 0
  while (index + 1 < layers.length && height >= layers[index + 1].height) index++
  const base = layers[index]
  const delta = height - base.height
  // Above 51 km geopotential this is an approximate isothermal extrapolation.
  const temperature = base.temperature + base.lapse * delta
  const pressure = pressureAt(base.pressure, base.temperature, base.lapse, delta)
  return state(temperature, pressure, pressure / (AIR_GAS_CONSTANT * temperature))
}

export function constantAtmosphere(density: number, temperature = 288.15): Atmosphere {
  nonnegative(density, 'density')
  if (!Number.isFinite(temperature) || temperature <= 0) throw new RangeError('temperature must be finite and positive')
  const pressure = density * AIR_GAS_CONSTANT * temperature
  nonnegative(pressure, 'pressure')
  return () => state(temperature, pressure, density)
}

/** Scales standard-atmosphere pressure and density while preserving temperature and sound speed. */
export function scaledStandardAtmosphere(groundDensity: number): Atmosphere {
  nonnegative(groundDensity, 'groundDensity')
  const densityScale = groundDensity / standardAtmosphere(0).density
  return (altitude) => {
    const air = standardAtmosphere(altitude)
    return { ...air, pressure: air.pressure * densityScale, density: air.density * densityScale }
  }
}
