import { describe, expect, it } from 'vitest'
import { createProgressStore, parseProgress, STORAGE_KEY, type RangeSetup, type StorageLike } from './progress'

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

const brokenStorage: StorageLike = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
  removeItem: () => {
    throw new Error('SecurityError')
  },
}

const fixedNow = () => new Date('2026-11-03T12:00:00Z')
const rangeSetup: RangeSetup = { speed: 50, angleDeg: 30, air: true, airDensity: 0.6, mass: 0.145, diameter: 74 }

describe('progress store', () => {
  it('round-trips the range setup without changing lesson progress', () => {
    const storage = memoryStorage()
    const store = createProgressStore(storage, fixedNow)
    store.awardStamp('the-arc')
    store.setRange(rangeSetup)
    const loaded = createProgressStore(storage).getSnapshot()
    expect(loaded).toEqual(store.getSnapshot())
    expect(loaded.range).toEqual(rangeSetup)
    expect(loaded.version).toBe(1)
    expect(loaded.lessons['the-arc'].stampEarnedAt).toBe(fixedNow().toISOString())
  })

  it('keeps the fins switch when saved and loads older setups without it', () => {
    const storage = memoryStorage()
    createProgressStore(storage).setRange({ ...rangeSetup, fins: true })
    expect(createProgressStore(storage).getSnapshot().range?.fins).toBe(true)
    createProgressStore(storage).setRange(rangeSetup)
    expect(createProgressStore(storage).getSnapshot().range).toEqual(rangeSetup)
  })

  it('survives a reload: a new store on the same storage sees the same progress', () => {
    const storage = memoryStorage()
    const a = createProgressStore(storage, fixedNow)
    a.openLesson('the-arc')
    a.setStep('the-arc', 'prove')
    a.recordPrediction('the-arc', { id: 'first-to-land', value: 'fired', confidence: 'fairly-sure', at: 'x' })
    a.setOutcome('the-arc', 'first-to-land', 'myth')
    a.fileMythCard('the-arc', 'changed-my-mind', 'first-to-land')
    a.awardStamp('the-arc')
    a.awardMedal('the-arc', 'prove-gold')

    const b = createProgressStore(storage, fixedNow)
    expect(b.getSnapshot()).toEqual(a.getSnapshot())
    expect(b.getSnapshot().lastLessonId).toBe('the-arc')
    expect(b.lesson('the-arc')).toEqual({
      step: 'prove',
      predictions: [{ id: 'first-to-land', value: 'fired', confidence: 'fairly-sure', outcome: 'myth', at: 'x' }],
      stampEarnedAt: '2026-11-03T12:00:00.000Z',
      myth: { variant: 'changed-my-mind', predictionId: 'first-to-land' },
      medals: ['prove-gold'],
    })
  })

  it('keeps the first stamp date, myth card and one copy of each medal', () => {
    let t = 0
    const store = createProgressStore(memoryStorage(), () => new Date(Date.UTC(2026, 0, 1 + t++)))
    store.awardStamp('the-arc')
    store.awardStamp('the-arc')
    store.fileMythCard('the-arc', 'changed-my-mind', 'a')
    store.fileMythCard('the-arc', 'saw-through-it', 'b')
    store.awardMedal('the-arc', 'prove-gold')
    store.awardMedal('the-arc', 'prove-gold')
    const l = store.lesson('the-arc')
    expect(l.stampEarnedAt).toBe('2026-01-01T00:00:00.000Z')
    expect(l.myth).toEqual({ variant: 'changed-my-mind', predictionId: 'a' })
    expect(l.medals).toEqual(['prove-gold'])
  })

  it('replaces a repeated prediction rather than duplicating it', () => {
    const store = createProgressStore(memoryStorage())
    store.recordPrediction('the-arc', { id: 'p', value: 1, confidence: 'guess', at: 'a' })
    store.recordPrediction('the-arc', { id: 'p', value: 2, confidence: 'certain', at: 'b' })
    expect(store.lesson('the-arc').predictions).toEqual([{ id: 'p', value: 2, confidence: 'certain', at: 'b' }])
  })

  it('notifies subscribers and hands out a new snapshot on each change', () => {
    const store = createProgressStore(memoryStorage())
    const before = store.getSnapshot()
    let calls = 0
    const off = store.subscribe(() => calls++)
    store.openLesson('spin')
    off()
    store.openLesson('magnus')
    expect(calls).toBe(1)
    expect(store.getSnapshot()).not.toBe(before)
    expect(before.lastLessonId).toBeUndefined()
  })

  it('reset clears storage and state', () => {
    const storage = memoryStorage()
    const store = createProgressStore(storage)
    store.awardStamp('the-arc')
    store.setRange(rangeSetup)
    store.reset()
    expect(storage.data.has(STORAGE_KEY)).toBe(false)
    expect(store.getSnapshot().lessons).toEqual({})
    expect(createProgressStore(storage).getSnapshot().lessons).toEqual({})
    expect(store.getSnapshot().range).toBeUndefined()
    expect(createProgressStore(storage).getSnapshot().range).toBeUndefined()
  })

  it('still works in memory when storage throws, and reports it is not persistent', () => {
    const store = createProgressStore(brokenStorage)
    store.awardStamp('the-arc')
    expect(store.lesson('the-arc').stampEarnedAt).toBeDefined()
    expect(store.isPersistent()).toBe(false)
    store.reset()
    expect(store.getSnapshot().lessons).toEqual({})
  })

  it('works with no storage at all', () => {
    const store = createProgressStore(null)
    store.openLesson('the-arc')
    expect(store.getSnapshot().lastLessonId).toBe('the-arc')
    expect(store.isPersistent()).toBe(false)
  })
})

describe('parseProgress', () => {
  it('loads an old save without a range setup', () => {
    const loaded = parseProgress('{"version":1,"lessons":{"the-arc":{"step":"reward","predictions":[],"medals":[],"stampEarnedAt":"saved"}}}')
    expect(loaded.range).toBeUndefined()
    expect(loaded.lessons['the-arc'].stampEarnedAt).toBe('saved')
  })

  it('drops the whole damaged range while keeping lessons', () => {
    const lessons = { 'the-arc': { step: 'reward', predictions: [], medals: [], stampEarnedAt: 'saved' } }
    for (const key of ['speed', 'angleDeg', 'airDensity', 'mass', 'diameter'] as const) {
      for (const bad of [undefined, null, '30', true, NaN, Infinity, -Infinity]) {
        const loaded = parseProgress(JSON.stringify({ version: 1, lessons, range: { ...rangeSetup, [key]: bad } }))
        expect(loaded.range).toBeUndefined()
        expect(loaded.lessons).toEqual(lessons)
      }
    }
    for (const air of [undefined, null, 'true', 1]) {
      const loaded = parseProgress(JSON.stringify({ version: 1, lessons, range: { ...rangeSetup, air } }))
      expect(loaded.range).toBeUndefined()
      expect(loaded.lessons).toEqual(lessons)
    }
    expect(parseProgress('{"version":1,"lessons":{},"range":{"speed":1e400,"angleDeg":30,"air":true,"airDensity":0.6,"mass":0.145,"diameter":74}}').range).toBeUndefined()
  })

  it('starts fresh on missing, damaged or other-version data', () => {
    for (const json of [null, '', '{', '[]', '{"version":2,"lessons":{}}', '{"version":1}']) {
      expect(parseProgress(json)).toEqual({ version: 1, lessons: {} })
    }
  })

  it('drops invalid fields but keeps the valid ones', () => {
    const json = JSON.stringify({
      version: 1,
      lastLessonId: 'the-arc',
      lessons: {
        'the-arc': {
          step: 'flying',
          predictions: [
            { id: 'ok', value: { x: 3 }, confidence: 'certain', outcome: 'matched', at: 't' },
            { id: 'bad-confidence', value: 1, confidence: 'very', at: 't' },
            { id: 'bad-outcome', value: 1, confidence: 'guess', outcome: 'won', at: 't' },
          ],
          stampEarnedAt: 42,
          myth: { variant: 'nope', predictionId: 'ok' },
          medals: ['prove-gold', 'bronze', 'play-gold:far-flag'],
        },
        spin: 'not an object',
      },
    })
    expect(parseProgress(json)).toEqual({
      version: 1,
      lastLessonId: 'the-arc',
      lessons: {
        'the-arc': {
          step: 'recall',
          predictions: [
            { id: 'ok', value: { x: 3 }, confidence: 'certain', outcome: 'matched', at: 't' },
            { id: 'bad-outcome', value: 1, confidence: 'guess', at: 't' },
          ],
          medals: ['prove-gold', 'play-gold:far-flag'],
        },
      },
    })
  })
})
