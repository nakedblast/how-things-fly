import { Suspense, useEffect } from 'react'
import { LESSON_MODULES } from '../lessons/registry'
import { ACTS, LESSONS, lessonById } from './lessons'
import { href } from './router'
import { progressStore } from './useProgress'

export function LessonPage({ id }: { id: string }) {
  const lesson = lessonById(id)!
  const index = LESSONS.indexOf(lesson)
  const prev = LESSONS[index - 1]
  const next = LESSONS[index + 1]
  const Module = lesson.built ? LESSON_MODULES[lesson.id] : undefined

  useEffect(() => {
    progressStore.openLesson(id)
  }, [id])

  return (
    <main className="page">
      <p className="kicker">
        Lesson {lesson.number} · Act {lesson.act}: {ACTS[lesson.act]}
      </p>
      <h1 tabIndex={-1}>{lesson.title}</h1>
      {Module ? (
        <Suspense fallback={<p className="hint">Opening the lesson…</p>}>
          <Module />
        </Suspense>
      ) : (
        <section className="brief" aria-label="Range task">
          <h2>Range task</h2>
          <p>{lesson.hook}</p>
        </section>
      )}
      {!Module && (
        <section className="soon">
          <h2>Coming soon</h2>
          <p>
            This lesson is still being written. When it is ready, passing it issues new range equipment:{' '}
            <strong>{lesson.unlocks.toLowerCase()}</strong>. Until then it is already available in the proving ground.
          </p>
        </section>
      )}
      <nav className="pager" aria-label="Lessons">
        {prev ? (
          <a href={href({ name: 'lesson', id: prev.id })} rel="prev">
            ← {prev.number}. {prev.title}
          </a>
        ) : (
          <a href={href({ name: 'contents' })}>← Contents</a>
        )}
        {next ? (
          <a href={href({ name: 'lesson', id: next.id })} rel="next">
            {next.number}. {next.title} →
          </a>
        ) : (
          <a href={href({ name: 'logbook' })}>Logbook →</a>
        )}
      </nav>
    </main>
  )
}
