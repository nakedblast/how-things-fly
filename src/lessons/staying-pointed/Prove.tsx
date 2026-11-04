import { useState, type ReactNode } from 'react'
import { Choices, HintLadder, PlaybackControls, Step } from '../../book/lesson/kit'
import { usePlayback } from '../../book/lesson/playback'
import { progressStore } from '../../book/useProgress'
import { AttitudeStrip, Portrait } from './DartDrawing'
import { behaviourText } from './views'
import { ExplainCore, ExplainHeavyEnd } from './Explain'
import {
  cameraDart,
  CAMERA_POSITIONS,
  DART,
  FIN_RANGE,
  fly,
  GOLD_MARGIN,
  LESSON_ID,
  margin,
  TURN_SETS,
  type DartShot,
  type TurnItem,
} from './scenario'
import { ShotView } from './ShotView'

export function Prove({ onPassed }: { onPassed: () => void }) {
  const [turnDone, setTurnDone] = useState(false)
  const [finDone, setFinDone] = useState(false)
  const [finGold, setFinGold] = useState(false)

  function qualify() {
    const lesson = progressStore.lesson(LESSON_ID)
    const myth = lesson.predictions.find((p) => p.id === 'weight' && p.outcome === 'myth')
    progressStore.fileMythCard(LESSON_ID, myth ? 'changed-my-mind' : 'saw-through-it', 'weight')
    if (finGold) progressStore.awardMedal(LESSON_ID, 'prove-gold')
    progressStore.awardStamp(LESSON_ID)
    onPassed()
  }

  return (
    <Step title="Prove it">
      <p>Two new situations, with projectiles you have not flown yet. Retry as often as you like.</p>
      <TurnChallenge done={turnDone} onPass={() => setTurnDone(true)} />
      {turnDone && (
        <FinChallenge
          done={finDone}
          onPass={(gold) => {
            setFinGold(gold)
            setFinDone(true)
          }}
        />
      )}
      {turnDone && finDone && (
        <div className="passed">
          <p>
            Both puzzles solved.
            {finGold ? ' The camera dart was trimmed within the tight margin, too: a precision medal.' : ''}
          </p>
          <button type="button" className="button button-primary" onClick={qualify}>
            Collect your stamp
          </button>
        </div>
      )}
    </Step>
  )
}

// --- Puzzle 1: will it turn round? -------------------------------------------------------------

type Answer = 'keeps' | 'turns'

const WHY: Record<string, string> = {
  'shuttle-back': 'Its heavy cork is at the back and its feather skirt, which catches the air, is in front: the push point leads the balance point, so it flips round, cork first.',
  'arrow-front': 'With the feathers right behind the point, the push point is near the front, ahead of the balance point, so it swings round.',
  'dart-mid': 'The fins are only halfway back, but the weight at the nose keeps the balance point well ahead of them.',
  'arrow-back': 'Backwards, the feathers lead and the heavy point trails: the push point is in front, so the arrow swings round to fly point first.',
  'shuttle-front': 'Cork first, the balance point is ahead of the skirt that catches the air, so it stays as it is.',
  'camera-tail': 'The camera pulls the balance point back, but the fins at the very tail keep the push point behind it.',
}

function TurnChallenge({ done, onPass }: { done: boolean; onPass: () => void }) {
  const [variant, setVariant] = useState(0)
  const items = TURN_SETS[variant]
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [fired, setFired] = useState<{ item: TurnItem; shot: DartShot }[] | null>(null)
  const [result, setResult] = useState<ReactNode>(null)
  const [misses, setMisses] = useState(0)
  const [rung, setRung] = useState(0)
  const complete = items.every((i) => answers[i.id])

  function check() {
    const shots = items.map((item) => ({ item, shot: fly(item.projectile, item.launch) }))
    setFired(shots)
    const wrong = shots.filter(({ item, shot }) => (answers[item.id] === 'turns') !== shot.turnedRound)
    setResult(
      wrong.length === 0 ? (
        <p>All three right. Each one ends with its balance point leading its push point.</p>
      ) : (
        <>
          <p>
            {wrong.length === 1 ? 'One' : wrong.length === 2 ? 'Two' : 'All three'} of your answers did not match what happened:
          </p>
          <ul className="result-lines">
            {wrong.map(({ item, shot }) => (
              <li key={item.id}>
                {item.name}, {item.leading}, {shot.turnedRound ? 'turned round' : 'kept pointing the way it started'}.
              </li>
            ))}
          </ul>
          <p>For each one, ask which end the air pushes on more, and which end is heavier.</p>
        </>
      ),
    )
    if (wrong.length === 0) onPass()
    else setMisses((m) => m + 1)
  }

  function freshVariant() {
    setVariant(1)
    setAnswers({})
    setFired(null)
    setResult(null)
    setMisses(0)
    setRung(0)
  }

  return (
    <section className="puzzle" aria-labelledby="turn-puzzle">
      <h3 id="turn-puzzle">Puzzle 1{variant > 0 ? ': a new set' : ''}: will it turn round?</h3>
      <p>
        Each is drawn flying to the right, the way it is launched, with its balance point marked. Will it keep pointing
        this way, or turn round?
      </p>
      {items.map((item) => (
        <div key={item.id} className={rung >= 1 ? 'turn-item sv-highlight' : 'turn-item'}>
          <Portrait
            projectile={item.projectile}
            marks="cg"
            reversed={Math.abs(item.launch.alphaDeg) > 90}
            label={`${item.name}, ${item.leading}, flying to the right, with its balance point marked.`}
          />
          <Choices<Answer>
            legend={
              <>
                {item.name}, {item.leading}
              </>
            }
            name={`turn-${item.id}`}
            options={[
              { value: 'keeps', label: 'Keeps pointing this way' },
              { value: 'turns', label: 'Turns round' },
            ]}
            value={answers[item.id] ?? null}
            onChange={(v) => setAnswers({ ...answers, [item.id]: v })}
            disabled={done}
          />
          {fired && <TurnResult entry={fired.find((f) => f.item.id === item.id)!} />}
        </div>
      ))}
      {!done && (
        <button type="button" className="button button-primary" disabled={!complete} onClick={check}>
          {complete ? (fired ? 'Launch again' : 'Launch all three') : 'Answer all three first'}
        </button>
      )}
      {result && (
        <div className={done ? 'result result-pass' : 'result'} role="status">
          {result}
        </div>
      )}
      {!done && (
        <HintLadder
          misses={misses}
          rung={rung}
          onOpen={setRung}
          rungs={{
            lookHere: <p>Look at each balance point (highlighted), then at where each one has the most surface for the air to push on.</p>,
            remember: <ExplainCore />,
            oneStep: <p>Feathers, fins and skirts catch the air, so the push point sits near them. If they are in front of the balance point, it turns round.</p>,
            showMe: (
              <>
                <ul className="result-lines">
                  {items.map((item) => (
                    <li key={item.id}>
                      {item.name}, {item.leading}: {WHY[item.id]}
                    </li>
                  ))}
                </ul>
                {variant === 0 && (
                  <button type="button" className="button" onClick={freshVariant}>
                    Try a new set
                  </button>
                )}
              </>
            ),
          }}
        />
      )}
    </section>
  )
}

function TurnResult({ entry }: { entry: { item: TurnItem; shot: DartShot } }) {
  const { item, shot } = entry
  return (
    <div className="turn-result">
      <AttitudeStrip
        shot={shot}
        label={`${item.name}, ${item.leading}: it ${shot.turnedRound ? 'turned round' : 'kept pointing the way it started'}.`}
      />
      <p className="hint">
        {shot.turnedRound ? 'Turned round.' : 'Kept pointing this way.'} {WHY[item.id]}
      </p>
    </div>
  )
}

// --- Puzzle 2: fin the camera dart -------------------------------------------------------------

const cm = (m: number) => Math.round(m * 100)

function FinChallenge({ done, onPass }: { done: boolean; onPass: (gold: boolean) => void }) {
  const [variant, setVariant] = useState(0)
  const cameraX = CAMERA_POSITIONS[variant]
  const [finLE, setFinLE] = useState<number | null>(null)
  const [fired, setFired] = useState<{ id: number; shot: DartShot } | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [misses, setMisses] = useState(0)
  const [rung, setRung] = useState(0)

  const shown = finLE ?? FIN_RANGE.min
  const design = cameraDart(cameraX, shown)
  const gap = (design.dart.aero.xcp - design.dart.xcg) * 100
  const goldGap = { min: GOLD_MARGIN.min * DART.diameter * 100, max: GOLD_MARGIN.max * DART.diameter * 100 }

  function check() {
    const shot = fly(design)
    setFired({ id: (fired?.id ?? 0) + 1, shot })
    const m = margin(design)
    const pass = shot.behaviour === 'true'
    const gold = pass && m >= GOLD_MARGIN.min && m <= GOLD_MARGIN.max
    setResult(
      pass
        ? gold
          ? `It flies true, and the push point sits ${gap.toFixed(1)} cm behind the balance point: stable without being stiff. Precision medal.`
          : `It flies true: the push point sits ${gap.toFixed(1)} cm behind the balance point. (Between ${goldGap.min.toFixed(1)} and ${goldGap.max.toFixed(1)} cm earns a precision medal: stable, but not so stiff it swings round to face every gust. You can stop here.)`
        : `It ${behaviourText(shot)}. With the fins at ${cm(shown)} cm, the push point is ${gap > 0 ? `only ${gap.toFixed(1)} cm behind` : `${Math.abs(gap).toFixed(1)} cm in front of`} the balance point.`,
    )
    if (pass) onPass(gold)
    else setMisses((n) => n + 1)
  }

  function freshVariant() {
    setVariant(1)
    setFinLE(null)
    setFired(null)
    setResult(null)
    setMisses(0)
    setRung(0)
  }

  return (
    <section className="puzzle" aria-labelledby="fin-puzzle">
      <h3 id="fin-puzzle">Puzzle 2{variant > 0 ? ': a new one' : ''}: fin the camera dart</h3>
      <p>
        This dart carries a heavy camera, fixed {cm(cameraX)} cm behind the nose, and no sliding weight. Its balance point is
        marked. Slide the fins to where it will fly true.
      </p>
      <figure className={rung >= 1 ? 'figure sv-highlight' : 'figure'}>
        <Portrait projectile={design} marks="cg" label={`The camera dart with its fins ${cm(shown)} cm behind the nose; its balance point is ${cm(design.dart.xcg)} cm behind the nose.`} />
        <figcaption className="hint">Balance point {cm(design.dart.xcg)} cm behind the nose.</figcaption>
      </figure>
      <div className="controls">
        <label className="marker-input">
          <span>Fins: front edge {finLE === null ? '?' : `${cm(shown)} cm behind the nose`}</span>
          <input
            type="range"
            min={FIN_RANGE.min}
            max={FIN_RANGE.max}
            step={0.01}
            value={shown}
            disabled={done}
            onChange={(e) => setFinLE(Number(e.target.value))}
            onPointerUp={(e) => setFinLE(Number(e.currentTarget.value))}
            onKeyUp={(e) => e.key !== 'Tab' && e.key !== 'Shift' && setFinLE(Number(e.currentTarget.value))}
          />
        </label>
      </div>
      {fired && <FinShot key={fired.id} shot={fired.shot} />}
      {!done && (
        <button type="button" className="button button-primary" disabled={finLE === null} onClick={check}>
          {finLE === null ? 'Place the fins first' : fired ? 'Fire again' : 'Commit and fire'}
        </button>
      )}
      {result && (
        <p className={done ? 'result result-pass' : 'result'} role="status">
          {result}
        </p>
      )}
      {!done && (
        <HintLadder
          misses={misses}
          rung={rung}
          onOpen={setRung}
          rungs={{
            lookHere: <p>Look at where the balance point is (highlighted): the camera has pulled it back.</p>,
            remember: <ExplainHeavyEnd />,
            oneStep: <p>The fins carry the push point with them. They have to sit far enough behind the balance point, at {cm(design.dart.xcg)} cm, for the push to swing the nose back.</p>,
            showMe: (
              <>
                <p>
                  Slide the fins back until their front edge is a few centimetres behind the balance point, or right to the tail
                  at {cm(FIN_RANGE.max)} cm. Then the push point is behind the balance point and the dart flies true.
                </p>
                {variant === 0 && (
                  <button type="button" className="button" onClick={freshVariant}>
                    Try a new one
                  </button>
                )}
              </>
            ),
          }}
        />
      )}
    </section>
  )
}

function FinShot({ shot }: { shot: DartShot }) {
  const playback = usePlayback(shot.duration, { startSlow: false })
  return (
    <>
      <ShotView shot={shot} t={playback.t} marks={playback.t >= shot.duration ? 'both' : undefined} label={`The camera dart in flight: it ${behaviourText(shot)}.`} />
      <PlaybackControls playback={playback} duration={shot.duration} />
      <AttitudeStrip shot={shot} upTo={playback.t} label="The camera dart at equal time steps, each drawn with its direction of travel to the right." />
    </>
  )
}
