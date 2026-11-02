import { lessonById, LESSONS } from './lessons'
import { href } from './router'
import { useProgress } from './useProgress'

export function Cover() {
  const progress = useProgress()
  const last = progress.lastLessonId ? lessonById(progress.lastLessonId) : undefined
  const stamps = LESSONS.filter((l) => progress.lessons[l.id]?.stampEarnedAt).length

  return (
    <main className="cover">
      <p className="cover-kicker">A field guide to things that fly</p>
      <h1 tabIndex={-1}>Far and True</h1>
      <p className="cover-lede">
        You have just signed on as an apprentice at the proving ground, where people have tested flight for
        centuries. Ten short lessons, each ending in a qualification.
      </p>
      <nav className="cover-actions" aria-label="Start reading">
        {last ? (
          <>
            <a className="button button-primary" href={href({ name: 'lesson', id: last.id })}>
              Continue: {last.number}. {last.title}
            </a>
            <a className="button" href={href({ name: 'contents' })}>
              Contents
            </a>
          </>
        ) : (
          <a className="button button-primary" href={href({ name: 'contents' })}>
            Open the book
          </a>
        )}
        <a className="button" href={href({ name: 'logbook' })}>
          Logbook{stamps > 0 ? ` (${stamps} of ${LESSONS.length} stamps)` : ''}
        </a>
      </nav>
    </main>
  )
}
