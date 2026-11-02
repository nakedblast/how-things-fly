import { ACTS, LESSONS, type Lesson } from './lessons'
import type { Progress } from './progress'
import { href } from './router'
import { Stamp } from './Stamp'
import { useProgress } from './useProgress'

const STEP_NAMES = {
  recall: 'Recall',
  hook: 'Range task',
  predict: 'Predict',
  test: 'Test',
  explain: 'Explain',
  play: 'Play',
  prove: 'Prove',
  reward: 'Reward',
} as const

function lessonStatus(lesson: Lesson, progress: Progress): string {
  const saved = progress.lessons[lesson.id]
  if (saved?.stampEarnedAt) return 'Stamp earned'
  if (!lesson.built) return 'Coming soon'
  if (saved) return `In progress: ${STEP_NAMES[saved.step]}`
  return 'Not started'
}

export function Contents() {
  const progress = useProgress()
  const acts = [...new Set(LESSONS.map((l) => l.act))]

  return (
    <main className="page">
      <h1 tabIndex={-1}>Contents</h1>
      {acts.map((act) => (
        <section key={act} className="act" aria-labelledby={`act-${act}`}>
          <h2 id={`act-${act}`}>
            Act {act}: {ACTS[act]}
          </h2>
          <ol className="toc">
            {LESSONS.filter((l) => l.act === act).map((lesson) => {
              const status = lessonStatus(lesson, progress)
              return (
                <li key={lesson.id} className={lesson.built ? 'toc-entry' : 'toc-entry toc-soon'} value={lesson.number}>
                  <Stamp lesson={lesson} earned={Boolean(progress.lessons[lesson.id]?.stampEarnedAt)} size={56} />
                  <div>
                    <a className="toc-title" href={href({ name: 'lesson', id: lesson.id })}>
                      {lesson.number}. {lesson.title}
                    </a>
                    <p className="toc-hook">{lesson.hook}</p>
                    <p className="toc-status">{status}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
      <section className="act" aria-labelledby="appendix">
        <h2 id="appendix">Always open</h2>
        <ul className="toc toc-plain">
          <li>
            <a className="toc-title" href={href({ name: 'proving-ground' })}>
              The proving ground
            </a>
            <p className="toc-hook">The shared range where your issued equipment lives. Try any shot, any time.</p>
          </li>
          <li>
            <a className="toc-title" href={href({ name: 'logbook' })}>
              Your logbook
            </a>
            <p className="toc-hook">Qualifications, field notes and the equipment you have been issued.</p>
          </li>
        </ul>
      </section>
    </main>
  )
}
