import { describe, expect, it } from 'vitest'
import { barrowman, simulateDart, staticMargin, type Dart, type DartParams, type FinSet } from './dart'
import { STANDARD_GRAVITY } from './trajectory'

function close(actual: number, reference: number, abs: number, rel: number): void {
  expect(Math.abs(actual - reference)).toBeLessThanOrEqual(abs + rel * Math.abs(reference))
}

// Lawn-dart-sized oscillator fixture from check 7, not a measured product.
const oscillatorDart: Dart = {
  mass: 0.5, diameter: 0.03, pitchInertia: 0.01, xcg: 0.25,
  aero: { cnAlpha: 10, xcp: 0.35, cd0: 0, cdAlpha2: 0, cmq: -20 },
}

describe('small-angle pitch closed form (check 7)', () => {
  const speed = 30
  const density = 1.225
  const alpha0 = 0.005
  const q0 = 0
  const { mass, diameter, pitchInertia: inertia, xcg, aero } = oscillatorDart
  const pressureArea = 0.5 * density * speed ** 2 * Math.PI * diameter ** 2 / 4
  const liftAlpha = pressureArea * aero.cnAlpha
  const momentAlpha = -liftAlpha * (aero.xcp - xcg)
  const momentQ = pressureArea * diameter * aero.cmq * diameter / (2 * speed)
  const pathRate = liftAlpha / (mass * speed)
  const alphaDot0 = q0 - pathRate * alpha0
  const decay = (pathRate - momentQ / inertia) / 2
  const stiffness = -momentAlpha / inertia - momentQ * pathRate / inertia
  const frequency = Math.sqrt(stiffness - decay ** 2)
  const period = 2 * Math.PI / frequency
  // alpha'' + 2 decay alpha' + stiffness alpha = 0, with alpha(0) = alpha0
  // and alpha'(0) = q0 - L_alpha alpha0/(mV). This is independent of RK4.
  const exact = (t: number) => Math.exp(-decay * t) * (
    alpha0 * Math.cos(frequency * t)
    + (alphaDot0 + decay * alpha0) / frequency * Math.sin(frequency * t)
  )

  it('matches ten sample times and the frequency/decay from crossings and peaks', () => {
    const flight = simulateDart({
      dart: oscillatorDart, speed, elevationDeg: 0, initialAlphaDeg: alpha0 * 180 / Math.PI,
      initialPitchRate: q0, airDensity: density, gravity: 0, launchHeight: 100,
      timeStep: 1e-4, maxTime: 2 * period,
    })
    const crossings: number[] = []
    const peaks: { t: number; magnitude: number }[] = []
    const samples = flight.samples
    for (let i = 1; i < samples.length - 1; i++) {
      const a = samples[i - 1]
      const b = samples[i]
      const c = samples[i + 1]
      if (a.alpha > 0 && b.alpha <= 0) {
        crossings.push(a.t + (b.t - a.t) * a.alpha / (a.alpha - b.alpha))
      }
      if ((b.alpha - a.alpha) * (c.alpha - b.alpha) < 0) {
        peaks.push({ t: b.t, magnitude: Math.abs(b.alpha) })
      }
    }
    expect(crossings.length).toBeGreaterThanOrEqual(2)
    expect(peaks.length).toBeGreaterThanOrEqual(3)
    const fittedFrequency = 2 * Math.PI / (crossings[1] - crossings[0])
    const first = peaks[0]
    const last = peaks.at(-1)!
    const fittedDecay = Math.log(first.magnitude / last.magnitude) / (last.t - first.t)
    const errors = Array.from({ length: 10 }, (_, i) => {
      const target = 2 * period * (i + 1) / 10
      const sample = samples[Math.min(Math.round(target / 1e-4), samples.length - 1)]
      return Math.abs(sample.alpha - exact(sample.t))
    })
    for (const error of errors) close(error, 0, 2e-6, 0)
    close(fittedFrequency, frequency, 0, 0.005)
    close(fittedDecay, decay, 0, 0.005)
    expect(flight.landed).toBe(false)
  })
})

// Illustrative 0.5 kg, 30 mm, roughly 0.5 m lawn dart with a weighted nose and
// aft fins. I = 0.004 kg m²; CN_alpha = 20/rad. Aerodynamic coefficients
// are illustrative inputs rather than measurements of a particular dart.
const lawnDart: Dart = {
  mass: 0.5, diameter: 0.03, pitchInertia: 0.004, xcg: 0.1,
  aero: { cnAlpha: 20, xcp: 0.3, cd0: 0.3, cdAlpha2: 2, cmq: -1000 },
}

describe('dart behaviour (check 8)', () => {
  const launch = { speed: 30, elevationDeg: 45, launchHeight: 20, timeStep: 1e-4, maxTime: 10 }

  it('brings a positive-margin dart from 10 degrees below 1 degree within flight', () => {
    const flight = simulateDart({ ...launch, dart: lawnDart, initialAlphaDeg: 10 })
    const minimum = Math.min(...flight.samples.map((s) => Math.abs(s.alpha)))
    expect(staticMargin(lawnDart)).toBeGreaterThan(0)
    expect(flight.landed).toBe(true)
    expect(minimum).toBeLessThan(Math.PI / 180)
  })

  it('takes a rear-weighted dart through 90 degrees and oscillates about tail-first', () => {
    // Same size and aero, but CG moved to 0.4 m: a deliberately rear-weighted
    // dart/arrow, with a smaller illustrative pitch-damping coefficient.
    const dart = { ...lawnDart, xcg: 0.4, aero: { ...lawnDart.aero, cmq: -805 } }
    const flight = simulateDart({ ...launch, dart, initialAlphaDeg: 1 })
    expect(staticMargin(dart)).toBeLessThan(0)
    const sideways = flight.samples.findIndex((s) => Math.abs(s.alpha) > Math.PI / 2)
    expect(sideways).toBeGreaterThan(0)
    const tailErrors = flight.samples.slice(sideways).map((s) => Math.atan2(Math.sin(s.alpha - Math.PI), Math.cos(s.alpha - Math.PI)))
    let crossings = 0
    for (let i = 1; i < tailErrors.length; i++) {
      if (tailErrors[i - 1] * tailErrors[i] < 0) crossings++
    }
    const finalError = Math.abs(tailErrors.at(-1)!)
    expect(flight.landed).toBe(true)
    expect(crossings).toBeGreaterThanOrEqual(2)
    expect(finalError).toBeLessThan(Math.PI / 6)
  })

  it('keeps pitch fixed with zero margin, zero damping and zero initial pitch rate', () => {
    const dart = { ...lawnDart, xcg: lawnDart.aero.xcp, aero: { ...lawnDart.aero, cmq: 0 } }
    const flight = simulateDart({ ...launch, dart, initialAlphaDeg: 10, initialPitchRate: 0 })
    close(staticMargin(dart), 0, 0, 0)
    let maxRate = 0
    for (let i = 1; i < flight.samples.length; i++) {
      const a = flight.samples[i - 1]
      const b = flight.samples[i]
      close(b.pitch, flight.samples[0].pitch, 1e-12, 0)
      maxRate = Math.max(maxRate, Math.abs((b.pitch - a.pitch) / (b.t - a.t)))
    }
    // Pitch rate is internal; consecutive reported pitches expose its integral.
    close(maxRate, 0, 1e-12, 0)
  })
})

describe('Barrowman references (check 9)', () => {
  it('places a cone normal force at two thirds of its length', () => {
    const length = 0.18
    const nose = barrowman({ noseLength: length, bodyDiameter: 0.06, noseShape: 'cone' })
    close(nose.cnAlphaNose, 2, 0, 0)
    close(nose.cnAlpha, 2, 0, 0)
    close(nose.xcpNose, 2 * length / 3, 1e-15, 0)
    close(nose.xcp, 2 * length / 3, 1e-15, 0)
    expect(nose.cnAlphaFins).toBe(0)
  })

  it('matches the tangent-ogive volume reference at L/D = 3', () => {
    const length = 0.18
    const nose = barrowman({ noseLength: length, bodyDiameter: length / 3, noseShape: 'tangentOgive' })
    close(nose.cnAlphaNose, 2, 0, 0)
    close(nose.xcpNose, 0.462453 * length, 0, 1e-5)
  })

  const diameter = 0.02
  const chord = 0.1
  const rectangular = (span: number): FinSet => ({
    count: 4, rootChord: chord, tipChord: chord, span, sweep: 0, leadingEdgeFromNose: 0.4,
  })
  for (const [aspectRatio, rel] of [[0.01, 1e-4], [1000, 2e-3]]) {
    it(`matches the independent ${aspectRatio < 1 ? 'slender-wing' : 'thin-airfoil'} limit`, () => {
      const span = aspectRatio * chord
      const result = barrowman({
        noseLength: 0.06, bodyDiameter: diameter, noseShape: 'cone', fins: rectangular(span),
      })
      const finsOnly = result.cnAlphaFins / result.finInterference
      // Four fins: slender-wing 8(s/d)^2; thin-airfoil 16sc/d^2.
      const reference = aspectRatio < 1 ? 8 * (span / diameter) ** 2 : 16 * span * chord / diameter ** 2
      close(finsOnly, reference, 0, rel)
      close(result.xcpFins, 0.4 + chord / 4, 1e-15, 0)
      expect(result.xcp).toBeGreaterThan(result.xcpNose)
      expect(result.xcp).toBeLessThan(result.xcpFins)
    })
  }

  it('handles three triangular swept fins and rejects invalid geometry', () => {
    const geom = { noseLength: 0.1, bodyDiameter: 0.03, noseShape: 'cone' as const }
    const fins: FinSet = { count: 3, rootChord: 0.1, tipChord: 0, span: 0.05, sweep: 0.08, leadingEdgeFromNose: 0.3 }
    const result = barrowman({ ...geom, fins })
    close(result.xcpFins, 0.3 + 0.08 / 3 + 0.1 / 6, 1e-15, 0)
    expect(result.cnAlphaFins).toBeGreaterThan(0)
    for (const patch of [{ noseLength: 0 }, { bodyDiameter: -1 }, { noseLength: Infinity }]) {
      expect(() => barrowman({ ...geom, ...patch })).toThrow(RangeError)
    }
    expect(() => barrowman({ ...geom, noseLength: 0.01, noseShape: 'tangentOgive' })).toThrow(RangeError)
    for (const patch of [{ span: 0 }, { rootChord: 0 }, { tipChord: -1 }, { sweep: NaN }, { leadingEdgeFromNose: -1 }]) {
      expect(() => barrowman({ ...geom, fins: { ...fins, ...patch } })).toThrow(RangeError)
    }
  })
})

describe('dart translation and limiting cases', () => {
  it('matches vacuum position, pitch and refined landing in the absence of air', () => {
    const speed = 30
    const angle = 35 * Math.PI / 180
    const height = 3
    const vx = speed * Math.cos(angle)
    const vy = speed * Math.sin(angle)
    const time = (vy + Math.sqrt(vy ** 2 + 2 * STANDARD_GRAVITY * height)) / STANDARD_GRAVITY
    const flight = simulateDart({
      dart: lawnDart, speed, elevationDeg: 35, launchHeight: height, airDensity: 0,
      initialAlphaDeg: 10, initialPitchRate: 0.2, timeStep: 0.05, maxTime: 30,
    })
    expect(flight.landed).toBe(true)
    close(flight.flightTime, time, 1e-11, 1e-12)
    close(flight.range, vx * time, 1e-10, 1e-12)
    for (const sample of flight.samples) {
      close(sample.pos.x, vx * sample.t, 1e-10, 1e-12)
      close(sample.pos.y, height + vy * sample.t - STANDARD_GRAVITY * sample.t ** 2 / 2, 1e-10, 1e-12)
      close(sample.vel.x, vx, 1e-12, 1e-12)
      close(sample.vel.y, vy - STANDARD_GRAVITY * sample.t, 1e-12, 1e-12)
      close(sample.pitch, angle + Math.PI / 18 + 0.2 * sample.t, 1e-12, 1e-12)
    }
    expect(flight.samples.at(-1)!.pos.y).toBe(0)
  })

  it('does not confuse launch with landing when one coarse step contains the entire hop', () => {
    const flight = simulateDart({
      dart: lawnDart, speed: 5, elevationDeg: 30, airDensity: 0, timeStep: 2, maxTime: 5,
    })
    const time = 2 * 5 * Math.sin(Math.PI / 6) / STANDARD_GRAVITY
    expect(flight.landed).toBe(true)
    close(flight.flightTime, time, 1e-12, 1e-12)
    close(flight.range, 5 * Math.cos(Math.PI / 6) * time, 1e-12, 1e-12)
  })

  for (const initialAlphaDeg of [0, 180]) {
    it(`opposes axial motion at alpha = ${initialAlphaDeg} degrees`, () => {
      const dart = { ...lawnDart, aero: { ...lawnDart.aero, cnAlpha: 0, cd0: 0.5, cdAlpha2: 0 } }
      const flight = simulateDart({
        dart, speed: 30, elevationDeg: 0, initialAlphaDeg, gravity: 0, launchHeight: 10,
        timeStep: 0.001, maxTime: 0.1,
      })
      const k = 1.225 * 0.5 * Math.PI * dart.diameter ** 2 / (8 * dart.mass)
      const last = flight.samples.at(-1)!
      close(last.vel.x, 30 / (1 + k * 30 * last.t), 1e-11, 1e-11)
      close(last.pos.x, Math.log1p(k * 30 * last.t) / k, 1e-11, 1e-11)
      expect(flight.landed).toBe(false)
    })
  }

  it('keeps zero-airspeed damping finite and wraps alpha to (-pi, pi]', () => {
    const flight = simulateDart({
      dart: lawnDart, speed: 0, elevationDeg: 0, initialAlphaDeg: -180, initialPitchRate: -4,
      gravity: 0, launchHeight: 10, timeStep: 0.01, maxTime: 2,
    })
    expect(flight.samples[0].alpha).toBe(Math.PI)
    for (const sample of flight.samples) {
      close(sample.pitch, -Math.PI - 4 * sample.t, 1e-12, 1e-12)
      expect(sample.pos).toEqual({ x: 0, y: 10 })
      expect(sample.alpha).toBeGreaterThan(-Math.PI)
      expect(sample.alpha).toBeLessThanOrEqual(Math.PI)
    }
    expect(flight.flightTime).toBe(2)
    expect(flight.landed).toBe(false)
  })

  it('handles a drop from rest and immediate impact from ground level', () => {
    const drop = simulateDart({
      dart: lawnDart, speed: 0, elevationDeg: 0, launchHeight: 10,
      airDensity: 0, timeStep: 0.03, maxTime: 5,
    })
    close(drop.flightTime, Math.sqrt(20 / STANDARD_GRAVITY), 1e-12, 1e-12)
    expect(drop.landed).toBe(true)
    const ground = simulateDart({ dart: lawnDart, speed: 0, elevationDeg: 0, timeStep: 0.01, maxTime: 1 })
    expect(ground.landed).toBe(true)
    expect(ground.flightTime).toBe(0)
    expect(ground.samples).toHaveLength(1)
  })
})

describe('dart input validation', () => {
  const base: DartParams = { dart: lawnDart, speed: 30, elevationDeg: 45, timeStep: 0.005, maxTime: 1 }

  it('rejects invalid simulation parameters with RangeError', () => {
    const patches: Partial<DartParams>[] = [
      { speed: -1 }, { speed: Infinity }, { elevationDeg: NaN }, { initialAlphaDeg: Infinity },
      { initialPitchRate: NaN }, { airDensity: -1 }, { gravity: -1 }, { launchHeight: -1 },
      { timeStep: 0 }, { timeStep: Infinity }, { maxTime: 0 }, { maxTime: NaN },
    ]
    for (const patch of patches) expect(() => simulateDart({ ...base, ...patch })).toThrow(RangeError)
  })

  it('rejects invalid dart properties with RangeError', () => {
    for (const patch of [{ mass: 0 }, { diameter: 0 }, { pitchInertia: -1 }, { xcg: -1 }]) {
      expect(() => simulateDart({ ...base, dart: { ...lawnDart, ...patch } })).toThrow(RangeError)
    }
    for (const patch of [{ cnAlpha: -1 }, { xcp: -1 }, { cd0: -1 }, { cdAlpha2: -1 }, { cmq: NaN }]) {
      expect(() => simulateDart({ ...base, dart: { ...lawnDart, aero: { ...lawnDart.aero, ...patch } } })).toThrow(RangeError)
    }
  })
})
