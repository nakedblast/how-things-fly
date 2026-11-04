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
import { AttitudeStrip, Portrait } from './DartDrawing'
import { behaviourText } from './views'
import { ExplainCore, ExplainDeeper, ExplainHeavyEnd, ExplainHistory, MarkKey } from './Explain'
import { MythFigure } from './MythFigure'
import { Play } from './Play'
import { Prove } from './Prove'
import { ARROW, LESSON_ID, MAIN_LAUNCH, rangeDart, rangeShot, stopX, weightOutcome, WEIGHT_STOPS, type WeightStop } from './scenario'
import { ShotView } from './ShotView'
import { SOURCES } from './sources'

const STEPS: readonly LessonStep[] = ['recall', 'hook', 'predict', 'test', 'explain', 'play', 'prove', 'reward']

export default function StayingPointed() {
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
          unlockNote="Swap the range ball for a finned dart, weight at the nose, and watch which way it points as it flies."
          changedNote="You started out putting the weight at the back, like a tail, as almost everyone does from watching things hang, and then proved that the heavy end has to lead."
        />
      )}
      <Sources sources={SOURCES} />
    </div>
  )
}

// --- Recall ------------------------------------------------------------------------------------

const RECALL: readonly RecallQuestion[] = [
  {
    id: 'way-down',
    question: 'With air, how does a ball’s way down compare with its way up?',
    options: [
      { value: 'mirror', label: 'A mirror image' },
      { value: 'steeper', label: 'Shorter and steeper' },
      { value: 'longer', label: 'Longer and flatter' },
    ],
    answer: 'steeper',
    explain: 'The air has slowed it by the top, so it covers less ground coming down and drops more steeply.',
  },
  {
    id: 'twice-speed',
    question: 'A ball flies twice as fast. How much harder does the air push on it?',
    options: [
      { value: '2', label: 'Twice as hard' },
      { value: '4', label: 'Four times as hard' },
      { value: '1', label: 'Just as hard' },
    ],
    answer: '4',
    explain: 'Drag grows with the square of the speed.',
  },
]

// --- Hook --------------------------------------------------------------------------------------

function Hook({ onNext }: { onNext: () => void }) {
  return (
    <Step title="Range task">
      <figure className="figure">
        <Portrait projectile={ARROW} label="An arrow: a heavy point at the front, feathers at the back." />
      </figure>
      <p className="lede">Why does an arrow carry its feathers at the back and not at the front?</p>
      <p>
        The range has a training dart to find out with: a 60 cm tube with four fins at one end and a heavy brass weight
        that slides along it. The launcher fires it at {MAIN_LAUNCH.speed} m/s, {MAIN_LAUNCH.elevationDeg}° up.
      </p>
      <figure className="figure">
        <Portrait projectile={rangeDart(0.3)} label="The training dart: a tube with fins at one end and a sliding weight, here in the middle." />
      </figure>
      <button type="button" className="button button-primary" onClick={onNext}>
        Make your prediction
      </button>
    </Step>
  )
}

// --- Predict -----------------------------------------------------------------------------------

interface WeightValue {
  stop: WeightStop
}

function savedStop(): WeightStop | undefined {
  const saved = progressStore.lesson(LESSON_ID).predictions.find((p) => p.id === 'weight')
  return (saved?.value as unknown as WeightValue | undefined)?.stop
}

const stopLabel = (s: WeightStop) => WEIGHT_STOPS.find((w) => w.value === s)!.label.toLowerCase()

function Predict({ locked, onNext }: { locked: boolean; onNext: () => void }) {
  const saved = useProgress().lessons[LESSON_ID]?.predictions.find((p) => p.id === 'weight')
  const [index, setIndex] = useState<number | null>(null)
  const [confidence, setConfidence] = useState<Confidence | null>(null)

  if (locked && saved) {
    const stop = (saved.value as unknown as WeightValue).stop
    return (
      <Step title="Your prediction">
        <p>
          You put the weight <strong>{stopLabel(stop)}</strong>.
        </p>
        <figure className="figure">
          <Portrait projectile={rangeDart(stopX(stop))} label={`Your dart, with the weight ${stopLabel(stop)}.`} />
        </figure>
        <p className="hint">Predictions are locked once the test has run, so your logbook keeps what you first thought.</p>
        <button type="button" className="button button-primary" onClick={onNext}>
          Back to the test
        </button>
      </Step>
    )
  }

  const stop = WEIGHT_STOPS[index ?? 1]
  function commit() {
    progressStore.recordPrediction(LESSON_ID, {
      id: 'weight',
      value: { stop: stop.value },
      confidence: confidence!,
      at: new Date().toISOString(),
    })
    onNext()
  }

  return (
    <Step title="Predict: where does the weight go?">
      <p>
        The fins stay at the tail. Slide the weight to where you think the dart will fly straightest, nose first, all the
        way to the ground.
      </p>
      <figure className="figure">
        <Portrait projectile={rangeDart(stop.x)} label={`The dart with the weight ${stop.label.toLowerCase()}.`} />
      </figure>
      <div className="controls">
        <label className="marker-input">
          <span>Weight: {index === null ? '?' : stop.label.toLowerCase()}</span>
          <input
            type="range"
            min={0}
            max={2}
            step={1}
            value={index ?? 1}
            aria-valuetext={stop.label}
            onChange={(e) => setIndex(Number(e.target.value))}
            // Choosing the starting value moves nothing, so a click or key press there still counts.
            onPointerUp={(e) => setIndex(Number(e.currentTarget.value))}
            onKeyUp={(e) => e.key !== 'Tab' && e.key !== 'Shift' && setIndex(Number(e.currentTarget.value))}
          />
        </label>
        <p className="hint stop-scale" aria-hidden="true">
          <span>nose end</span>
          <span>middle</span>
          <span>fin end</span>
        </p>
      </div>
      <ConfidencePicker name="weight-confidence" value={confidence} onChange={setConfidence} />
      <button type="button" className="button button-primary" disabled={index === null || !confidence} onClick={commit}>
        {index === null ? 'Slide the weight first' : 'Commit and fire'}
      </button>
    </Step>
  )
}

// --- Test --------------------------------------------------------------------------------------

function Test({ onNext }: { onNext: () => void }) {
  const saved = useProgress().lessons[LESSON_ID]?.predictions.find((p) => p.id === 'weight')
  const stop = (saved?.value as unknown as WeightValue | undefined)?.stop ?? 'middle'
  const shot = rangeShot(stopX(stop))
  const playback = usePlayback(shot.duration)
  const t = playback.t
  const done = t >= shot.duration

  useEffect(() => {
    if (saved && !saved.outcome) progressStore.setOutcome(LESSON_ID, 'weight', weightOutcome((saved.value as unknown as WeightValue).stop))
  }, [saved])

  const now = shot.sampleAt(t)
  const off = Math.abs(now.alpha) * (180 / Math.PI)

  return (
    <Step title="Test: fire!">
      <ShotView
        shot={shot}
        t={t}
        ghost
        marks={done ? 'both' : undefined}
        label={`Your dart, weight ${stopLabel(stop)}, in flight. Dashed outlines show it pointing exactly along its path.`}
      />
      <ul className="legend">
        <li>
          <span className="key key-real" /> the dart's path and where it really points
        </li>
        <li>
          <span className="key key-ghost" /> nose-first: pointing exactly along the path
        </li>
      </ul>
      <PlaybackControls playback={playback} duration={shot.duration} />
      <p aria-live="polite" className="readout">
        {done
          ? `Landed ${shot.flight.range.toFixed(1)} m away. With the weight ${stopLabel(stop)} the dart ${behaviourText(shot)}.`
          : `${t.toFixed(2)} s: the nose points ${off.toFixed(0)}° off the direction of travel${off > 90 ? ', tail first' : ''}.`}
      </p>
      <h3>Which way it points, step by step</h3>
      <AttitudeStrip shot={shot} upTo={t} label="Your dart at equal time steps, each drawn with its direction of travel to the right." />
      {done && (
        <>
          <p>
            Now the hidden part. The half-filled circle is the dart's balance point; the arrow is its push point, where the
            air pushes when the dart turns off its path.
          </p>
          <MarkKey />
          <h3>All three weight positions</h3>
          {WEIGHT_STOPS.map((w) => {
            const s = rangeShot(w.x)
            return (
              <div key={w.value} className="compare">
                <p>
                  <strong>{w.label}</strong>
                  {w.value === stop && ' (yours)'}: the dart {behaviourText(s)}.
                </p>
                <AttitudeStrip shot={s} marks="both" label={`Weight ${w.label.toLowerCase()}: it ${s.behaviour === 'tumble' ? 'tumbles' : 'stays nose first'}.`} />
              </div>
            )
          })}
        </>
      )}
      <button type="button" className="button button-primary" onClick={onNext}>
        Why did that happen?
      </button>
    </Step>
  )
}

// --- Explain -----------------------------------------------------------------------------------

function Explain({ onNext }: { onNext: () => void }) {
  const stop = savedStop() ?? 'middle'
  return (
    <Step title="Explain">
      <Flap title="Balance point and push point" open>
        <ExplainCore />
      </Flap>
      <Flap title="Why the heavy end leads">
        <ExplainHeavyEnd />
      </Flap>
      <Flap title="Why “the heavy end trails” seemed right">
        <ExplainHistory />
      </Flap>
      <Flap title="The numbers" deeper>
        <ExplainDeeper projectile={rangeDart(stopX(stop))} />
      </Flap>
      <button type="button" className="button button-primary" onClick={onNext}>
        Try it on the range
      </button>
    </Step>
  )
}
