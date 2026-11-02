import { lazy, Suspense, useEffect, useRef } from 'react'
import { Contents } from './book/Contents'
import { Cover } from './book/Cover'
import { LessonPage } from './book/LessonPage'
import { Logbook } from './book/Logbook'
import { href, useRoute, type Route } from './book/router'

// The proving ground pulls in the simulation views; load it only when it is opened.
const ProvingGround = lazy(() => import('./ProvingGround'))

const NAV: { route: Route; label: string }[] = [
  { route: { name: 'contents' }, label: 'Contents' },
  { route: { name: 'logbook' }, label: 'Logbook' },
  { route: { name: 'proving-ground' }, label: 'Proving ground' },
]

export default function App() {
  const route = useRoute()
  const key = href(route)
  const firstRender = useRef(true)

  // On each page change, start at the top and move focus to the new heading for screen readers.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo(0, 0)
    document.querySelector<HTMLElement>('main h1')?.focus()
  }, [key])

  if (route.name === 'proving-ground') {
    return (
      <Suspense fallback={<p className="loading">Opening the proving ground…</p>}>
        <ProvingGround />
      </Suspense>
    )
  }

  return (
    <div className="book">
      {route.name !== 'cover' && (
        <header className="topbar">
          <a className="topbar-title" href={href({ name: 'cover' })}>
            Far and True
          </a>
          <nav aria-label="Book">
            {NAV.map((item) => (
              <a key={item.label} href={href(item.route)} aria-current={item.route.name === route.name ? 'page' : undefined}>
                {item.label}
              </a>
            ))}
          </nav>
        </header>
      )}
      {route.name === 'cover' && <Cover />}
      {route.name === 'contents' && <Contents />}
      {route.name === 'lesson' && <LessonPage key={route.id} id={route.id} />}
      {route.name === 'logbook' && <Logbook />}
    </div>
  )
}
