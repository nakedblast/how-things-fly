import { useSyncExternalStore } from 'react'
import { lessonById } from './lessons'

// Hash routes keep the book a static site (no server rewrites needed on GitHub Pages).
export type Route =
  | { name: 'cover' }
  | { name: 'contents' }
  | { name: 'lesson'; id: string }
  | { name: 'logbook' }
  | { name: 'proving-ground' }

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  switch (parts[0]) {
    case 'contents':
      return { name: 'contents' }
    case 'logbook':
      return { name: 'logbook' }
    case 'proving-ground':
      return { name: 'proving-ground' }
    case 'lesson':
      if (parts[1] && lessonById(parts[1])) return { name: 'lesson', id: parts[1] }
      return { name: 'contents' }
    default:
      return { name: 'cover' }
  }
}

export function href(route: Route): string {
  switch (route.name) {
    case 'cover':
      return '#/'
    case 'lesson':
      return `#/lesson/${route.id}`
    default:
      return `#/${route.name}`
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return parseHash(hash)
}
