import { describe, expect, it } from 'vitest'
import { controlState, EQUIPMENT, type Equipment } from './equipment'
import { createProgressStore, emptyProgress } from './progress'

function equipment(id: string): Equipment {
  return EQUIPMENT.find((e) => e.id === id)!
}

describe('controlState', () => {
  it('locks working equipment from a built lesson until its stamp is earned', () => {
    expect(controlState(equipment('speed'), emptyProgress())).toBe('locked')
    expect(controlState(equipment('angle'), emptyProgress())).toBe('locked')
  })

  it('issues working equipment when its lesson stamp is earned', () => {
    const store = createProgressStore(null)
    store.awardStamp('the-arc')
    expect(controlState(equipment('speed'), store.getSnapshot())).toBe('issued')
    expect(controlState(equipment('angle'), store.getSnapshot())).toBe('issued')
    expect(controlState(equipment('air'), store.getSnapshot())).toBe('early-issue')
  })

  it('issues working equipment early while its lesson is not built', () => {
    for (const id of ['air', 'airDensity', 'mass', 'diameter']) {
      expect(controlState(equipment(id), emptyProgress())).toBe('early-issue')
    }
    const store = createProgressStore(null)
    store.awardStamp('air-fights-back')
    expect(controlState(equipment('air'), store.getSnapshot())).toBe('issued')
  })

  it('keeps unbuilt equipment unavailable even with its lesson stamp', () => {
    const store = createProgressStore(null)
    for (const e of EQUIPMENT.filter((e) => !e.working)) {
      expect(controlState(e, store.getSnapshot())).toBe('not-yet-built')
      store.awardStamp(e.lessonId)
      expect(controlState(e, store.getSnapshot())).toBe('not-yet-built')
    }
  })
})
