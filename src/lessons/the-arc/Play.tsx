import { useState } from 'react'
import { Step } from '../../book/lesson/kit'
import { reducedMotion, usePlayback } from '../../book/lesson/playback'
import { progressStore } from '../../book/useProgress'
import {
  vacuumFlightTime,
  vacuumHeightAt,
  vacuumPositionAt,
  vacuumRange,
  vacuumTrajectory,
  type LaunchParams,
} from '../../physics/trajectory'
import { frameFor, size } from '../../scenes/frame'
import { FLAGS, WALL } from '../../scenes/rangeLayout'
import { SideView } from '../../scenes/SideView'
import { ANGLE_RANGE, FLAG_GOLD, FLAG_TOLERANCE, LESSON_ID, NEAR_FLAG, SPEED_RANGE } from './scenario'

interface Shot {
  id: number
  launch: LaunchParams
  /** Where the flight ends: the landing point, or the wall's face. */
  endTime: number
  endX: number
  hitWall: boolean
}

const WALL_FACE = WALL.x - WALL.thickness / 2

function makeShot(id: number, speed: number, angleDeg: number): Shot {
  const launch = { speed, angleDeg }
  const range = vacuumRange(launch)
  const atWall = vacuumHeightAt(launch, WALL_FACE)
  if (atWall !== null && atWall < WALL.height) {
    const vx = speed * Math.cos((angleDeg * Math.PI) / 180)
    return { id, launch, endTime: WALL_FACE / vx, endX: WALL_FACE, hitWall: true }
  }
  return { id, launch, endTime: vacuumFlightTime(launch), endX: range, hitWall: false }
}

function describe(shot: Shot): string {
  const { launch } = shot
  if (shot.hitWall) {
    const h = vacuumHeightAt(launch, WALL_FACE)!
    return `Hit the wall ${h.toFixed(1)} m up; it is ${WALL.height} m tall.`
  }
  const miss = shot.endX - NEAR_FLAG
  const flag =
    Math.abs(miss) <= FLAG_TOLERANCE
      ? ` That is a hit on the near flag (${Math.abs(miss).toFixed(1)} m off).`
      : Math.abs(miss) < 15
        ? ` That is ${Math.abs(miss).toFixed(1)} m ${miss < 0 ? 'short of' : 'past'} the near flag.`
        : ''
  return `Landed ${shot.endX.toFixed(1)} m away.${flag}`
}

interface Goals {
  nearFlag: boolean
  wall: boolean
  furthest: boolean
}

export function Play({ onNext }: { onNext: () => void }) {
  const [speed, setSpeed] = useState(20)
  const [angle, setAngle] = useState(35)
  const [shots, setShots] = useState<Shot[]>([])
  const [goals, setGoals] = useState<Goals>({ nearFlag: false, wall: false, furthest: false })
  const [best, setBest] = useState<string | null>(null)

  function fire() {
    const shot = makeShot((shots.at(-1)?.id ?? 0) + 1, speed, angle)
    const all = [...shots, shot]
    setShots(all)
    const miss = Math.abs(shot.endX - NEAR_FLAG)
    const next = { ...goals }
    if (!shot.hitWall && miss <= FLAG_TOLERANCE) next.nearFlag = true
    if (!shot.hitWall && miss <= FLAG_GOLD) progressStore.awardMedal(LESSON_ID, 'play-gold:near-flag')
    if (!shot.hitWall && shot.endX > WALL.x) next.wall = true
    // The furthest angle is found once a learner has bracketed 45° at one speed.
    const angles = all.filter((s) => s.launch.speed === speed).map((s) => s.launch.angleDeg)
    if (angles.includes(45) && angles.some((a) => a < 45) && angles.some((a) => a > 45)) {
      next.furthest = true
      setBest(`At ${speed} m/s, 45° went ${vacuumRange({ speed, angleDeg: 45 }).toFixed(1)} m, further than any angle either side.`)
    }
    setGoals(next)
  }

  const current = shots.at(-1)
  const recent = shots.slice(-4, -1)
  const frame = frameFor(
    [
      ...shots.slice(-4).flatMap((s) => vacuumTrajectory(s.launch, 24).map((p) => p.pos)),
      { x: WALL.x + 2, y: WALL.height + 4 },
    ],
    { minWidth: 60, minAspect: 0.22 },
  )

  return (
    <Step title="Play">
      <p>The range is yours. Set the angle and speed, then fire. These goals are only suggestions.</p>
      <ul className="goals">
        <GoalItem done={goals.nearFlag}>Land a shot on the near flag, {NEAR_FLAG} m away.</GoalItem>
        <GoalItem done={goals.wall}>Clear the wall at {WALL.x} m.</GoalItem>
        <GoalItem done={goals.furthest}>Find the angle that sends a shot furthest. Keep the speed the same.</GoalItem>
      </ul>
      <SideView frame={frame} label="The range seen from the side, with the near flag, the wall and your shots.">
        <rect x={WALL_FACE} y={-WALL.height} width={WALL.thickness} height={WALL.height} className="sv-wall" />
        {FLAGS.map((f) => (
          <g key={f.x}>
            <line x1={f.x} y1={0} x2={f.x} y2={-size(frame, 4)} className="sv-pole" />
            <polygon
              points={`${f.x},${-size(frame, 4)} ${f.x + size(frame, 2)},${-size(frame, 3.4)} ${f.x},${-size(frame, 2.8)}`}
              fill={f.color}
            />
          </g>
        ))}
        {recent.map((s) => (
          <polyline key={s.id} points={trail(s, s.endTime)} className="sv-old" />
        ))}
        {current && <LiveShot key={current.id} shot={current} r={size(frame, 1)} />}
      </SideView>
      <div className="controls">
        <label>
          Launch angle: {angle}°
          <input
            type="range"
            min={ANGLE_RANGE.min}
            max={ANGLE_RANGE.max}
            value={angle}
            onChange={(e) => setAngle(Number(e.target.value))}
          />
        </label>
        <label>
          Launch speed: {speed} m/s
          <input
            type="range"
            min={SPEED_RANGE.min}
            max={SPEED_RANGE.max}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          />
        </label>
        <button type="button" className="button button-primary" onClick={fire}>
          Fire
        </button>
      </div>
      <p aria-live="polite" className="readout">
        {current
          ? `${current.launch.angleDeg}° at ${current.launch.speed} m/s: ${describe(current)}`
          : 'No shots yet.'}
      </p>
      {best && <p className="found">{best}</p>}
      <p className="hint">When you are ready, the final challenge earns the stamp.</p>
      <button type="button" className="button button-primary" onClick={onNext}>
        Go to the challenge
      </button>
    </Step>
  )
}

function GoalItem({ done, children }: { done: boolean; children: React.ReactNode }) {
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

function trail(shot: Shot, t: number): string {
  const n = 60
  const end = Math.min(t, shot.endTime)
  return Array.from({ length: n + 1 }, (_, i) => {
    const p = vacuumPositionAt(shot.launch, (end * i) / n)
    return `${p.x},${-p.y}`
  }).join(' ')
}

function LiveShot({ shot, r }: { shot: Shot; r: number }) {
  const playback = usePlayback(shot.endTime, { startSlow: false })
  // Reduced motion: the finished shot appears at once.
  const t = reducedMotion ? shot.endTime : playback.t
  const p = vacuumPositionAt(shot.launch, Math.min(t, shot.endTime))
  return (
    <>
      <polyline points={trail(shot, t)} className="sv-real" />
      <circle cx={p.x} cy={-p.y} r={r} className="sv-ball" />
    </>
  )
}
