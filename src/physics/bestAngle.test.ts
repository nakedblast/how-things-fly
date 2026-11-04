import { describe, expect, it } from 'vitest'
import { bestAngle } from './bestAngle'
import { simulateFlight, type Projectile } from './flight'
import { STANDARD_GRAVITY as g } from './trajectory'

const ball: Projectile = { mass: 0.145, diameter: 0.074, dragCoefficient: 0.47 }

describe('bestAngle', () => {
  it('is 45° with the vacuum range v²/g when there is no air', () => {
    const best = bestAngle({ speed: 30, projectile: ball, air: { density: 0 } })
    expect(best.angleDeg).toBeCloseTo(45, 1)
    expect(best.range).toBeCloseTo((30 * 30) / g, 6)
  })

  it('drops below 45° in air, and further the faster the launch', () => {
    const angles = [10, 30, 60].map((speed) => bestAngle({ speed, projectile: ball }).angleDeg)
    expect(angles[0]).toBeLessThan(45)
    expect(angles[1]).toBeLessThan(angles[0])
    expect(angles[2]).toBeLessThan(angles[1])
  })

  it('beats every angle on a 1° scan', () => {
    const params = { speed: 50, projectile: ball }
    const best = bestAngle(params)
    for (let a = 20; a <= 60; a++) {
      expect(best.range).toBeGreaterThanOrEqual(simulateFlight({ ...params, angleDeg: a }).range - 1e-9)
    }
  })
})
