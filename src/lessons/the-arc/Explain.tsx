import { vacuumTrajectory } from '../../physics/trajectory'
import { FALL_TIME, FIRED, FIRED_RANGE } from './scenario'

/** The main flap; Prove's "Remember" hint reopens it. */
export function ExplainCore() {
  return (
    <>
      <p>
        Falling only depends on time. Every second, gravity pulls both balls down by the same amount, whether they are
        moving sideways or not.
      </p>
      <p>
        Firing the ball gives it sideways speed, and nothing takes that speed away or changes how fast it falls.
        Sideways and down happen at once without affecting each other. Together they bend the path into a smooth curve
        that gets steeper and steeper: an arc.
      </p>
    </>
  )
}

export function ExplainHistory() {
  // An elevated shot as gunners' books drew it: straight, a bend, then straight down.
  const impetus = 'M 4,60 L 52,26 A 16,16 0 0 1 72,32 L 72,60'
  const real = vacuumTrajectory({ speed: 26.5, angleDeg: 34 }, 40)
    .map((s) => `${4 + s.pos.x},${60 - s.pos.y * 1.6}`)
    .join(' ')
  return (
    <>
      <p>
        For centuries, scholars taught that a thrown object needs something inside it to keep it going. Medieval
        thinkers called it <em>impetus</em>: it carries the ball straight until it runs out, and then the ball falls.
      </p>
      <p>
        It feels right: a hard throw does seem to go straight at first. Gunners' books, such as Niccolò Tartaglia's in
        1537, drew shots as a straight line, a bend, then a drop. Galileo showed in 1638 that the path is curved all the
        way.
      </p>
      <figure className="figure">
        <svg viewBox="0 0 90 64" role="img" aria-label="A shot drawn the old way, straight, bent, then straight down, next to the real curved path.">
          <rect x={0} y={60} width={90} height={4} className="sv-ground" />
          <path d={impetus} className="fig-impetus" />
          <polyline points={real} className="fig-real" />
          <text x={36} y={18} className="fig-label">
            impetus drawing
          </text>
          <text x={56} y={52} className="fig-label">
            real path
          </text>
        </svg>
        <figcaption className="hint">Solid: the shape in old gunners' books, redrawn. Dashed: the real path.</figcaption>
      </figure>
    </>
  )
}

export function ExplainDeeper() {
  const t = 2
  const along = FIRED.speed * t
  const drop = 0.5 * 9.81 * t * t
  return (
    <>
      <p>Sideways, the ball keeps its launch speed: distance = speed × time.</p>
      <p>Downwards, it speeds up at g ≈ 9.81 m/s² (no air): drop = ½ × g × time².</p>
      <p>
        After {t} s the fired ball has gone {FIRED.speed} × {t} = {along} m out and dropped ½ × 9.81 × {t}² ≈{' '}
        {drop.toFixed(1)} m. The dropped ball has dropped the same {drop.toFixed(1)} m.
      </p>
      <p>
        From 40 m up, the fall takes √(2 × 40 / 9.81) ≈ {FALL_TIME.toFixed(2)} s, so the fired ball lands about{' '}
        {FIRED.speed} × {FALL_TIME.toFixed(2)} ≈ {FIRED_RANGE.toFixed(0)} m out. Because the drop grows with the square
        of the time, and the distance grows with the time, the drop grows with the square of the distance: the curve is a
        parabola.
      </p>
    </>
  )
}
