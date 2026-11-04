// Building blocks every lesson uses, so each lesson follows the same loop and looks the same.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Confidence } from '../progress'
import { reducedMotion, type Playback } from './playback'
import { STEP_LABELS, type LessonFlow } from './useLessonFlow'

/** The lesson's steps as a row of tabs; steps not reached yet are shown but not clickable. */
export function StepNav({ flow }: { flow: LessonFlow }) {
  return (
    <nav aria-label="Lesson steps">
      <ol className="step-nav">
        {flow.steps.map((s, i) => {
          const here = s === flow.current
          return (
            <li key={s}>
              <button
                type="button"
                className={here ? 'step-tab step-here' : 'step-tab'}
                aria-current={here ? 'step' : undefined}
                disabled={!flow.reached(s)}
                onClick={() => flow.goTo(s)}
              >
                <span className="step-num">{i + 1}</span> {STEP_LABELS[s]}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** One step of the loop: its heading takes focus when the step opens. */
export function Step({ title, children }: { title: string; children: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null)
  // A step can replace itself (a committed prediction opens the next part): if the control that
  // had focus went with it, keyboard and screen-reader users continue from the new heading.
  useEffect(() => {
    const active = document.activeElement
    if (!active || active === document.body || !active.isConnected) heading.current?.focus({ preventScroll: true })
  }, [title])
  return (
    <section className="lesson-step">
      <h2 ref={heading} tabIndex={-1}>{title}</h2>
      {children}
    </section>
  )
}

/** A lift-the-flap explanation. `deeper` flaps hold the optional maths. */
export function Flap({
  title,
  children,
  open,
  deeper,
}: {
  title: string
  children: ReactNode
  open?: boolean
  deeper?: boolean
}) {
  return (
    <details className={deeper ? 'flap flap-deeper' : 'flap'} open={open}>
      <summary>
        {deeper && <span className="flap-tag">Deeper</span>}
        {title}
      </summary>
      <div className="flap-body">{children}</div>
    </details>
  )
}

const CONFIDENCE: { value: Confidence; label: string }[] = [
  { value: 'guess', label: 'Just a guess' },
  { value: 'fairly-sure', label: 'Fairly sure' },
  { value: 'certain', label: 'Certain' },
]

export function ConfidencePicker({
  name,
  value,
  onChange,
}: {
  name: string
  value: Confidence | null
  onChange: (c: Confidence) => void
}) {
  return (
    <fieldset className="choices choices-inline">
      <legend>How sure are you?</legend>
      {CONFIDENCE.map((c) => (
        <label key={c.value} className="choice">
          <input type="radio" name={name} checked={value === c.value} onChange={() => onChange(c.value)} />
          {c.label}
        </label>
      ))}
    </fieldset>
  )
}

export function Choices<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  disabled,
}: {
  legend: ReactNode
  name: string
  options: readonly { value: T; label: ReactNode }[]
  value: T | null
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <fieldset className="choices" disabled={disabled}>
      <legend>{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className="choice">
          <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} />
          {o.label}
        </label>
      ))}
    </fieldset>
  )
}

export interface HintRungs {
  /** 1. Highlights the variable that matters (the lesson shows the highlight while `rung >= 1`). */
  lookHere: ReactNode
  /** 2. Reopens the relevant explanation. */
  remember: ReactNode
  /** 3. The first step of the solution. */
  oneStep: ReactNode
  /** 4. The full solution; the lesson then poses a fresh variant. */
  showMe: ReactNode
}

const RUNG_NAMES = ['Look here', 'Remember', 'One step', 'Show me'] as const

/**
 * The hint ladder (LESSON_DESIGN.md, "Wrong answers and hints"): after each miss one more rung is
 * offered, never forced. `misses` counts misses; `rung` is how many hints the learner has opened.
 */
export function HintLadder({
  misses,
  rung,
  onOpen,
  rungs,
}: {
  misses: number
  rung: number
  onOpen: (rung: number) => void
  rungs: HintRungs
}) {
  if (misses === 0) return null
  const bodies = [rungs.lookHere, rungs.remember, rungs.oneStep, rungs.showMe]
  const offered = Math.min(misses, 4)
  return (
    <div className="hints" aria-live="polite">
      {bodies.slice(0, rung).map((body, i) => (
        <div key={i} className="hint-rung">
          <p className="hint-name">{RUNG_NAMES[i]}</p>
          {body}
        </div>
      ))}
      {rung < offered && (
        <button type="button" className="button" onClick={() => onOpen(rung + 1)}>
          Hint: {RUNG_NAMES[rung].toLowerCase()}
        </button>
      )}
    </div>
  )
}

export interface Source {
  label: string
  url: string
  note?: string
}

export function Sources({ sources }: { sources: readonly Source[] }) {
  return (
    <details className="sources">
      <summary>Sources</summary>
      <ul>
        {sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.label}
            </a>
            {s.note && <span className="hint"> · {s.note}</span>}
          </li>
        ))}
      </ul>
    </details>
  )
}

/** Play, slow motion, replay and a time scrubber for a `usePlayback` clock. */
export function PlaybackControls({ playback, duration }: { playback: Playback; duration: number }) {
  const p = playback
  return (
    <div className="playback">
      <button type="button" className="button" onClick={p.playing ? p.pause : p.play}>
        {p.playing ? 'Pause' : p.t >= duration ? 'Play again' : 'Play'}
      </button>
      <button type="button" className="button" onClick={p.replay}>
        Replay
      </button>
      {!reducedMotion && (
        <label className="choice">
          <input type="checkbox" checked={p.slow} onChange={(e) => p.setSlow(e.target.checked)} />
          Slow motion
        </label>
      )}
      <label className="scrub">
        <span>Time {p.t.toFixed(1)} s</span>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.05}
          value={p.t}
          onChange={(e) => p.seek(Number(e.target.value))}
        />
      </label>
    </div>
  )
}

export interface RecallQuestion {
  id: string
  question: ReactNode
  options: readonly { value: string; label: ReactNode }[]
  answer: string
  /** One or two sentences, shown with the answer whatever the learner chose. */
  explain: ReactNode
}

/**
 * Retrieval practice on earlier lessons (LESSON_DESIGN.md, step "Recall"): never graded or saved;
 * the answer is shown as soon as the learner picks one.
 */
export function Recall({ questions, onNext }: { questions: readonly RecallQuestion[]; onNext: () => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  return (
    <Step title="Recall">
      <p>Two quick questions from earlier lessons. Nothing is scored.</p>
      {questions.map((q) => {
        const picked = answers[q.id]
        return (
          <div key={q.id} className="recall">
            <Choices
              legend={q.question}
              name={`recall-${q.id}`}
              options={q.options}
              value={picked ?? null}
              onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
              disabled={picked !== undefined}
            />
            {picked !== undefined && (
              <p className={picked === q.answer ? 'result result-pass' : 'result'} role="status">
                {picked === q.answer ? 'Yes. ' : `It's “${labelText(q, q.answer)}”. `}
                {q.explain}
              </p>
            )}
          </div>
        )
      })}
      <button type="button" className="button button-primary" onClick={onNext}>
        On to the range task
      </button>
    </Step>
  )
}

function labelText(q: RecallQuestion, value: string): ReactNode {
  return q.options.find((o) => o.value === value)?.label
}
