import { useSyncExternalStore } from 'react'
import { browserStorage, createProgressStore, STORAGE_KEY, type Progress } from './progress'

export const progressStore = createProgressStore(browserStorage())

// Another tab of the book changed progress: pick it up here too.
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY || e.key === null) progressStore.reload()
})

export function useProgress(): Progress {
  return useSyncExternalStore(progressStore.subscribe, progressStore.getSnapshot)
}
