import { useState, type ReactNode } from 'react'
import { PlaybackControls, Step } from '../../book/lesson/kit'
import { usePlayback } from '../../book/lesson/playback'
import { AttitudeStrip, Portrait } from './DartDrawing'
import { behaviourText } from './views'
import { MarkKey } from './Explain'
import { FIN_RANGE, FINS_AT_TAIL, margin, rangeDart, rangeShot, WEIGHT_RANGE, type DartShot } from './scenario'
import { ShotView } from './ShotView'

/** Fins count as "in the middle" with their leading edge this close to halfway along. */
const MIDDLE = { min: 0.22, max: 0.36 }
const cm = (m: number) => Math.round(m * 100)

interface Fired {
  id: number
  weightX: number
  finLE: number
  shot: DartShot
}

export function Play({ onNext }: { onNext: () => void }) {
  const [weightX, setWeightX] = useState(0.3)
  const [finLE, setFinLE] = useState(FINS_AT_TAIL)
  const [shots, setShots] = useState<Fired[]>([])
  const current = shots.at(-1)

  const tumbled = shots.find((s) => s.shot.behaviour === 'tumble')
  const middle = shots.find((s) => s.finLE >= MIDDLE.min && s.finLE <= MIDDLE.max && s.shot.behaviour === 'true')
  const wobbled = shots.find((s) => s.shot.behaviour === 'wobble')

  function fire() {
    setShots([...shots, { id: (current?.id ?? 0) + 1, weightX, finLE, shot: rangeShot(weightX, finLE) }])
  }

  const design = rangeDart(weightX, finLE)
  return (
    <Step title="Play">
      <p>Now both the weight and the fins slide. These goals are only suggestions.</p>
      <ul className="goals">
        <GoalItem done={Boolean(tumbled)}>Make the dart tumble.</GoalItem>
        <GoalItem done={Boolean(middle)}>Move the fins to the middle of the tube, and still make it fly true.</GoalItem>
        <GoalItem done={Boolean(wobbled)}>Find the edge: make it wobble without tumbling.</GoalItem>
      </ul>
      <figure className="figure">
        <Portrait
          projectile={design}
          marks="both"
          label={`Your design: weight ${cm(weightX)} cm and fins ${cm(finLE)} cm behind the nose. Balance point ${cm(design.dart.xcg)} cm, push point ${cm(design.dart.aero.xcp)} cm.`}
        />
        <figcaption className="hint">
          Balance point {cm(design.dart.xcg)} cm behind the nose, push point {cm(design.dart.aero.xcp)} cm:{' '}
          {margin(design) > 0 ? 'the push point is behind.' : 'the push point is in front.'}
        </figcaption>
      </figure>
      <MarkKey />
      <div className="controls">
        <label>
          Weight: {cm(weightX)} cm behind the nose
          <input type="range" min={WEIGHT_RANGE.min} max={WEIGHT_RANGE.max} step={0.01} value={weightX} onChange={(e) => setWeightX(Number(e.target.value))} />
        </label>
        <label>
          Fins: front edge {cm(finLE)} cm behind the nose
          <input type="range" min={FIN_RANGE.min} max={FIN_RANGE.max} step={0.01} value={finLE} onChange={(e) => setFinLE(Number(e.target.value))} />
        </label>
        <button type="button" className="button button-primary" onClick={fire}>
          Fire
        </button>
      </div>
      {current && <LiveShot key={current.id} fired={current} />}
      {!current && <p className="readout">No shots yet.</p>}
      {tumbled && <p className="found">Weight {cm(tumbled.weightX)} cm, fins {cm(tumbled.finLE)} cm: the balance point sat behind the push point, and over it went.</p>}
      {middle && <p className="found">Fins in the middle at {cm(middle.finLE)} cm still worked, because the weight at {cm(middle.weightX)} cm kept the balance point ahead of them.</p>}
      {wobbled && <p className="found">Weight {cm(wobbled.weightX)} cm, fins {cm(wobbled.finLE)} cm: the two points almost met, so the air barely steadied it.</p>}
      <p className="hint">When you are ready, the final challenge earns the stamp.</p>
      <button type="button" className="button button-primary" onClick={onNext}>
        Go to the challenge
      </button>
    </Step>
  )
}

function LiveShot({ fired }: { fired: Fired }) {
  const { shot } = fired
  const playback = usePlayback(shot.duration, { startSlow: false })
  const describe = `Weight ${cm(fired.weightX)} cm, fins ${cm(fired.finLE)} cm: the dart ${behaviourText(shot)}.`
  return (
    <>
      <ShotView shot={shot} t={playback.t} label={describe} />
      <PlaybackControls playback={playback} duration={shot.duration} />
      <p aria-live="polite" className="readout">
        {playback.t >= shot.duration ? `${describe} It landed ${shot.flight.range.toFixed(1)} m away.` : 'In flight…'}
      </p>
      <AttitudeStrip shot={shot} upTo={playback.t} label="The last shot at equal time steps, each drawn with its direction of travel to the right." />
    </>
  )
}

function GoalItem({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <li className={done ? 'goal goal-done' : 'goal'}>
      <span className="goal-box" aria-hidden="true">
        {done ? '✓' : ''}
      </span>
      {children}
      <span className="visually-hidden">{done ? ' (done)' : ' (not yet)'}</span>
    </li>
  )
}
