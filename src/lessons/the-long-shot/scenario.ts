import { constantAtmosphere, standardAtmosphere } from '../../physics/atmosphere'
import { dragTable, simulateFlight3D, type Flight3D } from '../../physics/flight3d'

export const LESSON_ID = 'the-long-shot'

/** Bound a view's clock even during a flight replacement or a zero-duration flight. */
export function clampFlightTime(t: number, flightTime: number): number {
  const end = Number.isFinite(flightTime) ? Math.max(0, flightTime) : 0
  return Number.isNaN(t) ? 0 : Math.max(0, Math.min(t, end))
}

/** Returns -1 for an empty flight; otherwise always returns a valid sample index. */
export function flightSampleIndex(t: number, flightTime: number, sampleCount: number): number {
  const last = sampleCount - 1
  if (last < 0) return -1
  const elapsed = clampFlightTime(t, flightTime)
  const index = flightTime > 0 ? Math.floor(elapsed / flightTime * last) : 0
  return Math.max(0, Math.min(last, index))
}

// Reduced, unscaled samples from the BRL G7 reference table (form factor 1).
export const G7_POINTS = [
  [0.5, 0.1194], [0.8, 0.1242], [0.9, 0.1464], [0.95, 0.2054],
  [0.975, 0.2993], [1, 0.3803], [1.05, 0.4043], [1.2, 0.3884],
  [1.5, 0.344], [2, 0.298], [2.5, 0.2697], [3, 0.2424],
  [3.5, 0.2154], [4, 0.1935], [5, 0.1618],
] as const

const g7 = dragTable(G7_POINTS)
const EARTH_RADIUS = 6_371_000
const GUN_AZIMUTH = 232

export const GUN = {
  mass: 106,
  diameter: 0.210,
  speed: 1640,
  elevation: 50,
  latitude: 49.5,
  azimuth: GUN_AZIMUTH,
  drag: g7,
} as const

export type ShotSettings = {
  elevation: number
  aim: number
  wind: number
  /** Wind direction relative to the fixed target line: 0 is downrange, +90 is right. */
  windDirection?: number
  /** Use the standard atmosphere when true; use sea-level air everywhere when false. */
  thinAir: boolean
  rotation: boolean
  latitude: number
}

export const DEFAULT_SETTINGS: ShotSettings = {
  elevation: GUN.elevation,
  aim: 0,
  wind: 0,
  thinAir: true,
  rotation: true,
  latitude: GUN.latitude,
}

export type LongShot = {
  flight: Flight3D
  settings: ShotSettings
  /** Downrange distance projected onto the original gun/target line, in metres. */
  range: number
  /** Right-positive displacement from the original gun/target line, in metres. */
  drift: number
  apexHeight: number
}

const radians = (degrees: number) => degrees * Math.PI / 180

export function fire(settings: ShotSettings, timeStep = 0.05): LongShot {
  const aim = radians(settings.aim)
  const windDirection = radians(settings.windDirection ?? 90)
  // Convert the wind from the fixed target-line frame into the aimed launch frame.
  const relativeWindDirection = windDirection - aim
  const flight = simulateFlight3D({
    launch: { speed: GUN.speed, elevationDeg: settings.elevation },
    projectile: { mass: GUN.mass, diameter: GUN.diameter, drag: GUN.drag },
    environment: {
      atmosphere: settings.thinAir
        ? standardAtmosphere
        : constantAtmosphere(standardAtmosphere(0).density),
      wind: {
        x: settings.wind * Math.cos(relativeWindDirection),
        y: 0,
        z: settings.wind * Math.sin(relativeWindDirection),
      },
      earthRotation: settings.rotation
        ? { latitudeDeg: settings.latitude, azimuthDeg: GUN_AZIMUTH + settings.aim }
        : undefined,
      curvedEarth: true,
    },
    timeStep,
  })

  // Flight3D reports range/drift in the aimed frame. Rotate the impact back onto
  // the fixed range map so a positive aim always moves the shot to the right.
  const range = flight.range * Math.cos(aim) - flight.drift * Math.sin(aim)
  const drift = flight.range * Math.sin(aim) + flight.drift * Math.cos(aim)
  const p = flight.apex.pos
  const apexHeight = Math.hypot(p.x, p.y + EARTH_RADIUS, p.z) - EARTH_RADIUS
  return { flight, settings: { ...settings }, range, drift, apexHeight }
}

/** Re-run an otherwise identical shot with a still Earth. */
export function stillEarth(settings: ShotSettings = DEFAULT_SETTINGS, timeStep = 0.05): LongShot {
  return fire({ ...settings, rotation: false }, timeStep)
}

export type Marker = {
  id: string
  title: string
  distance: number
  wind: number
  rotation: boolean
  latitude: number
  solution: { elevation: number; aim: number }
  variantSolution: { elevation: number; aim: number }
}

export function settingsForMarker(marker: Marker, variant = false): ShotSettings {
  const solution = variant ? marker.variantSolution : marker.solution
  return {
    elevation: solution.elevation,
    aim: solution.aim,
    wind: variant ? -marker.wind : marker.wind,
    windDirection: 90,
    thinAir: true,
    rotation: marker.rotation,
    latitude: marker.latitude,
  }
}

/** Pick fresh slider settings for each Show Me replay without reusing a wind. */
export function practiceSettings(
  marker: Marker,
  generation: number,
): { settings: ShotSettings; solution: { elevation: number; aim: number } } {
  if (!Number.isInteger(generation) || generation < 0) {
    throw new RangeError('generation must be a nonnegative integer')
  }
  if (generation === 0) {
    const settings = settingsForMarker(marker)
    return { settings, solution: { elevation: settings.elevation, aim: settings.aim } }
  }
  if (generation === 1) {
    const settings = settingsForMarker(marker, true)
    return { settings, solution: { elevation: settings.elevation, aim: settings.aim } }
  }

  const windMagnitude = 10 + 2 / generation
  const wind = (generation % 2 === 0 ? 1 : -1) * windMagnitude
  // Interpolate the two proven endpoint solutions from +12 to -12 m/s.
  const amount = (12 - wind) / 24
  const elevation = Math.round((marker.solution.elevation
    + (marker.variantSolution.elevation - marker.solution.elevation) * amount) * 20) / 20
  const aim = Math.round((marker.solution.aim
    + (marker.variantSolution.aim - marker.solution.aim) * amount) * 50) / 50
  const settings = { ...settingsForMarker(marker), elevation, aim, wind }
  return { settings, solution: { elevation, aim } }
}

// Slider-grid solutions are filled from the scenario runs and kept as data so
// every learner receives stable, reproducible target settings.
export const PROVE_MARKERS: readonly Marker[] = [
  {
    id: 'wind',
    title: 'Crosswind marker',
    distance: 70_000,
    wind: 12,
    rotation: false,
    latitude: GUN.latitude,
    solution: { elevation: 30.2, aim: -0.60 },
    variantSolution: { elevation: 30.2, aim: 0.60 },
  },
  {
    id: 'thin-air',
    title: 'High-altitude marker',
    distance: 122_400,
    wind: 12,
    rotation: false,
    latitude: GUN.latitude,
    solution: { elevation: 52.75, aim: -0.38 },
    variantSolution: { elevation: 52.75, aim: 0.38 },
  },
  {
    id: 'earth-rotation',
    title: 'Final qualification marker',
    distance: 120_000,
    wind: 12,
    rotation: true,
    latitude: GUN.latitude,
    solution: { elevation: 49.75, aim: -1.04 },
    variantSolution: { elevation: 49.70, aim: -0.28 },
  },
]

export const PREDICT_DISTANCE = 120_000
export const PREDICT_SETTINGS: ShotSettings = {
  elevation: 49.37338423868641,
  aim: 0,
  wind: 0,
  thinAir: true,
  rotation: true,
  latitude: GUN.latitude,
}

export function missDistance(shot: Pick<LongShot, 'range' | 'drift'>, markerDistance: number): number {
  return Math.hypot(shot.range - markerDistance, shot.drift)
}

export type PredictionOutcome = 'myth' | 'matched' | 'other'
export function predictionOutcome(
  shot: { range: number; drift: number },
  distance = PREDICT_DISTANCE,
): PredictionOutcome {
  if (missDistance(shot, distance) <= 300) return 'myth'
  if (shot.drift > 300) return 'matched'
  return 'other'
}
