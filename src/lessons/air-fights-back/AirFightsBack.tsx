import { useEffect, useState } from 'react'
import { lessonById } from '../../book/lessons'
import {
  ConfidencePicker,
  Flap,
  PlaybackControls,
  Recall,
  Sources,
  Step,
  StepNav,
  type RecallQuestion,
} from '../../book/lesson/kit'
import { usePlayback } from '../../book/lesson/playback'
import { Reward } from '../../book/lesson/Reward'
import { useLessonFlow } from '../../book/lesson/useLessonFlow'
import type { Confidence, LessonStep } from '../../book/progress'
import { progressStore, useProgress } from '../../book/useProgress'
import { size } from '../../scenes/frame'
import { ExplainAngle, ExplainCore, ExplainDeeper, ExplainHistory } from './Explain'
import { FieldScene, GroundTick, Marker } from './FieldScene'
import { polyline, predictedDescent } from './geometry'
import { MythFigure } from './MythFigure'
import { Play } from './Play'
import { Prove } from './Prove'
import { landingOutcome, LESSON_ID, MAIN, MAIN_FRAME, MAIN_VACUUM_RANGE, MARKER_MAX, STROBE } from './scenario'
import { SOURCES } from './sources'

const STEPS: readonly LessonStep[] = ['recall', 'hook', 'predict', 'test', 'explain', 'play', 'prove', 'reward']

const APEX = { x: MAIN.apexX, y: MAIN.apexY }
const WAY_UP = MAIN.path.samples.filter((s) => s.t <= MAIN.apexTime).map((s) => s.pos).concat(APEX)

export default function AirFightsBack() {
  const flow = useLessonFlow(LESSON_ID, STEPS)
  return (
    <div className="lesson">
      <StepNav flow={flow} />
      {flow.current === 'recall' && <Recall questions={RECALL} onNext={flow.next} />}
      {flow.current === 'hook' && <Hook onNext={flow.next} />}
      {flow.current === 'predict' && <Predict locked={flow.reached('test')} onNext={flow.next} />}
      {flow.current === 'test' && <Test onNext={flow.next} />}
      {flow.current === 'explain' && <Explain onNext={flow.next} />}
      {flow.current === 'play' && <Play onNext={flow.next} />}
      {flow.current === 'prove' && <Prove onPassed={flow.next} />}
      {flow.current === 'reward' && (
        <Reward
          lesson={lessonById(LESSON_ID)!}
          figure={<MythFigure />}
          unlockNote="Switch the air on or off and set its density, from a vacuum to air thicker than at sea level."
          changedNote="You started out expecting the way down to mirror the way up, as it does in a vacuum and in Galileo's parabola, and then proved what air really does."
        />
      )}
      <Sources sources={SOURCES} />
    </div>
  )
}

// --- Recall ------------------------------------------------------------------------------------

const RECALL: readonly RecallQuestion[] = [
  {
    id: 'best-angle',
    question: 'With no air, which launch angle sends a shot furthest?',
    options: [
      { value: '30', label: '30°' },
      { value: '45', label: '45°' },
      { value: '60', label: '60°' },
    ],
    answer: '45',
    explain: 'It balances climbing, which keeps the ball up, with moving along.',
  },
  {
    id: 'fired-dropped',
    question: 'A ball fired level from a cliff and a ball dropped beside it at the same moment: which lands first?',
    options: [
      { value: 'fired', label: 'The fired ball' },
      { value: 'dropped', label: 'The dropped ball' },
      { value: 'same', label: 'They land together' },
    ],
    answer: 'same',
    explain: 'Falling depends only on time; moving sideways does not change it.',
  },
]

// --- Hook --------------------------------------------------------------------------------------

/** The way up, drawn, with the ball resting at the top. */
function WayUp({ highlight }: { highlight?: boolean }) {
  const r = size(MAIN_FRAME, 1)
  return (
    <>
      <polyline points={polyline(WAY_UP)} className="sv-real" />
      <circle cx={APEX.x} cy={-APEX.y} r={r} className="sv-ball" />
      {highlight && (
        <text x={APEX.x} y={-APEX.y - size(MAIN_FRAME, 2.5)} fontSize={size(MAIN_FRAME, 2.6)} textAnchor="middle" className="sv-label">
          the top
        </text>
      )}
    </>
  )
}

function Hook({ onNext }: { onNext: () => void }) {
  return (
    <Step title="Range task">
      <FieldScene frame={MAIN_FRAME} label="A ball machine fires a tennis ball 45 degrees up. Its path is drawn as far as the top of the flight.">
        <WayUp highlight />
      </FieldScene>
      <p className="lede">
        In lesson 1 there was no air. Now there is. A ball machine fires a tennis ball at {MAIN.speed} m/s, 45° up. Here is
        its way up, as far as the top. Does the way down mirror the way up?
      </p>
      <button type="button" className="button button-primary" onClick={onNext}>
        Make your prediction
      </button>
    </Step>
  )
}

// --- Predict -----------------------------------------------------------------------------------

interface LandingValue {
  x: number
}

function Predict({ locked, onNext }: { locked: boolean; onNext: () => void }) {
  const saved = useProgress().lessons[LESSON_ID]?.predictions.find((p) => p.id === 'landing')
  const [x, setX] = useState<number | null>(null)
  const [confidence, setConfidence] = useState<Confidence | null>(null)

  if (locked && saved) {
    const v = saved.value as unknown as LandingValue
    return (
      <Step title="Your prediction">
        <p>
          You put the landing marker <strong>{v.x} m</strong> from the machine.
        </p>
        <FieldScene frame={MAIN_FRAME} label={`Your prediction: the ball lands ${v.x} metres away.`}>
          <WayUp />
          <polyline points={polyline(predictedDescent(APEX, v.x))} className="sv-ghost" />
          <Marker x={v.x} frame={MAIN_FRAME} label="your marker" />
        </FieldScene>
        <p className="hint">Predictions are locked once the test has run, so your logbook keeps what you first thought.</p>
        <button type="button" className="button button-primary" onClick={onNext}>
          Back to the test
        </button>
      </Step>
    )
  }

  const min = Math.ceil(MAIN.apexX) + 1
  const shown = x ?? min

  function commit() {
    progressStore.recordPrediction(LESSON_ID, {
      id: 'landing',
      value: { x: shown },
      confidence: confidence!,
      at: new Date().toISOString(),
    })
    onNext()
  }

  return (
    <Step title="Predict: where does it land?">
      <p>Slide the marker to where you think the ball lands. The dashed line shows the way down that your marker implies.</p>
      <FieldScene frame={MAIN_FRAME} label={x === null ? 'The way up, with no marker placed yet.' : `Your marker, ${shown} metres from the machine.`}>
        <WayUp />
        {x !== null && <polyline points={polyline(predictedDescent(APEX, shown))} className="sv-ghost" />}
        {x !== null && <Marker x={shown} frame={MAIN_FRAME} label={`${shown} m`} />}
      </FieldScene>
      <div className="controls">
        <label className="marker-input">
          <span>Lands at {x === null ? '?' : `${shown} m`}</span>
          <input
            type="range"
            min={min}
            max={MARKER_MAX}
            value={shown}
            onChange={(e) => setX(Number(e.target.value))}
            // Choosing the starting value moves nothing, so a click or key press there still counts.
            onPointerUp={(e) => setX(Number(e.currentTarget.value))}
            onKeyUp={(e) => e.key !== 'Tab' && e.key !== 'Shift' && setX(Number(e.currentTarget.value))}
          />
        </label>
      </div>
      <p className="hint">The top of the flight is {MAIN.apexX.toFixed(0)} m from the machine.</p>
      <ConfidencePicker name="landing-confidence" value={confidence} onChange={setConfidence} />
      <button type="button" className="button button-primary" disabled={x === null || !confidence} onClick={commit}>
        {x === null ? 'Place the marker first' : 'Commit and fire'}
      </button>
    </Step>
  )
}

// --- Test --------------------------------------------------------------------------------------

function Test({ onNext }: { onNext: () => void }) {
  const saved = useProgress().lessons[LESSON_ID]?.predictions.find((p) => p.id === 'landing')
  const guess = (saved?.value as unknown as LandingValue | undefined)?.x
  const duration = MAIN.path.flightTime
  const playback = usePlayback(duration)
  const t = playback.t
  const done = t >= duration
  const f = MAIN_FRAME

  useEffect(() => {
    if (saved && !saved.outcome) progressStore.setOutcome(LESSON_ID, 'landing', landingOutcome((saved.value as unknown as LandingValue).x))
  }, [saved])

  const trail = MAIN.path.samples.filter((s) => s.t <= t).map((s) => s.pos)
  const ball = MAIN.path.positionAt(t)
  const strobes: number[] = []
  for (let s = STROBE; s <= Math.min(t, duration); s += STROBE) strobes.push(s)
  const down = duration - MAIN.apexTime
  const off = guess !== undefined ? guess - MAIN.range : 0

  return (
    <Step title="Test: fire!">
      <FieldScene frame={f} label="The tennis ball's real flight, with your predicted way down as a dashed line.">
        {guess !== undefined && <polyline points={polyline(predictedDescent(APEX, guess))} className="sv-ghost" />}
        {guess !== undefined && <Marker x={guess} frame={f} label="your marker" />}
        {done && <GroundTick x={MAIN.mirrorX} frame={f} label="mirror" />}
        <polyline points={polyline(trail)} className="sv-real" />
        {strobes.map((s) => {
          const p = MAIN.path.positionAt(s)
          return <circle key={s} cx={p.x} cy={-p.y} r={size(f, 0.5)} className="sv-strobe" style={{ strokeWidth: size(f, 0.15) }} />
        })}
        <circle cx={ball.x} cy={-ball.y} r={size(f, 1)} className="sv-ball" />
      </FieldScene>
      <ul className="legend">
        <li>
          <span className="key key-real" /> the ball's real path
        </li>
        <li>
          <span className="key key-ghost" /> your prediction
        </li>
        <li>
          <span className="key key-strobe" /> the ball every quarter second
        </li>
      </ul>
      <PlaybackControls playback={playback} duration={duration} />
      <p aria-live="polite" className="readout">
        {done
          ? `Landed ${MAIN.range.toFixed(1)} m away. The way up covered ${MAIN.apexX.toFixed(1)} m along the ground in ${MAIN.apexTime.toFixed(1)} s; the way down only ${(MAIN.range - MAIN.apexX).toFixed(1)} m, in ${down.toFixed(1)} s. It left at 45° and came down at ${MAIN.impactAngleDeg.toFixed(0)}°.`
          : `${t.toFixed(2)} s: ${ball.x.toFixed(1)} m out, ${ball.y.toFixed(1)} m up.`}
      </p>
      {done && guess !== undefined && (
        <p>
          Your marker was at {guess} m,{' '}
          {Math.abs(off) < 1 ? 'right on it' : `${Math.abs(off).toFixed(1)} m ${off > 0 ? 'too far' : 'too short'}`}. A mirror-image way
          down would have landed at {MAIN.mirrorX.toFixed(1)} m. Watch the strobe marks bunch up after the top.
        </p>
      )}
      {done && (
        <p className="hint">
          Without air, as in lesson 1, the same launch would have carried {MAIN_VACUUM_RANGE.toFixed(0)} m.
        </p>
      )}
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
      <Flap title="Why the way down is shorter and steeper" open>
        <ExplainCore />
      </Flap>
      <Flap title="Why the best angle drops below 45°">
        <ExplainAngle />
      </Flap>
      <Flap title="Why “the way down mirrors the way up” seemed right">
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
