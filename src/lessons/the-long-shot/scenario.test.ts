import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SideProfile } from './SideProfile'
import { ShotResult } from './Play'
import { TargetMap } from './TargetMap'
import {
  clampFlightTime,
  DEFAULT_SETTINGS,
  fire,
  flightSampleIndex,
  G7_POINTS,
  GUN,
  missDistance,
  predictionOutcome,
  practiceSettings,
  PREDICT_DISTANCE,
  PREDICT_SETTINGS,
  PROVE_MARKERS,
  settingsForMarker,
  stillEarth,
} from './scenario'

// Static view tests do not use the browser-only progress singleton imported by the kit.
vi.mock('../../book/useProgress', () => ({ progressStore: {}, useProgress: () => ({ version: 1, lessons: {} }) }))

describe('long-shot view bounds', () => {
  it('clamps stale, negative and nonfinite playback times to the current flight', () => {
    expect(clampFlightTime(181, 120)).toBe(120)
    expect(clampFlightTime(-1, 120)).toBe(0)
    expect(clampFlightTime(NaN, 120)).toBe(0)
    expect(clampFlightTime(Infinity, 120)).toBe(120)
    expect(clampFlightTime(-Infinity, 120)).toBe(0)
    expect(clampFlightTime(6.5, 120)).toBe(6.5)
    for (const duration of [0, -1, NaN, Infinity]) {
      expect(clampFlightTime(181, duration)).toBe(0)
    }
  })

  it('keeps sample indices in range, including a single sample and zero duration', () => {
    expect(flightSampleIndex(181, 120, 241)).toBe(240)
    expect(flightSampleIndex(60, 120, 241)).toBe(120)
    for (const t of [-1, 0, 181, NaN, Infinity, -Infinity]) {
      const index = flightSampleIndex(t, 120, 241)
      expect(Number.isInteger(index)).toBe(true)
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(241)
      expect(flightSampleIndex(t, 0, 1)).toBe(0)
      expect(flightSampleIndex(t, 0, 0)).toBe(-1)
    }
  })

  it('renders a shortened flight safely with an old clock or no usable samples', () => {
    const shot = fire({ ...DEFAULT_SETTINGS, thinAir: false })
    for (const t of [-1, NaN, Infinity, 181]) {
      expect(() => renderToStaticMarkup(createElement(SideProfile, { shot, t }))).not.toThrow()
    }
    const zero = { ...shot, flight: { ...shot.flight, flightTime: 0, samples: [shot.flight.samples[0]] } }
    expect(() => renderToStaticMarkup(createElement(SideProfile, { shot: zero, t: 181 }))).not.toThrow()
    const empty = { ...zero, flight: { ...zero.flight, samples: [] } }
    expect(renderToStaticMarkup(createElement(SideProfile, { shot: empty }))).toContain('No flight samples available.')
  })

  it('withholds the landing marker and result when playback starts', () => {
    const shot = fire(DEFAULT_SETTINGS)
    const markup = renderToStaticMarkup(createElement(ShotResult, { shot, distance: 120_000 }))
    expect(markup).toContain('0.0 s into a')
    expect(markup).not.toContain('Came down')
    expect(markup).not.toContain('>Landed<')
  })

  it('ignores nonfinite map points rather than drawing invalid SVG coordinates', () => {
    const markup = renderToStaticMarkup(createElement(TargetMap, {
      distance: 120_000,
      landing: { range: NaN, drift: 0 },
      ghost: { range: 120_000, drift: Infinity },
    }))
    expect(markup).not.toContain('NaN')
    expect(markup).not.toContain('Infinity')
    expect(markup).not.toContain('>Landed<')
  })
})

describe('The Long Shot scenario', () => {
  it('uses the historical shell and the complete unscaled G7 reference table', () => {
    expect(GUN).toMatchObject({ mass: 106, diameter: 0.210, speed: 1640, elevation: 50, latitude: 49.5, azimuth: 232 })
    expect(G7_POINTS).toHaveLength(15)
    expect(G7_POINTS[0]).toEqual([0.5, 0.1194])
    expect(G7_POINTS.at(-1)).toEqual([5, 0.1618])

    const historical = fire(DEFAULT_SETTINGS)
    expect(historical.flight.landed).toBe(true)
    expect(Math.abs(historical.range - 120_317)).toBeLessThan(120_317 * 0.05)
    expect(historical.flight.flightTime).toBeGreaterThan(170)
    expect(historical.apexHeight).toBeGreaterThan(38_000)
    expect(historical.apexHeight).toBeLessThan(41_000)
  })

  it('projects aim into right-positive target-line coordinates and reproduces the prediction shot', () => {
    const still = stillEarth(PREDICT_SETTINGS)
    const rotating = fire({ ...PREDICT_SETTINGS, rotation: true })
    expect(missDistance(still, PREDICT_DISTANCE)).toBeLessThan(1)
    expect(rotating.drift).toBeGreaterThan(300)

    const aimedRight = fire({ ...DEFAULT_SETTINGS, aim: 1, rotation: false, wind: 0 })
    expect(aimedRight.drift).toBeGreaterThan(0)
  })

  it('Coriolis deflects right in the northern hemisphere and left in the southern hemisphere', () => {
    const north = fire({ ...DEFAULT_SETTINGS, wind: 0, latitude: 49.5 })
    const south = fire({ ...DEFAULT_SETTINGS, wind: 0, latitude: -49.5 })
    expect(north.drift).toBeGreaterThan(0)
    expect(south.drift).toBeLessThan(0)
  })

  it('sea-level air everywhere shortens the historical range by more than half', () => {
    const normal = fire({ ...DEFAULT_SETTINGS, rotation: false })
    const denseAir = fire({ ...DEFAULT_SETTINGS, thinAir: false, rotation: false })
    expect(denseAir.range).toBeLessThan(normal.range / 2)
  })

  it('has slider-grid solutions for each marker and its reversed-wind variant', () => {
    expect(PROVE_MARKERS).toHaveLength(3)
    for (const marker of PROVE_MARKERS) {
      for (const variant of [false, true]) {
        const settings = settingsForMarker(marker, variant)
        const shot = fire(settings)
        expect(settings.elevation * 20).toBeCloseTo(Math.round(settings.elevation * 20), 10)
        expect(settings.aim * 50).toBeCloseTo(Math.round(settings.aim * 50), 10)
        expect(missDistance(shot, marker.distance), `${marker.id} variant=${variant}`).toBeLessThan(300)
      }
    }
  })

  it('keeps the first eight Show Me practice generations solvable with distinct winds', () => {
    for (const marker of PROVE_MARKERS) {
      const winds = new Set<number>()
      for (let generation = 0; generation < 8; generation++) {
        const practice = practiceSettings(marker, generation)
        const shot = fire(practice.settings)
        expect(practice.solution).toEqual({ elevation: practice.settings.elevation, aim: practice.settings.aim })
        expect(practice.settings.elevation * 20).toBeCloseTo(Math.round(practice.settings.elevation * 20), 10)
        expect(practice.settings.aim * 50).toBeCloseTo(Math.round(practice.settings.aim * 50), 10)
        expect(missDistance(shot, marker.distance), `${marker.id} generation=${generation}`).toBeLessThan(300)
        expect(winds.has(practice.settings.wind)).toBe(false)
        winds.add(practice.settings.wind)
        if (marker.id === 'earth-rotation' && generation === 0) {
          expect(missDistance(shot, marker.distance)).toBeLessThanOrEqual(100)
        }
      }
    }
  })

  it('misses with straight aim on shot three and its selected solution earns gold', () => {
    const marker = PROVE_MARKERS.find(({ id }) => id === 'earth-rotation')!
    const straight = fire({ ...settingsForMarker(marker), aim: 0 })
    const solved = fire(settingsForMarker(marker))
    expect(missDistance(straight, marker.distance)).toBeGreaterThan(300)
    expect(missDistance(solved, marker.distance)).toBeLessThanOrEqual(100)
  })

  it('requires elevation above 45 degrees for the high-altitude marker', () => {
    const marker = PROVE_MARKERS.find(({ id }) => id === 'thin-air')!
    const forty = fire({ ...settingsForMarker(marker), elevation: 40, aim: 0 })
    expect(marker.distance - forty.range).toBeGreaterThan(2_000)

    let longestAtOrBelow45 = -Infinity
    let previousRange = -Infinity
    for (let elevation = 30; elevation <= 45; elevation += 0.05) {
      const shot = fire({ ...settingsForMarker(marker), elevation, aim: 0 }, 0.05)
      longestAtOrBelow45 = Math.max(longestAtOrBelow45, shot.range)
      expect(shot.range).toBeGreaterThan(previousRange)
      previousRange = shot.range
    }
    expect(longestAtOrBelow45).toBeLessThan(marker.distance - 300)
    for (const aim of [-2, 2]) {
      const edgeAim = fire({ ...settingsForMarker(marker), elevation: 45, aim }, 0.05)
      expect(missDistance(edgeAim, marker.distance)).toBeGreaterThan(300)
    }
  })

  it('classifies the prediction around the marker and the right side of the firing line', () => {
    expect(predictionOutcome({ range: PREDICT_DISTANCE, drift: 0 })).toBe('myth')
    expect(predictionOutcome({ range: PREDICT_DISTANCE - 10_000, drift: 301 })).toBe('matched')
    expect(predictionOutcome({ range: PREDICT_DISTANCE - 10_000, drift: -301 })).toBe('other')
    expect(predictionOutcome({ range: PREDICT_DISTANCE + 400, drift: 0 })).toBe('other')
  })

  it('keeps the 0.05 s integration within 50 m of a 0.005 s reference', () => {
    const settings = { ...DEFAULT_SETTINGS, aim: -0.4, wind: 12 }
    const coarse = fire(settings, 0.05)
    const fine = fire(settings, 0.005)
    expect(Math.hypot(coarse.range - fine.range, coarse.drift - fine.drift)).toBeLessThan(50)
  })
})
