import { describe, expect, it } from 'vitest'
import { constantAtmosphere } from './atmosphere'
import { flightPositionAt, simulateFlight } from './flight'
import { dragTable, simulateFlight3D } from './flight3d'
import { STANDARD_GRAVITY as g } from './trajectory'
import { add, cross, dot, norm, scale, sub } from './vec3'

function close(actual: number, reference: number, abs: number, rel: number) {
  expect(Math.abs(actual - reference)).toBeLessThanOrEqual(abs + rel * Math.abs(reference))
}

const ball = { mass: 0.145, diameter: 0.0737, drag: 0.35 }
const launch = { speed: 45, elevationDeg: 35 }
const timeStep = 1 / 200
const air = constantAtmosphere(1.225)
const vacuum = constantAtmosphere(0)
const radius = 6_371_000
const rotation = 7.2921159e-5
const radians = (angle: number) => angle * Math.PI / 180

function root(f: (time: number) => number, lo: number, hi: number): number {
  expect(f(lo) * f(hi)).toBeLessThan(0)
  const sign = Math.sign(f(lo))
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    if (Math.sign(f(mid)) === sign) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

// Rodrigues rotation at w = -2 Omega, integrated once for velocity and twice
// for position under constant gravity. No integration of the ODE is used here.
function rotatingVacuum(speed: number, elevation: number, latitude: number, azimuth: number, height = 0) {
  const phi = radians(latitude)
  const az = radians(azimuth)
  const axis = [Math.cos(phi) * Math.cos(az), Math.sin(phi), -Math.cos(phi) * Math.sin(az)]
  const w = -2 * rotation
  const initial = [speed * Math.cos(radians(elevation)), speed * Math.sin(radians(elevation)), 0]
  const gravity = [0, -g, 0]
  const split = (v: number[]) => {
    const along = axis.reduce((sum, k, i) => sum + k * v[i], 0)
    return {
      parallel: axis.map((k) => k * along),
      perpendicular: v.map((value, i) => value - axis[i] * along),
      crossed: [axis[1] * v[2] - axis[2] * v[1], axis[2] * v[0] - axis[0] * v[2], axis[0] * v[1] - axis[1] * v[0]],
    }
  }
  const v = split(initial)
  const a = split(gravity)
  return (t: number) => {
    const angle = w * t
    const sine = Math.sin(angle)
    const cosine = Math.cos(angle)
    const oneMinusCosine = 2 * Math.sin(angle / 2) ** 2
    // Avoid cancellation in angle - sin(angle) for short equatorial drops.
    const angleMinusSine = Math.abs(angle) < 0.1
      ? angle ** 3 * (1 / 6 - angle ** 2 / 120 + angle ** 4 / 5040 - angle ** 6 / 362880 + angle ** 8 / 39916800)
      : angle - sine
    return {
      pos: [0, height, 0].map((value, i) => value
        + v.parallel[i] * t + v.perpendicular[i] * sine / w + v.crossed[i] * oneMinusCosine / w
        + a.parallel[i] * t * t / 2 + a.perpendicular[i] * oneMinusCosine / (w * w) + a.crossed[i] * angleMinusSine / (w * w)),
      vel: initial.map((_value, i) => v.parallel[i] + v.perpendicular[i] * cosine + v.crossed[i] * sine
        + a.parallel[i] * t + a.perpendicular[i] * sine / w + a.crossed[i] * oneMinusCosine / w),
    }
  }
}

describe('vec3', () => {
  it('uses right-handed vector arithmetic without mutating its inputs', () => {
    const a = { x: 1, y: 2, z: 3 }
    const b = { x: -2, y: 4, z: 1 }
    expect(add(a, b)).toEqual({ x: -1, y: 6, z: 4 })
    expect(sub(a, b)).toEqual({ x: 3, y: -2, z: 2 })
    expect(scale(a, 2)).toEqual({ x: 2, y: 4, z: 6 })
    expect(dot(a, b)).toBe(9)
    expect(cross(a, b)).toEqual({ x: -10, y: -7, z: 8 })
    expect(cross({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })).toEqual({ x: 0, y: 0, z: 1 })
    close(norm(a), Math.sqrt(14), 0, 1e-15)
    expect(norm({ x: 0, y: 0, z: 0 })).toBe(0)
    expect(a).toEqual({ x: 1, y: 2, z: 3 })
    expect(b).toEqual({ x: -2, y: 4, z: 1 })
  })
})

describe('simulateFlight3D: acceptance 2, compatibility with 2D', () => {
  it('matches the 2D ball and its independent hodograph reference', () => {
    const f = simulateFlight3D({ launch, projectile: ball, environment: { atmosphere: air }, timeStep })
    const ref = simulateFlight({ speed: launch.speed, angleDeg: launch.elevationDeg, projectile: { mass: ball.mass, diameter: ball.diameter, dragCoefficient: ball.drag }, air: { density: 1.225 }, timeStep })
    expect(f.landed).toBe(true)
    const pairs = [
      [f.range, ref.range], [f.flightTime, ref.flightTime], [f.impactSpeed, ref.impactSpeed],
      [f.apex.t, ref.apex.t], [f.apex.pos.x, ref.apex.pos.x], [f.apex.pos.y, ref.apex.pos.y],
    ]
    for (const [actual, reference] of pairs) close(actual, reference, 0, 1e-9)
    expect(f.drift).toBe(0)
    expect(f.samples.every((s) => s.pos.z === 0 && s.vel.z === 0)).toBe(true)
    // Angle-parametric quadratic-drag solution quoted in flight.test.ts.
    const hodograph = [
      [f.range, 109.1447765403631], [f.flightTime, 4.42528399929407],
      [f.apex.pos.x, 60.97015345222637], [f.apex.pos.y, 24.27484043227914],
      [f.apex.t, 2.0715404156706683], [f.impactSpeed, 25.828899869644644],
    ]
    for (const [actual, reference] of hodograph) close(actual, reference, 1e-6, 0)
  })
})

describe('simulateFlight3D: acceptance 3, Galilean wind transformation', () => {
  for (const [name, wind] of [
    ['headwind', { x: -10, y: 0, z: 0 }],
    ['wind from the left', { x: 0, y: 0, z: 10 }],
  ] as const) {
    it(`matches the translated air-frame flight with ${name}`, () => {
      const f = simulateFlight3D({ launch, projectile: ball, environment: { atmosphere: air, wind }, timeStep })
      const relX = launch.speed * Math.cos(radians(launch.elevationDeg)) - wind.x
      const relZ = -wind.z
      const vertical = launch.speed * Math.sin(radians(launch.elevationDeg))
      const horizontal = Math.hypot(relX, relZ)
      const ref = simulateFlight({ speed: Math.hypot(horizontal, vertical), angleDeg: Math.atan2(vertical, horizontal) * 180 / Math.PI, projectile: { mass: ball.mass, diameter: ball.diameter, dragCoefficient: ball.drag }, air: { density: 1.225 }, timeStep })
      expect(f.landed).toBe(true)
      close(f.flightTime, ref.flightTime, 1e-12, 1e-6)
      const expectedRange = ref.range * relX / horizontal + wind.x * ref.flightTime
      const expectedDrift = ref.range * relZ / horizontal + wind.z * ref.flightTime
      close(f.range, expectedRange, 1e-9, 1e-6)
      close(f.drift, expectedDrift, 1e-9, 1e-6)
      let maxPositionError = 0
      for (const sample of f.samples.filter((_s, i) => i % 100 === 0)) {
        const reference = flightPositionAt(ref, sample.t)
        for (const [value, expected] of [
          [sample.pos.x, reference.x * relX / horizontal + wind.x * sample.t],
          [sample.pos.y, reference.y],
          [sample.pos.z, reference.x * relZ / horizontal + wind.z * sample.t],
        ]) {
          close(value, expected, 1e-9, 1e-6)
          maxPositionError = Math.max(maxPositionError, Math.abs(value - expected))
        }
      }
    })
  }
})

describe('speed-dependent drag: acceptance 4', () => {
  it('matches the closed-form linear-drag position at all four reference times', () => {
    const soundSpeed = 340.294
    const c = 0.35 * 0.1
    const atmosphere = constantAtmosphere(1.225, soundSpeed * soundSpeed / (1.4 * 287.05287))
    const b = 1.225 * Math.PI * ball.diameter ** 2 / 4 * c * soundSpeed / (2 * ball.mass)
    const u0 = launch.speed * Math.cos(radians(launch.elevationDeg))
    const v0 = launch.speed * Math.sin(radians(launch.elevationDeg))
    const f = simulateFlight3D({ launch, projectile: { ...ball, drag: (mach) => c / mach }, environment: { atmosphere }, timeStep, maxTime: 3 })
    const errors = []
    for (const t of [0.5, 1, 2, 3]) {
      const sample = f.samples.reduce((best, s) => Math.abs(s.t - t) < Math.abs(best.t - t) ? s : best)
      close(sample.t, t, 1e-12, 0)
      const decay = -Math.expm1(-b * t)
      const x = u0 / b * decay
      const y = (v0 / b + g / (b * b)) * decay - g * t / b
      close(sample.pos.x, x, 1e-9, 1e-9)
      close(sample.pos.y, y, 1e-9, 1e-9)
      expect(sample.pos.z).toBe(0)
      errors.push({ t, xError: Math.abs(sample.pos.x - x), yError: Math.abs(sample.pos.y - y) })
    }
  })

  it('interpolates exactly at nodes, linearly between, and clamps outside', () => {
    const table = dragTable([[0, 0.2], [0.8, 0.3], [1.2, 0.6], [2, 0.4]])
    for (const [mach, expected] of [[-1, 0.2], [0, 0.2], [0.8, 0.3], [1.2, 0.6], [2, 0.4], [10, 0.4], [0.4, 0.25], [1, 0.45], [1.6, 0.5]]) close(table(mach), expected, 1e-15, 0)
    expect(dragTable([[1, 0.3]])(3)).toBe(0.3)
  })

  it('rejects invalid drag tables', () => {
    for (const points of [[], [[1, 0.2], [1, 0.3]], [[2, 0.2], [1, 0.3]], [[-1, 0.2]], [[0, -1]], [[NaN, 0.2]], [[0, Infinity]]] as [number, number][][]) {
      expect(() => dragTable(points)).toThrow(RangeError)
    }
    expect(() => dragTable([[0, 0.2]])(NaN)).toThrow(RangeError)
  })
})

describe('Coriolis: acceptance 5', () => {
  it('matches Rodrigues rotation and its time integral in vacuum', () => {
    const referenceAt = rotatingVacuum(1000, 45, 49, 232)
    const landingTime = root((t) => referenceAt(t).pos[1], 100, 200)
    const reference = referenceAt(landingTime)
    const f = simulateFlight3D({ launch: { speed: 1000, elevationDeg: 45 }, projectile: ball, environment: { atmosphere: vacuum, earthRotation: { latitudeDeg: 49, azimuthDeg: 232 } }, timeStep: 0.05 })
    expect(f.landed).toBe(true)
    close(f.flightTime, landingTime, 1e-9, 1e-9)
    close(f.range, reference.pos[0], 1e-7, 1e-9)
    close(f.drift, reference.pos[2], 1e-7, 1e-9)
    close(landingTime, 143.424464, 0, 1e-6)
    close(reference.pos[0], 101_593.851, 0, 1e-6)
    close(reference.pos[2], 944.736, 0, 1e-6)
    let maxPositionError = 0
    let maxVelocityError = 0
    for (const sample of f.samples.filter((_s, i) => i % 100 === 0)) {
      const expected = referenceAt(sample.t)
      for (const [i, key] of (['x', 'y', 'z'] as const).entries()) {
        close(sample.pos[key], expected.pos[i], 1e-7, 1e-9)
        close(sample.vel[key], expected.vel[i], 1e-9, 1e-9)
        maxPositionError = Math.max(maxPositionError, Math.abs(sample.pos[key] - expected.pos[i]))
        maxVelocityError = Math.max(maxVelocityError, Math.abs(sample.vel[key] - expected.vel[i]))
      }
    }
  })

  it('deflects an equatorial drop east by one third Omega g t cubed', () => {
    // Facing north, east is +z.
    const f = simulateFlight3D({ launch: { speed: 0, elevationDeg: 0, launchHeight: 1000 }, projectile: ball, environment: { atmosphere: vacuum, earthRotation: { latitudeDeg: 0, azimuthDeg: 0 } }, timeStep })
    const referenceAt = rotatingVacuum(0, 0, 0, 0, 1000)
    const landingTime = root((t) => referenceAt(t).pos[1], 10, 20)
    const exactEast = referenceAt(landingTime).pos[2]
    const approximation = rotation * g * f.flightTime ** 3 / 3
    expect(f.landed).toBe(true)
    close(f.flightTime, landingTime, 1e-10, 1e-10)
    close(f.drift, exactEast, 1e-10, 1e-9)
    close(f.drift, 0.694252, 0, 0.01)
    close(f.drift, approximation, 0, 0.01)
    expect(f.drift).toBeGreaterThan(0)
  })
})

describe('curved Earth: acceptance 6', () => {
  it('matches the Kepler surface-to-surface range', () => {
    const speed = 1600
    const angle = radians(50)
    const nu = speed * speed / (g * radius)
    // Bate, Mueller & White, Fundamentals of Astrodynamics, section 6.2.
    const psi = 2 * Math.atan2(nu * Math.sin(angle) * Math.cos(angle), 1 - nu * Math.cos(angle) ** 2)
    const referenceRange = radius * psi
    const flatRange = speed * speed * Math.sin(2 * angle) / g
    const parameters = { launch: { speed, elevationDeg: 50 }, projectile: ball, timeStep: 0.05 }
    const f = simulateFlight3D({ ...parameters, environment: { atmosphere: vacuum, curvedEarth: true } })
    const flat = simulateFlight3D({ ...parameters, environment: { atmosphere: vacuum } })
    expect(f.landed).toBe(true)
    expect(f.flightTime).toBeGreaterThan(0)
    close(f.range, referenceRange, 0, 1e-6)
    close(referenceRange, 261_471.985, 0, 1e-6)
    close(flat.range, flatRange, 1e-7, 1e-9)
    close(flatRange, 257_081.455, 0, 1e-6)
    expect(f.range).toBeGreaterThan(flat.range)
    expect(f.drift).toBe(0)
    const landing = f.samples.at(-1)!
    close(Math.hypot(landing.pos.x, landing.pos.y + radius, landing.pos.z), radius, 1e-8, 0)
    expect(landing.pos.x * landing.vel.x + (landing.pos.y + radius) * landing.vel.y + landing.pos.z * landing.vel.z).toBeLessThan(0)
    // Inverse-square gravity conserves energy and angular momentum in vacuum.
    const mu = g * radius * radius
    const energy = speed * speed / 2 - mu / radius
    let maxEnergyError = 0
    let maxMomentumRelativeError = 0
    for (const sample of [f.apex, landing]) {
      const r = Math.hypot(sample.pos.x, sample.pos.y + radius, sample.pos.z)
      const actualEnergy = (sample.vel.x ** 2 + sample.vel.y ** 2 + sample.vel.z ** 2) / 2 - mu / r
      const momentum = sample.pos.x * sample.vel.y - (sample.pos.y + radius) * sample.vel.x
      close(actualEnergy, energy, 1e-6, 1e-12)
      close(momentum, -radius * speed * Math.cos(angle), 0, 1e-12)
      maxEnergyError = Math.max(maxEnergyError, Math.abs(actualEnergy - energy))
      maxMomentumRelativeError = Math.max(maxMomentumRelativeError, Math.abs(momentum / (-radius * speed * Math.cos(angle)) - 1))
    }
    const apex = f.apex
    close(apex.pos.x * apex.vel.x + (apex.pos.y + radius) * apex.vel.y, 0, 1e-4, 0)
    const apexRadius = Math.hypot(apex.pos.x, apex.pos.y + radius)
    expect(Math.abs(apex.vel.y)).toBeGreaterThan(1)
    expect(apexRadius).toBeGreaterThan(Math.hypot(f.samples[0].pos.x, f.samples[0].pos.y + radius))
  })
})

describe('simulateFlight3D limits and input checks', () => {
  it('reports the highest altitude for a truncated ascent or a drop', () => {
    const ascent = simulateFlight3D({ launch, projectile: ball, environment: { atmosphere: vacuum }, timeStep, maxTime: 0.5 })
    expect(ascent.landed).toBe(false)
    close(ascent.flightTime, 0.5, 1e-15, 0)
    expect(ascent.apex).toEqual(ascent.samples.at(-1))
    const drop = simulateFlight3D({ launch: { speed: 0, elevationDeg: 0, launchHeight: 100 }, projectile: ball, environment: { atmosphere: vacuum }, timeStep })
    expect(drop.landed).toBe(true)
    expect(drop.apex).toEqual(drop.samples[0])
    close(drop.flightTime, Math.sqrt(200 / g), 1e-12, 1e-12)
  })

  it('excludes the launch root when one step contains apex and landing', () => {
    const f = simulateFlight3D({ launch: { speed: 1, elevationDeg: 45 }, projectile: ball, environment: { atmosphere: vacuum }, timeStep: 0.5 })
    expect(f.landed).toBe(true)
    close(f.flightTime, Math.SQRT2 / g, 1e-14, 1e-14)
    close(f.apex.t, 1 / (Math.SQRT2 * g), 1e-14, 1e-14)
  })

  it('uses altitude-dependent wind and local Mach in custom atmospheres', () => {
    const altitudes: number[] = []
    const machNumbers: number[] = []
    const f = simulateFlight3D({ launch: { ...launch, launchHeight: 100 }, projectile: { ...ball, drag: (mach) => { machNumbers.push(mach); return 0.35 } }, environment: { atmosphere: air, wind: (height) => { altitudes.push(height); return { x: 0, y: 0, z: height / 10 } } }, timeStep, maxTime: 0.5 })
    expect(f.drift).toBeGreaterThan(0)
    close(altitudes[0], 100, 0, 0)
    expect(Math.max(...altitudes)).toBeGreaterThan(100)
    close(machNumbers[0], Math.hypot(45, 10) / air(100).speedOfSound, 1e-15, 1e-15)
  })

  it('does not evaluate a singular Cd at zero air-relative speed', () => {
    const f = simulateFlight3D({ launch: { speed: 0, elevationDeg: 0, launchHeight: 10 }, projectile: { ...ball, drag: (mach) => 0.035 / mach }, environment: { atmosphere: air }, timeStep, maxTime: 0.1 })
    expect(Number.isFinite(f.impactSpeed)).toBe(true)
    expect(f.impactSpeed).toBeGreaterThan(0)
  })

  it('rejects nonphysical parameters and invalid callback results', () => {
    const base = { launch, projectile: ball, timeStep, maxTime: 0.01 }
    const cases: Parameters<typeof simulateFlight3D>[0][] = [
      { ...base, projectile: { ...ball, mass: 0 } },
      { ...base, projectile: { ...ball, diameter: -1 } },
      { ...base, projectile: { ...ball, drag: NaN } },
      { ...base, projectile: { ...ball, drag: -1 } },
      { ...base, projectile: { ...ball, drag: () => -1 } },
      { ...base, launch: { ...launch, speed: Infinity } },
      { ...base, launch: { ...launch, speed: -1 } },
      { ...base, launch: { ...launch, elevationDeg: NaN } },
      { ...base, launch: { ...launch, launchHeight: -1 } },
      { ...base, timeStep: 0 }, { ...base, timeStep: Infinity },
      { ...base, maxTime: -1 }, { ...base, maxTime: Infinity },
      { ...base, environment: { gravity: -1 } },
      { ...base, environment: { wind: { x: 0, y: NaN, z: 0 } } },
      { ...base, environment: { wind: () => ({ x: Infinity, y: 0, z: 0 }) } },
      { ...base, environment: { earthRotation: { latitudeDeg: 91, azimuthDeg: 0 } } },
      { ...base, environment: { earthRotation: { latitudeDeg: 0, azimuthDeg: NaN } } },
      { ...base, environment: { atmosphere: () => ({ ...air(0), density: -1 }) } },
      { ...base, environment: { atmosphere: () => ({ ...air(0), speedOfSound: 0 }) } },
    ]
    for (const parameters of cases) expect(() => simulateFlight3D(parameters)).toThrow(RangeError)
  })
})
