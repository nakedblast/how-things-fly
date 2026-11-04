import { useEffect, useRef, useState } from 'react'
import { lessonById } from '../../book/lessons'
import {
  Choices,
  ConfidencePicker,
  Flap,
  PlaybackControls,
  Sources,
  Step,
  StepNav,
} from '../../book/lesson/kit'
import { usePlayback } from '../../book/lesson/playback'
import { Reward } from '../../book/lesson/Reward'
import { useLessonFlow } from '../../book/lesson/useLessonFlow'
import type { Confidence, LessonStep, Prediction, PredictionOutcome } from '../../book/progress'
import { progressStore, useProgress } from '../../book/useProgress'
import { vacuumPositionAt, vacuumTrajectory } from '../../physics/trajectory'
import { CliffScene } from './CliffScene'
import { ExplainCore, ExplainDeeper, ExplainHistory } from './Explain'
import { MythFigure } from './MythFigure'
import { Play } from './Play'
import { Prove } from './Prove'
import {
  BALL_R,
  CLIFF_HEIGHT,
  DROP_X,
  DROPPED,
  FALL_TIME,
  FIRED,
  FIRED_RANGE,
  LESSON_ID,
  STROBE,
} from './scenario'
import { classifyPath, pathPoints, presetPath, simplify, sketchProblem, type PathShape, type Point } from './sketch'
import { SOURCES } from './sources'

const STEPS: readonly LessonStep[] = ['hook', 'predict', 'test', 'explain', 'play', 'prove', 'reward']

export default function TheArc() {
  const flow = useLessonFlow(LESSON_ID, STEPS)
  return (
    <div className="lesson">
      <StepNav flow={flow} />
      {flow.current === 'hook' && <Hook onNext={flow.next} />}
      {flow.current === 'predict' && <Predict locked={flow.reached('test')} onNext={flow.next} />}
      {flow.current === 'test' && <Test onNext={flow.next} />}
      {flow.current === 'explain' && <Explain onNext={flow.next} />}
      {flow.current === 'play' && <Play onNext={flow.next} />}
      {flow.current === 'prove' && <Prove onPassed={flow.next} />}
      {flow.current === 'reward' && (
        <Reward lesson={lessonById(LESSON_ID)!} figure={<MythFigure />} unlockNote="Set any launch speed and angle you like." />
      )}
      <Sources sources={SOURCES} />
    </div>
  )
}

function Hook({ onNext }: { onNext: () => void }) {
  return (
    <Step title="Range task">
      <CliffScene label="A cannon on top of a 40 metre cliff, pointing level out to sea." />
      <p className="lede">
        Your first job at the range. A cannon on a cliff fires a ball straight out to sea. At the same moment, a ball is
        dropped from the same height. Which hits the water first?
      </p>
      <button type="button" className="button button-primary" onClick={onNext}>
        Make your prediction
      </button>
    </Step>
  )
}

// --- Predict -----------------------------------------------------------------------------------

type Which = 'fired' | 'dropped' | 'same'
const WHICH: { value: Which; label: string }[] = [
  { value: 'fired', label: 'The fired ball' },
  { value: 'dropped', label: 'The dropped ball' },
  { value: 'same', label: 'Both at the same time' },
]
const SHAPES: { value: PathShape; label: string }[] = [
  { value: 'impetus', label: 'Straight out, then down' },
  { value: 'arc', label: 'A smooth curve, steeper and steeper' },
  { value: 'other', label: 'A straight slope down to the water' },
]

interface SketchValue {
  points: Point[]
  shape: PathShape
  via: 'sketch' | 'choice'
}

function savedPrediction(predictions: Prediction[], id: string) {
  return predictions.find((p) => p.id === id)
}

function Predict({ locked, onNext }: { locked: boolean; onNext: () => void }) {
  const saved = useProgress().lessons[LESSON_ID]?.predictions ?? []
  const which = savedPrediction(saved, 'which-first')
  const sketch = savedPrediction(saved, 'sketch')

  if (locked && which && sketch) {
    const value = sketch.value as unknown as SketchValue
    return (
      <Step title="Your prediction">
        <p>
          You said: <strong>{WHICH.find((w) => w.value === which.value)?.label.toLowerCase()}</strong> hits the water
          first, and drew this path for the fired ball.
        </p>
        <CliffScene label="Your sketch of the fired ball's path.">
          <polyline points={pathPoints(value.points)} className="sv-ghost" />
        </CliffScene>
        <p className="hint">Predictions are locked once the test has run, so your logbook keeps what you first thought.</p>
        <button type="button" className="button button-primary" onClick={onNext}>
          Back to the test
        </button>
      </Step>
    )
  }
  return which ? <PredictPath onNext={onNext} /> : <PredictWhich />
}

function PredictWhich() {
  const [choice, setChoice] = useState<Which | null>(null)
  const [confidence, setConfidence] = useState<Confidence | null>(null)
  return (
    <Step title="Predict: which lands first?">
      <Choices legend="Which ball hits the water first?" name="which" options={WHICH} value={choice} onChange={setChoice} />
      <ConfidencePicker name="which-confidence" value={confidence} onChange={setConfidence} />
      <button
        type="button"
        className="button button-primary"
        disabled={!choice || !confidence}
        onClick={() =>
          progressStore.recordPrediction(LESSON_ID, {
            id: 'which-first',
            value: choice!,
            confidence: confidence!,
            at: new Date().toISOString(),
          })
        }
      >
        Commit
      </button>
    </Step>
  )
}

function PredictPath({ onNext }: { onNext: () => void }) {
  const [mode, setMode] = useState<'draw' | 'pick'>('draw')
  const [points, setPoints] = useState<Point[]>([])
  const [picked, setPicked] = useState<PathShape | null>(null)
  const [confidence, setConfidence] = useState<Confidence | null>(null)
  const drawing = useRef(false)

  const path = mode === 'draw' ? points : picked ? presetPath(picked, CLIFF_HEIGHT, 65) : []
  const problem = mode === 'draw' ? sketchProblem(points, 8, CLIFF_HEIGHT * 0.6) : picked ? null : 'Pick a shape.'

  function toWorld(e: React.PointerEvent<SVGSVGElement>): Point | null {
    const ctm = e.currentTarget.getScreenCTM()
    if (!ctm) return null
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return [p.x, Math.max(0, -p.y)]
  }

  function commit() {
    const shape = mode === 'draw' ? classifyPath(points) : picked!
    const value: SketchValue = { points: simplify(path), shape, via: mode === 'draw' ? 'sketch' : 'choice' }
    progressStore.recordPrediction(LESSON_ID, {
      id: 'sketch',
      value: value as unknown as Prediction['value'],
      confidence: confidence!,
      at: new Date().toISOString(),
    })
    onNext()
  }

  return (
    <Step title="Predict: the fired ball's path">
      <p>
        {mode === 'draw'
          ? 'Draw the path you think the fired ball takes, from the cannon down to the water.'
          : 'Pick the shape closest to the path you think the fired ball takes.'}
      </p>
      <CliffScene
        label={mode === 'draw' ? 'Drawing area: the cliff and the sea. Draw from the cannon to the water.' : 'The cliff and the sea, with the shape you picked.'}
        className={mode === 'draw' ? 'sketch-pad' : undefined}
        svgProps={
          mode === 'draw'
            ? {
                onPointerDown: (e) => {
                  const p = toWorld(e)
                  if (!p) return
                  e.currentTarget.setPointerCapture(e.pointerId)
                  drawing.current = true
                  // Paths start at the cannon's mouth, wherever the finger first lands.
                  setPoints(Math.hypot(p[0], p[1] - CLIFF_HEIGHT) > 1 ? [[0, CLIFF_HEIGHT], p] : [p])
                },
                onPointerMove: (e) => {
                  if (!drawing.current) return
                  const p = toWorld(e)
                  if (p) setPoints((pts) => [...pts, p])
                },
                onPointerUp: () => {
                  drawing.current = false
                },
                onPointerCancel: () => {
                  drawing.current = false
                },
              }
            : undefined
        }
      >
        {mode === 'draw' && points.length === 0 && (
          <circle cx={0} cy={-CLIFF_HEIGHT} r={BALL_R * 1.6} className="sv-start" />
        )}
        {path.length > 1 && <polyline points={pathPoints(path)} className="sv-sketch" />}
      </CliffScene>
      <div className="row">
        {mode === 'draw' && (
          <button type="button" className="button" disabled={points.length === 0} onClick={() => setPoints([])}>
            Clear
          </button>
        )}
        {/* One button that changes its label, so keyboard focus stays on it. */}
        <button type="button" className="button" onClick={() => setMode(mode === 'draw' ? 'pick' : 'draw')}>
          {mode === 'draw' ? 'Pick a shape instead' : 'Draw it instead'}
        </button>
      </div>
      {mode === 'pick' && (
        <Choices legend="Which shape?" name="shape" options={SHAPES} value={picked} onChange={setPicked} />
      )}
      {mode === 'draw' && points.length > 0 && problem && (
        <p className="hint" role="status">
          {problem}
        </p>
      )}
      <ConfidencePicker name="sketch-confidence" value={confidence} onChange={setConfidence} />
      <button type="button" className="button button-primary" disabled={Boolean(problem) || !confidence} onClick={commit}>
        Commit and fire
      </button>
    </Step>
  )
}

// --- Test --------------------------------------------------------------------------------------

const WHICH_OUTCOME: Record<Which, PredictionOutcome> = { same: 'matched', fired: 'myth', dropped: 'other' }
const SHAPE_OUTCOME: Record<PathShape, PredictionOutcome> = { arc: 'matched', impetus: 'myth', other: 'other' }

function Test({ onNext }: { onNext: () => void }) {
  const saved = useProgress().lessons[LESSON_ID]?.predictions
  const which = saved && savedPrediction(saved, 'which-first')
  const sketchPrediction = saved && savedPrediction(saved, 'sketch')
  const sketch = sketchPrediction?.value as unknown as SketchValue | undefined
  const playback = usePlayback(FALL_TIME)
  const t = playback.t
  const done = t >= FALL_TIME

  // The comparison is the feedback: record how each prediction compares, once.
  useEffect(() => {
    if (which && !which.outcome) progressStore.setOutcome(LESSON_ID, 'which-first', WHICH_OUTCOME[which.value as Which])
    if (sketchPrediction && !sketchPrediction.outcome) {
      const shape = (sketchPrediction.value as unknown as SketchValue).shape
      progressStore.setOutcome(LESSON_ID, 'sketch', SHAPE_OUTCOME[shape])
    }
  }, [which, sketchPrediction])

  const real = vacuumTrajectory(FIRED, 120).filter((s) => s.t <= t)
  const fired = vacuumPositionAt(FIRED, t)
  const dropped = vacuumPositionAt(DROPPED, t)
  const strobes: number[] = []
  for (let s = STROBE; s <= Math.min(t, FALL_TIME); s += STROBE) strobes.push(s)

  const yourWhich = WHICH.find((w) => w.value === which?.value)?.label.toLowerCase()

  return (
    <Step title="Test: fire!">
      <CliffScene label="The fired ball and the dropped ball falling side by side.">
        {sketch && <polyline points={pathPoints(sketch.points)} className="sv-ghost" />}
        <polyline points={real.map((s) => `${s.pos.x},${-s.pos.y}`).join(' ')} className="sv-real" />
        {strobes.map((s) => {
          const a = vacuumPositionAt(FIRED, s)
          const b = vacuumPositionAt(DROPPED, s)
          return (
            <g key={s}>
              <line x1={DROP_X} y1={-b.y} x2={a.x} y2={-a.y} className="sv-strobe-line" />
              <circle cx={a.x} cy={-a.y} r={BALL_R * 0.5} className="sv-strobe" />
              <circle cx={DROP_X} cy={-b.y} r={BALL_R * 0.5} className="sv-strobe" />
            </g>
          )
        })}
        <circle cx={DROP_X} cy={-dropped.y} r={BALL_R} className="sv-ball sv-ball-dropped" />
        <circle cx={fired.x} cy={-fired.y} r={BALL_R} className="sv-ball" />
      </CliffScene>
      <ul className="legend">
        <li>
          <span className="key key-real" /> the fired ball's real path
        </li>
        <li>
          <span className="key key-ghost" /> your sketch
        </li>
        <li>
          <span className="key key-strobe" /> both balls every half second
        </li>
      </ul>
      <PlaybackControls playback={playback} duration={FALL_TIME} />
      <p aria-live="polite" className="readout">
        {done
          ? `Both balls hit the water together, ${FALL_TIME.toFixed(1)} seconds after the shot. The fired ball landed ${FIRED_RANGE.toFixed(0)} m out to sea.`
          : `${t.toFixed(1)} s: both balls are ${(CLIFF_HEIGHT - fired.y).toFixed(1)} m below the cliff top.`}
      </p>
      {done && yourWhich && (
        <p>
          You predicted: {yourWhich}. Compare your sketch, the dashed line, with the real path.
        </p>
      )}
      <p className="hint">There is no air in this test. Air comes into the book in lesson 3.</p>
      <button type="button" className="button button-primary" onClick={onNext}>
        Why did that happen?
      </button>
    </Step>
  )
}

// --- Explain -----------------------------------------------------------------------------------

function Explain({ onNext }: { onNext: () => void }) {
  return (
    <Step title="Explain">
      <Flap title="Why they land together" open>
        <ExplainCore />
      </Flap>
      <Flap title="Why “straight, then drop” seemed right">
        <ExplainHistory />
      </Flap>
      <Flap title="The numbers" deeper>
        <ExplainDeeper />
      </Flap>
      <button type="button" className="button button-primary" onClick={onNext}>
        Try it on the range
      </button>
    </Step>
  )
}
