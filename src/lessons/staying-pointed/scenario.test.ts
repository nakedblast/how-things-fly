import { describe, expect, it } from 'vitest'
import {
  cameraDart,
  CAMERA_POSITIONS,
  classify,
  fly,
  FINS_AT_TAIL,
  FINS_MIDDLE,
  FIN_RANGE,
  GOLD_MARGIN,
  margin,
  rangeShot,
  sampleAt,
  stopX,
  TURN_SETS,
  weightOutcome,
} from './scenario'

describe('the range dart', () => {
  it('flies true with the weight at the nose or in the middle and tumbles with it at the fin end', () => {
    expect(rangeShot(stopX('nose')).behaviour).toBe('true')
    expect(rangeShot(stopX('middle')).behaviour).toBe('true')
    expect(rangeShot(stopX('fins')).behaviour).toBe('tumble')
    expect(margin(rangeShot(stopX('fins')).projectile)).toBeLessThan(0)
  })

  it('classifies the fin end as the myth', () => {
    expect(weightOutcome('fins')).toBe('myth')
    expect(weightOutcome('nose')).toBe('matched')
    expect(weightOutcome('middle')).toBe('other')
  })

  it('makes every Play goal reachable', () => {
    expect(rangeShot(0.05, FINS_MIDDLE).behaviour).toBe('true')
    expect(rangeShot(0.4, FINS_MIDDLE).behaviour).toBe('tumble')
    expect(rangeShot(0.51, FINS_AT_TAIL).behaviour).toBe('wobble')
  })
})

describe('classify', () => {
  const at = (t: number, deg: number) => ({ t, pos: { x: 0, y: 0 }, vel: { x: 1, y: 0 }, pitch: 0, alpha: (deg * Math.PI) / 180 })
  it('ignores the release wobble but not a later one, and any pass beyond 90 degrees is a tumble', () => {
    expect(classify([at(0, 20), at(0.6, 3)]).behaviour).toBe('true')
    expect(classify([at(0, 5), at(0.6, 15)]).behaviour).toBe('wobble')
    expect(classify([at(0, 5), at(0.2, 100), at(0.6, 3)]).behaviour).toBe('tumble')
  })
})

describe('sampleAt', () => {
  it('interpolates between samples and clamps at the ends', () => {
    const shot = rangeShot(stopX('nose'))
    const s = shot.flight.samples
    const mid = sampleAt(s, (s[10].t + s[11].t) / 2)
    expect(mid.pos.x).toBeCloseTo((s[10].pos.x + s[11].pos.x) / 2, 12)
    expect(sampleAt(s, -1)).toBe(s[0])
    expect(sampleAt(s, 99)).toBe(s.at(-1))
  })
})

describe('Prove, puzzle 1: will it turn round?', () => {
  const expected: Record<string, boolean> = {
    'shuttle-back': true,
    'arrow-front': true,
    'dart-mid': false,
    'arrow-back': true,
    'shuttle-front': false,
    'camera-tail': false,
  }
  for (const item of TURN_SETS.flat()) {
    it(`${item.id} ${expected[item.id] ? 'turns round' : 'keeps pointing'}`, () => {
      expect(fly(item.projectile, item.launch).turnedRound).toBe(expected[item.id])
    })
  }

  it('flips the shuttlecock in about 20 ms, as filmed', () => {
    const item = TURN_SETS[0].find((i) => i.id === 'shuttle-back')!
    const flip = fly(item.projectile, item.launch).flight.samples.find((s) => Math.abs(s.alpha) < Math.PI / 2)!
    expect(flip.t).toBeGreaterThan(0.012)
    expect(flip.t).toBeLessThan(0.03)
  })
})

describe('Prove, puzzle 2: fin the camera dart', () => {
  for (const cameraX of CAMERA_POSITIONS) {
    it(`camera at ${cameraX} m: fins at the nose tumble, at the tail fly true but miss gold, and a gold position exists`, () => {
      expect(fly(cameraDart(cameraX, FIN_RANGE.min)).behaviour).toBe('tumble')
      const tail = cameraDart(cameraX, FINS_AT_TAIL)
      expect(fly(tail).behaviour).toBe('true')
      expect(margin(tail)).toBeGreaterThan(GOLD_MARGIN.max)
      const gold = []
      for (let le = FIN_RANGE.min; le <= FIN_RANGE.max; le += 0.01) {
        const p = cameraDart(cameraX, le)
        if (margin(p) >= GOLD_MARGIN.min && margin(p) <= GOLD_MARGIN.max && fly(p).behaviour === 'true') gold.push(le)
      }
      expect(gold.length).toBeGreaterThanOrEqual(3)
    })
  }
})
