import { frontalArea, SEA_LEVEL_AIR_DENSITY, terminalVelocity } from '../../physics/flight'
import { STANDARD_GRAVITY } from '../../physics/trajectory'
import { BEST_ANGLE_SPEED, MAIN, rangeBallBest, SPHERE_CD, TENNIS_BALL } from './scenario'

const launchForward = MAIN.speed * Math.cos(Math.PI / 4)

/** The main flap; Prove's "Remember" hint for puzzle 1 reopens it. */
export function ExplainCore() {
  return (
    <>
      <p>
        Air pushes against a moving ball, and the push grows fast with speed: twice as fast means four times the push.
        At launch the tennis ball is fast, so the air pushes hard.
      </p>
      <p>
        On the way up, gravity and air both slow it. It reaches the top moving forwards at only{' '}
        {MAIN.apexSpeed.toFixed(0)} m/s, down from {launchForward.toFixed(0)} m/s. So the way down starts slower, covers
        less ground and drops more steeply. It lands short of the mirror point.
      </p>
    </>
  )
}

/** Prove's "Remember" hint for puzzle 2 reopens this. */
export function ExplainAngle() {
  const best = rangeBallBest(BEST_ANGLE_SPEED)
  return (
    <>
      <p>
        A high shot stays up longer, and the air steals forward speed for the whole flight. Aiming a little lower trades
        some time in the air for keeping more of that speed.
      </p>
      <p>
        The faster the launch, the harder the air pushes, so the further below 45° the best angle sits. For the range ball
        at {BEST_ANGLE_SPEED} m/s it is about {best.angleDeg.toFixed(0)}°. For a slow throw, air hardly matters and 45°
        still works.
      </p>
    </>
  )
}

export function ExplainHistory() {
  return (
    <>
      <p>
        Without air the path really is symmetric: lesson 1's arc, and the parabola Galileo described in 1638. For a slow,
        heavy stone, air changes little, so the mirror image looks right.
      </p>
      <p>
        Galileo knew air mattered more for light and fast things, but treated it as a small correction. In 1742
        Benjamin Robins measured shot speeds with his ballistic pendulum, experimented on air resistance and compared
        theory with real ranges of mortars and cannon. For fast shots, air is not a small correction.
      </p>
    </>
  )
}

export function ExplainDeeper() {
  const area = frontalArea(TENNIS_BALL)
  const drag = (v: number) => 0.5 * SEA_LEVEL_AIR_DENSITY * v * v * SPHERE_CD * area
  const weight = TENNIS_BALL.mass * STANDARD_GRAVITY
  const terminal = terminalVelocity(TENNIS_BALL, { density: SEA_LEVEL_AIR_DENSITY })
  return (
    <>
      <p>Drag = ½ × air density × speed² × drag coefficient × frontal area.</p>
      <p>
        For the tennis ball: air density {SEA_LEVEL_AIR_DENSITY} kg/m³, drag coefficient {SPHERE_CD} (a smooth sphere),
        frontal area {(area * 1e4).toFixed(1)} cm². At {MAIN.speed} m/s that is about {drag(MAIN.speed).toFixed(2)} N,
        more than the ball's weight of {weight.toFixed(2)} N. At the top, at {MAIN.apexSpeed.toFixed(1)} m/s, it is only{' '}
        {drag(MAIN.apexSpeed).toFixed(2)} N.
      </p>
      <p>
        Falling, the ball speeds up until drag equals its weight, at about {terminal.toFixed(0)} m/s: its terminal speed.
        It can never come down faster than that, however high it went. That is part of why it landed at{' '}
        {MAIN.impactSpeed.toFixed(0)} m/s, not the {MAIN.speed} m/s it left with.
      </p>
    </>
  )
}
