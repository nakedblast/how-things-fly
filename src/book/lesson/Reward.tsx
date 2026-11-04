import type { ReactNode } from 'react'
import type { Lesson } from '../lessons'
import { href } from '../router'
import { Stamp } from '../Stamp'
import { useProgress } from '../useProgress'
import { Step } from './kit'
import { reducedMotion } from './playback'

/**
 * The end of a lesson: the stamp is pressed, the myth card is filed and the new control is issued.
 * Skippable; everything shown here stays in the logbook.
 */
export function Reward({
  lesson,
  figure,
  unlockNote,
  stampBook,
  changedNote = 'You started out with the old idea, the same one gunners held for centuries, and then proved the real one.',
}: {
  lesson: Lesson
  figure: ReactNode
  unlockNote: string
  /** Optional capstone stamp-book section. */
  stampBook?: ReactNode
  /** The "Changed my mind" sentence: who else held the old idea. */
  changedNote?: string
}) {
  const saved = useProgress().lessons[lesson.id]
  const changed = saved?.myth?.variant === 'changed-my-mind'
  const medals = saved?.medals ?? []

  return (
    <Step title="Qualified">
      <div className={reducedMotion ? 'reward-stamp' : 'reward-stamp stamp-press'}>
        <Stamp lesson={lesson} earned={Boolean(saved?.stampEarnedAt)} size={160} />
      </div>
      <p className="lede">
        Stamp pressed: <strong>{lesson.title}</strong>.
        {medals.length > 0 && ` With ${medals.length === 1 ? 'a precision medal' : `${medals.length} precision medals`}.`}
      </p>

      <section className={changed ? 'card card-changed' : 'card'} aria-labelledby="reward-card">
        <p className="card-variant">{changed ? 'Changed my mind' : 'Saw through it'}</p>
        <h3 id="reward-card">Field note: {lesson.myth}</h3>
        <p>
          {changed
            ? changedNote
            : 'You never fell for it: your prediction already had the real idea.'}
        </p>
        {figure}
      </section>

      {stampBook}
      <section className="issued" aria-labelledby="reward-issued">
        <h3 id="reward-issued">Range equipment issued: {lesson.unlocks.toLowerCase()}</h3>
        <p>{unlockNote}</p>
        <p className="row">
          <a className="button button-primary" href={href({ name: 'proving-ground' })}>
            Go to the proving ground
          </a>
          <a className="button" href={href({ name: 'logbook' })}>
            Open the logbook
          </a>
        </p>
      </section>
    </Step>
  )
}
