import { useState } from 'react'
import type { LessonStep } from '../progress'
import { progressStore, useProgress } from '../useProgress'

export const STEP_LABELS: Record<LessonStep, string> = {
  recall: 'Recall',
  hook: 'Range task',
  predict: 'Predict',
  test: 'Test',
  explain: 'Explain',
  play: 'Play',
  prove: 'Prove',
  reward: 'Reward',
}

export interface LessonFlow {
  steps: readonly LessonStep[]
  /** The step on screen. */
  current: LessonStep
  /** The furthest step reached; saved, so the learner comes back to it. */
  furthest: LessonStep
  reached(step: LessonStep): boolean
  goTo(step: LessonStep): void
  next(): void
}

/**
 * Walks a lesson's steps in order (see LESSON_DESIGN.md, "The lesson loop"). The learner may go
 * back to any step already reached; going forward past the furthest step saves it.
 */
export function useLessonFlow(lessonId: string, steps: readonly LessonStep[]): LessonFlow {
  const saved = useProgress().lessons[lessonId]
  const furthest = saved && steps.includes(saved.step) ? saved.step : steps[0]
  const [current, setCurrent] = useState<LessonStep>(furthest)
  const index = (s: LessonStep) => steps.indexOf(s)

  function goTo(step: LessonStep) {
    if (index(step) > index(furthest)) progressStore.setStep(lessonId, step)
    setCurrent(step)
    // Bring the new step into view and hand it to screen readers.
    requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('.lesson-step h2')
      heading?.focus({ preventScroll: true })
      heading?.scrollIntoView({ block: 'start', behavior: 'auto' })
    })
  }

  return {
    steps,
    current,
    furthest,
    reached: (s) => index(s) <= index(furthest),
    goTo,
    next: () => {
      const i = index(current)
      if (i < steps.length - 1) goTo(steps[i + 1])
    },
  }
}
