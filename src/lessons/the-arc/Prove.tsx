import { useState, type ReactNode } from 'react'
import { Choices, HintLadder, Step } from '../../book/lesson/kit'
import { reducedMotion, usePlayback } from '../../book/lesson/playback'
import { progressStore } from '../../book/useProgress'
import { vacuumFlightTime, vacuumPositionAt, vacuumRange, vacuumTrajectory } from '../../physics/trajectory'
import { SideView } from '../../scenes/SideView'
import { size, type Frame } from '../../scenes/frame'
import { ExplainCore } from './Explain'
import { ANGLE_PUZZLES, CART_PUZZLES, cartLaunch, LESSON_ID, type AnglePuzzle, type CartPuzzle } from './scenario'

export function Prove({ onPassed }: { onPassed: () => void }) {
  const [cartDone, setCartDone] = useState(false)
  const [anglesDone, setAnglesDone] = useState(false)
  const [gold, setGold] = useState(false)

  function qualify() {
    const lesson = progressStore.lesson(LESSON_ID)
    const myth = lesson.predictions.find((p) => p.outcome === 'myth' && p.id === 'sketch') ??
      lesson.predictions.find((p) => p.outcome === 'myth')
    if (myth) progressStore.fileMythCard(LESSON_ID, 'changed-my-mind', myth.id)
    else progressStore.fileMythCard(LESSON_ID, 'saw-through-it', 'sketch')
    if (gold) progressStore.awardMedal(LESSON_ID, 'prove-gold')
    progressStore.awardStamp(LESSON_ID)
    onPassed()
  }

  return (
    <Step title="Prove it">
      <p>Two new situations. No sums needed: both come down to the same idea. Retry as often as you like.</p>
      <CartChallenge done={cartDone} onPass={() => setCartDone(true)} />
      {cartDone && (
        <AngleChallenge
          done={anglesDone}
          onPass={(g) => {
            setGold(g)
            setAnglesDone(true)
          }}
        />
      )}
      {cartDone && anglesDone && (
        <div className="passed">
          <p>Both puzzles solved. You have earned your first qualification.</p>
          <button type="button" className="button button-primary" onClick={qualify}>
            Collect your stamp
          </button>
        </div>
      )}
    </Step>
  )
}

// --- Puzzle 1: the cart ------------------------------------------------------------------------

type CartAnswer = 'behind' | 'in' | 'ahead'

const CART_OPTIONS: Record<CartPuzzle['kind'], { value: CartAnswer; label: string }[]> = {
  toss: [
    { value: 'behind', label: 'Behind the cart' },
    { value: 'in', label: 'Back in the cart' },
    { value: 'ahead', label: 'Ahead of the cart' },
  ],
  drop: [
    { value: 'behind', label: 'Behind the spot where it was let go' },
    { value: 'in', label: 'Straight below the spot where it was let go' },
    { value: 'ahead', label: 'Ahead of that spot, level with the cart' },
  ],
}
const CART_ANSWER: Record<CartPuzzle['kind'], CartAnswer> = { toss: 'in', drop: 'ahead' }
const CART_FRAME: Frame = { x0: -3, x1: 9, top: 3.6 }

function CartChallenge({ done, onPass }: { done: boolean; onPass: () => void }) {
  const [variant, setVariant] = useState(0)
  const puzzle = CART_PUZZLES[variant]
  const [answer, setAnswer] = useState<CartAnswer | null>(null)
  const [run, setRun] = useState(0)
  const [result, setResult] = useState<string | null>(null)
  const [misses, setMisses] = useState(0)
  const [rung, setRung] = useState(0)

  const launch = cartLaunch(puzzle)
  const landX = vacuumRange(launch)
  const v = puzzle.cartSpeed

  function check() {
    setRun((r) => r + 1)
    const right = answer === CART_ANSWER[puzzle.kind]
    if (puzzle.kind === 'toss') {
      setResult(
        right
          ? `Right: it dropped back into the cart, ${landX.toFixed(1)} m further on. It kept the cart's ${v} m/s forwards the whole time it was in the air.`
          : `It came down in the cart, not ${answer === 'behind' ? 'behind' : 'ahead of'} it. Look at what the ball was doing before the toss.`,
      )
    } else {
      setResult(
        right
          ? `Right: it landed ${landX.toFixed(1)} m ahead of where it was let go, level with the cart. It kept moving forwards as it fell.`
          : `It landed ${landX.toFixed(1)} m ahead of where it was let go, level with the cart. Look at how the ball was moving at the moment it was let go.`,
      )
    }
    if (right) onPass()
    else setMisses((m) => m + 1)
  }

  function freshVariant() {
    setVariant(1)
    setAnswer(null)
    setResult(null)
    setRun(0)
    setMisses(0)
    setRung(0)
  }

  const question =
    puzzle.kind === 'toss'
      ? `A rider on a cart rolling at ${v} m/s tosses a ball straight up. Where does the ball come down?`
      : `A rider on a cart rolling at ${v} m/s holds a ball out over the side and lets go. Where does it hit the ground?`

  return (
    <section className="puzzle" aria-labelledby="cart-puzzle">
      <h3 id="cart-puzzle">Puzzle 1{variant > 0 ? ': a new one' : ''}</h3>
      <p>{question}</p>
      <CartScene key={`${variant}-${run}`} puzzle={puzzle} running={run > 0} highlight={rung >= 1} />
      <Choices
        legend="Your answer"
        name={`cart-${variant}`}
        options={CART_OPTIONS[puzzle.kind]}
        value={answer}
        onChange={setAnswer}
        disabled={done}
      />
      {!done && (
        <button type="button" className="button button-primary" disabled={!answer} onClick={check}>
          {run === 0 ? 'Commit and roll' : 'Try again'}
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
            lookHere: <p>Look at the cart's speed (highlighted). Before it leaves the rider's hand, the ball is rolling along with the cart.</p>,
            remember: <ExplainCore />,
            oneStep: (
              <p>
                {puzzle.kind === 'toss'
                  ? 'The toss only adds speed upwards. Nothing in the air slows the ball’s forward motion.'
                  : `At the moment it is let go, the ball is already moving forwards at ${v} m/s.`}
              </p>
            ),
            showMe: (
              <>
                <p>
                  {puzzle.kind === 'toss'
                    ? `The ball moves forwards at ${v} m/s with the cart before the toss. The toss adds speed upwards only. In the air it keeps its ${v} m/s forwards, exactly like the cart, so it stays above the cart and drops back in.`
                    : `The ball keeps its forward ${v} m/s while it falls, just as the cart does, so it lands ahead of where it was let go, level with the cart.`}
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

function CartScene({ puzzle, running, highlight }: { puzzle: CartPuzzle; running: boolean; highlight: boolean }) {
  const launch = cartLaunch(puzzle)
  const flight = vacuumFlightTime(launch)
  const duration = flight + 0.6
  const playback = usePlayback(duration, { autoplay: running, startSlow: false })
  const t = running ? (reducedMotion ? duration : playback.t) : 0
  const f = CART_FRAME
  const cartX = puzzle.cartSpeed * t
  const ball = vacuumPositionAt(launch, t)
  const ballY = puzzle.kind === 'toss' ? ball.y + puzzle.bed : ball.y
  const r = size(f, 1.4)
  const path = vacuumTrajectory(launch, 40)
    .filter((s) => s.t <= t)
    .map((s) => `${s.pos.x},${-(puzzle.kind === 'toss' ? s.pos.y + puzzle.bed : s.pos.y)}`)
    .join(' ')

  return (
    <SideView frame={f} label={`A cart rolling to the right at ${puzzle.cartSpeed} metres per second, with a rider holding a ball.`}>
      {puzzle.kind === 'drop' && (
        <g>
          <line x1={0} y1={0} x2={0} y2={-puzzle.bed} className="sv-dropline" />
          <text x={0} y={-puzzle.bed - 0.3} fontSize={size(f, 3)} textAnchor="middle" className="sv-label">
            let go here
          </text>
        </g>
      )}
      <g transform={`translate(${cartX} 0)`}>
        <rect x={-1} y={-puzzle.bed} width={2} height={puzzle.bed - 0.3} className="sv-cart" />
        <circle cx={-0.6} cy={-0.3} r={0.3} className="sv-wheel" />
        <circle cx={0.6} cy={-0.3} r={0.3} className="sv-wheel" />
        {/* The rider. */}
        <line x1={-0.5} y1={-puzzle.bed} x2={-0.5} y2={-puzzle.bed - 1} className="sv-rider" />
        <circle cx={-0.5} cy={-puzzle.bed - 1.2} r={0.2} className="sv-rider" />
        {/* The cart's speed travels with it: the variable that matters, highlighted by the first hint. */}
        <g className={highlight ? 'sv-highlight' : undefined}>
          <line x1={1.3} y1={-0.65} x2={2.7} y2={-0.65} className="sv-arrow" markerEnd="url(#cart-arrow)" />
          <text x={2} y={-1} fontSize={size(f, 3.2)} textAnchor="middle" className="sv-label">
            {puzzle.cartSpeed} m/s
          </text>
        </g>
      </g>
      <defs>
        <marker id="cart-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" className="sv-arrowhead" />
        </marker>
      </defs>
      {running && <polyline points={path} className="sv-real" />}
      <circle cx={Math.min(ball.x, vacuumRange(launch))} cy={-ballY} r={r} className="sv-ball" />
    </SideView>
  )
}

// --- Puzzle 2: three angles --------------------------------------------------------------------

const STYLES = ['sv-shot-a', 'sv-shot-b', 'sv-shot-c'] as const

function AngleChallenge({ done, onPass }: { done: boolean; onPass: (gold: boolean) => void }) {
  const [variant, setVariant] = useState(0)
  const puzzle = ANGLE_PUZZLES[variant]
  const [markers, setMarkers] = useState<[number, number, number]>([0, 0, 0])
  const [fired, setFired] = useState(0)
  const [feedback, setFeedback] = useState<ReactNode>(null)
  const [misses, setMisses] = useState(0)
  const [rung, setRung] = useState(0)

  const ranges = puzzle.angles.map((a) => vacuumRange({ speed: puzzle.speed, angleDeg: a }))
  const placed = markers.every((m) => m > 0)

  function check() {
    setFired((n) => n + 1)
    const orderRight = [0, 1, 2].every((i) =>
      [0, 1, 2].every((j) => i === j || Math.sign(markers[i] - markers[j]) === Math.sign(ranges[i] - ranges[j])),
    )
    const gold = markers.every((m, i) => Math.abs(m - ranges[i]) <= 0.1 * ranges[i])
    const lines = puzzle.angles.map((a, i) => {
      const off = markers[i] - ranges[i]
      return (
        <li key={a}>
          {a}°: your marker {markers[i]} m, landed {ranges[i].toFixed(1)} m
          {Math.abs(off) < 0.5 ? ' (spot on)' : ` (${Math.abs(off).toFixed(1)} m ${off > 0 ? 'too far' : 'too short'})`}
        </li>
      )
    })
    const best = ranges.indexOf(Math.max(...ranges))
    const steep = puzzle.angles.indexOf(Math.max(...puzzle.angles))
    const markedBest = markers.indexOf(Math.max(...markers))
    const where = orderRight
      ? gold
        ? 'Right order, and every marker within 10%: a precision medal.'
        : 'Right order: 45° furthest. (Within 10% of each landing earns a precision medal; you can stop here.)'
      : markedBest !== best
        ? `Your furthest marker was the ${puzzle.angles[markedBest]}° shot. The furthest shot balances climbing, which keeps it in the air, with moving along.`
        : `The ${puzzle.angles[steep]}° shot spends most of its speed climbing, so it hardly gets anywhere along the ground.`
    setFeedback(
      <>
        <ul className="result-lines">{lines}</ul>
        <p>{where}</p>
      </>,
    )
    if (orderRight) onPass(gold)
    else setMisses((m) => m + 1)
  }

  function freshVariant() {
    setVariant(1)
    setMarkers([0, 0, 0])
    setFired(0)
    setFeedback(null)
    setMisses(0)
    setRung(0)
  }

  const order = puzzle.angles
    .map((a, i) => ({ a, r: ranges[i] }))
    .sort((x, y) => y.r - x.r)

  return (
    <section className="puzzle" aria-labelledby="angle-puzzle">
      <h3 id="angle-puzzle">Puzzle 2{variant > 0 ? ': a new one' : ''}</h3>
      <p>
        Three shots leave at the same speed, {puzzle.speed} m/s, at {puzzle.angles.join('°, ')}°. Place a marker where you
        think each one lands, then fire all three.
      </p>
      <AngleScene key={`${variant}-${fired}`} puzzle={puzzle} markers={markers} fired={fired > 0} highlight={rung >= 1} />
      <div className="controls">
        {puzzle.angles.map((a, i) => (
          <label key={a} className={rung >= 1 ? 'marker-input sv-highlight-text' : 'marker-input'}>
            <span>
              <span className={`marker-key ${STYLES[i]}`} aria-hidden="true" /> {a}° shot lands at {markers[i] || '?'} m
            </span>
            <input
              type="range"
              min={0}
              max={puzzle.sliderMax}
              value={markers[i]}
              disabled={done}
              onChange={(e) => {
                const next = [...markers] as [number, number, number]
                next[i] = Number(e.target.value)
                setMarkers(next)
              }}
            />
          </label>
        ))}
      </div>
      {!done && (
        <button type="button" className="button button-primary" disabled={!placed} onClick={check}>
          {placed ? (fired === 0 ? 'Fire all three' : 'Fire again') : 'Place all three markers first'}
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
            lookHere: <p>Look at the angles (highlighted). Each shot splits the same speed between going up and going along.</p>,
            remember: <ExplainCore />,
            oneStep: <p>Without air, 45° goes furthest. Put that marker furthest out first.</p>,
            showMe: (
              <>
                <p>
                  The steep shot spends most of its speed climbing: it stays up longest but barely moves along. The
                  shallow one moves along fast but comes down soon. 45° balances the two. Here the order is{' '}
                  {order.map((o) => `${o.a}° (${o.r.toFixed(0)} m)`).join(', then ')}.
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

function AngleScene({
  puzzle,
  markers,
  fired,
  highlight,
}: {
  puzzle: AnglePuzzle
  markers: readonly number[]
  fired: boolean
  highlight: boolean
}) {
  const launches = puzzle.angles.map((a) => ({ speed: puzzle.speed, angleDeg: a }))
  const longest = Math.max(...launches.map(vacuumFlightTime))
  const playback = usePlayback(longest, { autoplay: fired, startSlow: false })
  const t = fired ? (reducedMotion ? longest : playback.t) : 0
  const apex = Math.max(...launches.map((l) => vacuumPositionAt(l, vacuumFlightTime(l) / 2).y))
  const f: Frame = { x0: -3, x1: puzzle.sliderMax + 3, top: apex * 1.15 + 2 }
  const s = (p: number) => size(f, p)

  return (
    <SideView frame={f} label="Three shots from the same spot at different angles, with your landing markers.">
      {launches.map((l, i) => {
        const a = (l.angleDeg * Math.PI) / 180
        const pts = vacuumTrajectory(l, 60)
          .filter((p) => p.t <= t)
          .map((p) => `${p.pos.x},${-p.pos.y}`)
          .join(' ')
        const pos = vacuumPositionAt(l, t)
        return (
          <g key={l.angleDeg}>
            <line
              x1={0}
              y1={0}
              x2={s(9) * Math.cos(a)}
              y2={-s(9) * Math.sin(a)}
              className={`sv-aim ${STYLES[i]}`}
            />
            <text
              x={s(12) * Math.cos(a)}
              y={-s(12) * Math.sin(a)}
              fontSize={s(2.6)}
              className={highlight ? 'sv-label sv-highlight-text' : 'sv-label'}
            >
              {l.angleDeg}°
            </text>
            {fired && <polyline points={pts} className={`sv-shot ${STYLES[i]}`} />}
            {fired && <circle cx={pos.x} cy={-pos.y} r={s(0.9)} className="sv-ball" />}
            {markers[i] > 0 && (
              <g>
                <polygon
                  points={`${markers[i]},0 ${markers[i] - s(1.2)},${-s(2.4)} ${markers[i] + s(1.2)},${-s(2.4)}`}
                  className={`sv-marker ${STYLES[i]}`}
                />
                <text x={markers[i]} y={-s(3) - i * s(2.6)} fontSize={s(2.4)} textAnchor="middle" className="sv-label">
                  {l.angleDeg}°
                </text>
              </g>
            )}
          </g>
        )
      })}
    </SideView>
  )
}
