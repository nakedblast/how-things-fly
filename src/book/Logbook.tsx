import { Suspense, useState } from 'react'
import { MYTH_FIGURES } from '../lessons/registry'
import { LESSONS } from './lessons'
import { href } from './router'
import { Stamp } from './Stamp'
import { progressStore, useProgress } from './useProgress'

export function Logbook() {
  const progress = useProgress()
  const [confirming, setConfirming] = useState(false)
  const stamped = LESSONS.filter((l) => progress.lessons[l.id]?.stampEarnedAt)
  const notes = LESSONS.flatMap((l) => {
    const saved = progress.lessons[l.id]
    return saved?.myth ? [{ lesson: l, variant: saved.myth.variant }] : []
  })
  const hasProgress = Object.keys(progress.lessons).length > 0 || progress.lastLessonId !== undefined

  return (
    <main className="page">
      <h1 tabIndex={-1}>Apprentice's logbook</h1>
      {!progressStore.isPersistent() && (
        <p className="notice" role="status">
          This browser is not letting the book save, so your logbook will be cleared when you close or reload the page.
        </p>
      )}

      <section aria-labelledby="qualifications">
        <h2 id="qualifications">
          Qualifications <span className="count">{stamped.length} of {LESSONS.length}</span>
        </h2>
        <p className="hint">A stamp is pressed when you pass a lesson's final challenge.</p>
        {LESSONS.filter((l) => l.built).every((l) => progress.lessons[l.id]?.stampEarnedAt) && (
          <p className="result result-pass">Range qualification complete</p>
        )}
        <ul className="stamp-grid">
          {LESSONS.map((l) => {
            const earned = Boolean(progress.lessons[l.id]?.stampEarnedAt)
            return (
              <li key={l.id}>
                <a href={href({ name: 'lesson', id: l.id })} className="stamp-link">
                  <Stamp lesson={l} earned={earned} />
                  <span className="stamp-caption">{l.title.split(':')[0]}</span>
                  {!l.built && !earned && <span className="stamp-soon">coming soon</span>}
                </a>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="field-notes">
        <h2 id="field-notes">Field notes</h2>
        {notes.length === 0 ? (
          <p className="hint">
            Every lesson takes on one myth about flight. Whatever you predict, its card is filed here, with your own
            prediction next to what really happened.
          </p>
        ) : (
          <ul className="cards">
            {notes.map(({ lesson, variant }) => {
              const Figure = MYTH_FIGURES[lesson.id]
              return (
              <li key={lesson.id} className={variant === 'changed-my-mind' ? 'card card-changed' : 'card'}>
                <p className="card-variant">{variant === 'changed-my-mind' ? 'Changed my mind' : 'Saw through it'}</p>
                <h3>{lesson.myth}</h3>
                <p className="card-source">
                  Lesson {lesson.number}: {lesson.title}
                </p>
                {Figure && (
                  <Suspense fallback={null}>
                    <Figure />
                  </Suspense>
                )}
              </li>
              )
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="equipment">
        <h2 id="equipment">Range equipment issued</h2>
        {stamped.length === 0 ? (
          <p className="hint">Each qualification issues one new control for the proving ground, for good.</p>
        ) : (
          <ul className="equipment">
            {stamped.map((l) => (
              <li key={l.id}>
                {l.unlocks} <span className="hint">(lesson {l.number})</span>
              </li>
            ))}
          </ul>
        )}
        <p>
          <a href={href({ name: 'proving-ground' })}>Go to the proving ground →</a>
        </p>
      </section>

      <section aria-labelledby="reset" className="reset">
        <h2 id="reset">Start over</h2>
        {confirming ? (
          <div className="row" role="group" aria-label="Confirm reset">
            <p>Clear every stamp, field note and saved place in this browser? This cannot be undone.</p>
            <button
              type="button"
              className="button button-danger"
              onClick={() => {
                progressStore.reset()
                setConfirming(false)
              }}
            >
              Yes, clear my progress
            </button>
            <button type="button" className="button" onClick={() => setConfirming(false)}>
              Keep it
            </button>
          </div>
        ) : (
          <button type="button" className="button" disabled={!hasProgress} onClick={() => setConfirming(true)}>
            Reset progress
          </button>
        )}
      </section>
    </main>
  )
}
