import { Portrait } from './DartDrawing'
import { margin, rangeDart, type Projectile } from './scenario'

export function MarkKey() {
  return (
    <ul className="legend">
      <li>
        <span className="key key-cg" aria-hidden="true" /> balance point
      </li>
      <li>
        <span className="key key-cp" aria-hidden="true" /> push point (where the air pushes)
      </li>
    </ul>
  )
}

/** The main flap; Prove's "Remember" hints reopen it. */
export function ExplainCore() {
  const nose = rangeDart(0.05)
  const tail = rangeDart(0.56)
  return (
    <>
      <p>
        Every dart has two special points. Its <strong>balance point</strong> is where its weight acts: it would balance
        there on a finger. Its <strong>push point</strong> is where the air pushes on it when it turns a little off its
        path. Fins have a lot of side area, so they pull the push point back towards them.
      </p>
      <p>
        If the push point is behind the balance point, the air swings the nose back into line, the way a weathervane turns
        to face the wind. If it is in front, the push swings the dart further round, and it tumbles.
      </p>
      <figure className="figure">
        <Portrait projectile={nose} marks="both" label="The dart with its weight at the nose: the balance point sits well ahead of the push point." />
        <Portrait projectile={tail} marks="both" label="The dart with its weight at the fin end: the balance point has moved behind the push point." />
        <figcaption className="hint">Top: weight at the nose, balance point well ahead. Bottom: weight at the fin end, balance point behind.</figcaption>
      </figure>
      <MarkKey />
    </>
  )
}

export function ExplainHeavyEnd() {
  return (
    <>
      <p>
        Moving weight towards the nose moves the balance point forwards, ahead of the push point. Moving fins or feathers
        towards the tail moves the push point back. Either way, the gap between them is what keeps a dart pointed.
      </p>
      <p>
        So an arrow has a heavy point and light feathers at the back; a darts player's dart has a heavy barrel at the front
        and a flight at the back; a shuttlecock has a cork nose and a feather skirt behind it.
      </p>
    </>
  )
}

export function ExplainHistory() {
  return (
    <>
      <p>
        Things that hang settle with the heavy end down: a plumb line, a pendulum, a conker on a string. Gravity pulls the
        weight below the point it hangs from, so “the heavy end trails” is what we see every day.
      </p>
      <p>
        A flying dart hangs from nothing. Gravity pulls every part of it down together, so it cannot turn the dart. The dart
        turns about its own balance point, and only the air can turn it. What matters is where the air pushes, compared
        with where the weight is.
      </p>
    </>
  )
}

export function ExplainDeeper({ projectile }: { projectile: Projectile }) {
  const { dart } = projectile
  const cm = (m: number) => (m * 100).toFixed(1)
  return (
    <>
      <p>
        Rocket builders measure the gap in body widths and call it the <em>static margin</em>: (push point − balance point)
        ÷ body width. Positive means stable.
      </p>
      <p>
        For your dart: balance point {cm(dart.xcg)} cm behind the nose, push point {cm(dart.aero.xcp)} cm, body{' '}
        {cm(dart.diameter)} cm wide, so the margin is {margin(projectile).toFixed(1)} widths.
      </p>
      <p>
        The push point comes from the Barrowmans' 1966 method: each part pushes with a strength set by its shape (a cone nose
        gives 2 per radian of turn; these fins about {(dart.aero.cnAlpha - 2).toFixed(0)}), and the push point is the
        strength-weighted average of where each part pushes. The turning effect is ½ ρ v² × area × strength × angle × gap.
      </p>
    </>
  )
}
