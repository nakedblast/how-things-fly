import { useMemo, useState, type ReactNode } from 'react'
import { HintLadder, Step } from '../../book/lesson/kit'
import { reducedMotion, usePlayback } from '../../book/lesson/playback'
import { progressStore } from '../../book/useProgress'
import { dragPath, type FlightPath } from '../../physics/path'
import { frameFor, size, type Frame } from '../../scenes/frame'
import { ExplainAngle, ExplainCore } from './Explain'
import { FieldScene, GroundTick, Marker } from './FieldScene'
import { polyline } from './geometry'
import {
  ANGLE_GOLD,
  ANGLE_PAIRS,
  ANGLE_RANGE_TOLERANCE,
  LANDING_PUZZLES,
  LESSON_ID,
  makeShot,
  rangeBallBest,
  rangeBallRange,
  RANGE_BALL,
  type LandingPuzzle,
  type Shot,
} from './scenario'

export function Prove({ onPassed }: { onPassed: () => void }) {
  const [landingDone, setLandingDone] = useState(false)
  const [landingGold, setLandingGold] = useState(false)
  const [anglesDone, setAnglesDone] = useState(false)
  const [anglesGold, setAnglesGold] = useState(false)

  function qualify() {
    const lesson = progressStore.lesson(LESSON_ID)
    const myth = lesson.predictions.find((p) => p.id === 'landing' && p.outcome === 'myth')
    progressStore.fileMythCard(LESSON_ID, myth ? 'changed-my-mind' : 'saw-through-it', 'landing')
    if (landingGold && anglesGold) progressStore.awardMedal(LESSON_ID, 'prove-gold')
    progressStore.awardStamp(LESSON_ID)
    onPassed()
  }

  return (
    <Step title="Prove it">
      <p>Two new situations, with different balls and speeds. Retry as often as you like.</p>
      <LandingChallenge
        done={landingDone}
        onPass={(gold) => {
          setLandingGold(gold)
          setLandingDone(true)
        }}
      />
      {landingDone && (
        <AngleChallenge
          done={anglesDone}
          onPass={(gold) => {
            setAnglesGold(gold)
            setAnglesDone(true)
          }}
        />
      )}
      {landingDone && anglesDone && (
        <div className="passed">
          <p>
            Both puzzles solved.
            {landingGold && anglesGold ? ' Both within the tight margins, too: a precision medal.' : ''}
          </p>
          <button type="button" className="button button-primary" onClick={qualify}>
            Collect your stamp
          </button>
        </div>
      )}
    </Step>
  )
}

// --- Puzzle 1: where does it land? -------------------------------------------------------------

function landingFrame(shot: Shot, puzzle: LandingPuzzle): Frame {
  const width = puzzle.max * 1.08
  return { x0: -width * 0.06, x1: width, top: Math.max(shot.apexY * 1.35, width * 0.3) }
}

function LandingChallenge({ done, onPass }: { done: boolean; onPass: (gold: boolean) => void }) {
  const [variant, setVariant] = useState(0)
  const puzzle = LANDING_PUZZLES[variant]
  const shot = useMemo(() => makeShot(puzzle.projectile, puzzle.speed, puzzle.angleDeg), [puzzle])
  const [marker, setMarker] = useState<number | null>(null)
  const [run, setRun] = useState(0)
  const [result, setResult] = useState<string | null>(null)
  const [misses, setMisses] = useState(0)
  const [rung, setRung] = useState(0)

  const min = Math.ceil(shot.apexX / puzzle.step) * puzzle.step
  const shown = marker ?? min
  const fmt = (x: number) => (puzzle.step < 1 ? x.toFixed(1) : x.toFixed(0))
  const forward = puzzle.speed * Math.cos((puzzle.angleDeg * Math.PI) / 180)

  function check() {
    setRun((r) => r + 1)
    const pass = shown > shot.apexX && shown < shot.mirrorX
    const gold = Math.abs(shown - shot.range) <= 0.1 * shot.range
    const off = shown - shot.range
    setResult(
      pass
        ? `Right: it came down short of the mirror point (${fmt(shot.mirrorX)} m), landing at ${fmt(shot.range)} m. Your marker was ${fmt(Math.abs(off))} m ${off > 0 ? 'too far' : 'too short'}${gold ? ', within 10% of the landing' : ''}.`
        : `It landed at ${fmt(shot.range)} m, short of the mirror point at ${fmt(shot.mirrorX)} m. Your marker at ${fmt(shown)} m assumed the way down was no shorter than the way up. Look at how fast the ball is moving at the top.`,
    )
    if (pass) onPass(gold)
    else setMisses((m) => m + 1)
  }

  function freshVariant() {
    setVariant(1)
    setMarker(null)
    setRun(0)
    setResult(null)
    setMisses(0)
    setRung(0)
  }

  return (
    <section className="puzzle" aria-labelledby="landing-puzzle">
      <h3 id="landing-puzzle">Puzzle 1{variant > 0 ? ': a new one' : ''}</h3>
      <p>
        {puzzle.name}: {puzzle.speed} m/s at {puzzle.angleDeg}°. Its way up is drawn, to the top {fmt(shot.apexX)} m out.
        Place the marker where it lands.
      </p>
      <LandingScene key={`${variant}-${run}`} shot={shot} puzzle={puzzle} marker={marker === null ? null : shown} running={run > 0} highlight={rung >= 1} />
      <div className="controls">
        <label className="marker-input">
          <span>Lands at {marker === null ? '?' : `${fmt(shown)} m`}</span>
          <input
            type="range"
            min={min}
            max={puzzle.max}
            step={puzzle.step}
            value={shown}
            disabled={done}
            onChange={(e) => setMarker(Number(e.target.value))}
            onPointerUp={(e) => setMarker(Number(e.currentTarget.value))}
            onKeyUp={(e) => e.key !== 'Tab' && e.key !== 'Shift' && setMarker(Number(e.currentTarget.value))}
          />
        </label>
      </div>
      {!done && (
        <button type="button" className="button button-primary" disabled={marker === null} onClick={check}>
          {marker === null ? 'Place the marker first' : run === 0 ? 'Commit and fire' : 'Fire again'}
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
            lookHere: <p>Look at the ball's speed at launch and at the top (highlighted).</p>,
            remember: <ExplainCore />,
            oneStep: (
              <p>
                It leaves moving forwards at {forward.toFixed(0)} m/s but reaches the top at only {shot.apexSpeed.toFixed(0)}{' '}
                m/s. The way down starts that slow, so it covers less ground than the way up did.
              </p>
            ),
            showMe: (
              <>
                <p>
                  The way up covered {fmt(shot.apexX)} m. The slower way down covers only {fmt(shot.range - shot.apexX)} m, so
                  the ball lands at {fmt(shot.range)} m: past the top, short of the mirror point at {fmt(shot.mirrorX)} m.
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

function LandingScene({
  shot,
  puzzle,
  marker,
  running,
  highlight,
}: {
  shot: Shot
  puzzle: LandingPuzzle
  marker: number | null
  running: boolean
  highlight: boolean
}) {
  const f = landingFrame(shot, puzzle)
  const s = (p: number) => size(f, p)
  const duration = shot.path.flightTime
  const playback = usePlayback(duration, { autoplay: running, startSlow: false })
  const t = running ? (reducedMotion ? duration : playback.t) : shot.apexTime
  const shownT = Math.max(t, shot.apexTime)
  const trail = shot.path.samples.filter((p) => p.t <= shownT).map((p) => p.pos)
  const ball = shot.path.positionAt(shownT)
  const a = (puzzle.angleDeg * Math.PI) / 180
  const landed = running && t >= duration

  return (
    <FieldScene frame={f} label={`${puzzle.name}: its way up drawn to the top${marker === null ? '' : `, and your marker at ${marker} metres`}.`}>
      <polyline points={polyline(trail.concat(ball))} className="sv-real" />
      <circle cx={ball.x} cy={-ball.y} r={s(1)} className="sv-ball" />
      <g className={highlight ? 'sv-highlight' : undefined}>
        <text x={s(10) * Math.cos(a) + s(2)} y={-s(10) * Math.sin(a)} fontSize={s(2.6)} className="sv-label">
          leaves at {puzzle.speed} m/s
        </text>
        <text x={shot.apexX} y={-shot.apexY - s(2.5)} fontSize={s(2.6)} textAnchor="middle" className="sv-label">
          top: {shot.apexSpeed.toFixed(0)} m/s
        </text>
      </g>
      {marker !== null && <Marker x={marker} frame={f} label="your marker" />}
      {landed && <GroundTick x={shot.mirrorX} frame={f} label="mirror" />}
    </FieldScene>
  )
}

// --- Puzzle 2: the best angle at two speeds ----------------------------------------------------

function AngleChallenge({ done, onPass }: { done: boolean; onPass: (gold: boolean) => void }) {
  const [variant, setVariant] = useState(0)
  const pair = ANGLE_PAIRS[variant]
  const [slowAngle, setSlowAngle] = useState<number | null>(null)
  const [fastAngle, setFastAngle] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<ReactNode>(null)
  const [fired, setFired] = useState<{ slow: FlightPath; fast: FlightPath } | null>(null)
  const [misses, setMisses] = useState(0)
  const [rung, setRung] = useState(0)

  const slowBest = rangeBallBest(pair.slow)
  const fastBest = rangeBallBest(pair.fast)
  const placed = slowAngle !== null && fastAngle !== null

  function check() {
    const chosen = [
      { speed: pair.slow, angle: slowAngle!, best: slowBest },
      { speed: pair.fast, angle: fastAngle!, best: fastBest },
    ].map((c) => ({ ...c, range: rangeBallRange(c.speed, c.angle) }))
    const path = (speed: number, angleDeg: number) => dragPath({ speed, angleDeg, projectile: RANGE_BALL })
    setFired({ slow: path(pair.slow, slowAngle!), fast: path(pair.fast, fastAngle!) })
    const closeEnough = chosen.every((c) => c.range >= (1 - ANGLE_RANGE_TOLERANCE) * c.best.range)
    const orderRight = fastAngle! < slowAngle!
    const pass = closeEnough && orderRight
    const gold = chosen.every((c) => Math.abs(c.angle - c.best.angleDeg) <= ANGLE_GOLD)
    const lines = chosen.map((c) => (
      <li key={c.speed}>
        {c.speed} m/s at {c.angle}°: {c.range.toFixed(1)} m. The furthest it can go is {c.best.range.toFixed(1)} m, at{' '}
        {c.best.angleDeg.toFixed(1)}°.
      </li>
    ))
    const why = pass
      ? gold
        ? 'Right: the faster shot needs the lower angle. Both within 1.5° of the best.'
        : 'Right: the faster shot needs the lower angle. (Within 1.5° of each best angle counts for a precision medal; you can stop here.)'
      : !orderRight
        ? `You aimed the ${pair.fast} m/s shot ${fastAngle === slowAngle ? 'the same as' : 'higher than'} the ${pair.slow} m/s one. Think about which shot the air pushes harder.`
        : 'The order is right, but at least one shot falls more than 2% short of its best. Fine-tune the angles.'
    setFeedback(
      <>
        <ul className="result-lines">{lines}</ul>
        <p>{why}</p>
      </>,
    )
    if (pass) onPass(gold)
    else setMisses((m) => m + 1)
  }

  function freshVariant() {
    setVariant(1)
    setSlowAngle(null)
    setFastAngle(null)
    setFeedback(null)
    setFired(null)
    setMisses(0)
    setRung(0)
  }

  const dial = (speed: number, value: number | null, set: (v: number) => void) => (
    <label className={rung >= 1 ? 'marker-input sv-highlight-text' : 'marker-input'}>
      <span>
        At {speed} m/s, aim at {value === null ? '?' : `${value}°`}
      </span>
      <input
        type="range"
        min={20}
        max={60}
        value={value ?? 45}
        disabled={done}
        onChange={(e) => set(Number(e.target.value))}
        // Choosing the starting value moves nothing, so a click or key press there still counts as setting it.
        onPointerUp={(e) => set(Number(e.currentTarget.value))}
        onKeyUp={(e) => e.key !== 'Tab' && e.key !== 'Shift' && set(Number(e.currentTarget.value))}
      />
    </label>
  )

  return (
    <section className="puzzle" aria-labelledby="angle-puzzle">
      <h3 id="angle-puzzle">Puzzle 2{variant > 0 ? ': a new one' : ''}</h3>
      <p>
        The range ball in sea-level air, once gently at {pair.slow} m/s and once hard at {pair.fast} m/s. For each, set the
        angle you think sends it furthest.
      </p>
      <div className="controls">
        {dial(pair.slow, slowAngle, setSlowAngle)}
        {dial(pair.fast, fastAngle, setFastAngle)}
      </div>
      {fired && <TwoShots slow={fired.slow} fast={fired.fast} pair={pair} />}
      {!done && (
        <button type="button" className="button button-primary" disabled={!placed} onClick={check}>
          {placed ? (feedback ? 'Fire again' : 'Fire both') : 'Set both angles first'}
        </button>
      )}
      {feedback && (
        <div className={done ? 'result result-pass' : 'result'} role="status">
          {feedback}
        </div>
      )}
      {!done && (
        <HintLadder
          misses={misses}
          rung={rung}
          onOpen={setRung}
          rungs={{
            lookHere: <p>Look at the two speeds (highlighted). One shot is {(pair.fast / pair.slow).toFixed(0)} times faster than the other.</p>,
            remember: <ExplainAngle />,
            oneStep: (
              <p>
                At {(pair.fast / pair.slow).toFixed(0)} times the speed, the air pushes{' '}
                {((pair.fast / pair.slow) ** 2).toFixed(0)} times harder. So the fast shot's best angle sits well below 45°,
                and the slow one's close to 45°.
              </p>
            ),
            showMe: (
              <>
                <p>
                  The slow shot barely notices the air: its best angle is {slowBest.angleDeg.toFixed(1)}°. The fast one loses
                  speed all the way, so it does best at {fastBest.angleDeg.toFixed(1)}°.
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

function TwoShots({ slow, fast, pair }: { slow: FlightPath; fast: FlightPath; pair: { slow: number; fast: number } }) {
  const f = frameFor([...slow.samples, ...fast.samples].map((p) => p.pos), { minWidth: 30, minAspect: 0.25 })
  const s = (p: number) => size(f, p)
  return (
    <figure className="figure">
      <FieldScene frame={f} label={`The ${pair.slow} m/s shot landed ${slow.range.toFixed(1)} metres away; the ${pair.fast} m/s shot ${fast.range.toFixed(1)} metres.`}>
        <polyline points={polyline(slow.samples.map((p) => p.pos))} className="sv-shot sv-shot-b" />
        <polyline points={polyline(fast.samples.map((p) => p.pos))} className="sv-shot" />
        <text x={slow.range} y={-s(2)} fontSize={s(2.4)} textAnchor="middle" className="sv-label">
          {pair.slow} m/s
        </text>
        <text x={fast.range} y={-s(2)} fontSize={s(2.4)} textAnchor="end" className="sv-label">
          {pair.fast} m/s
        </text>
      </FieldScene>
      <figcaption className="hint">Dashed: the {pair.slow} m/s shot. Solid: the {pair.fast} m/s shot.</figcaption>
    </figure>
  )
}
