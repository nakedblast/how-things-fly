import { useMemo, useState } from 'react'
import { Step } from '../../book/lesson/kit'
import { reducedMotion, usePlayback } from '../../book/lesson/playback'
import { SEA_LEVEL_AIR_DENSITY } from '../../physics/flight'
import { dragPath, vacuumPath, type FlightPath } from '../../physics/path'
import { frameFor, size } from '../../scenes/frame'
import { FieldScene } from './FieldScene'
import { polyline } from './geometry'
import {
  BEST_ANGLE_SPEED,
  DENSITY_TOLERANCE,
  DENVER_DENSITY,
  PLAY_ANGLE_RANGE,
  PLAY_DENSITY_RANGE,
  PLAY_SPEED_RANGE,
  RANGE_BALL,
  rangeBallBest,
} from './scenario'

interface Shot {
  id: number
  speed: number
  angleDeg: number
  /** Air density, kg/m³; null with the air switched off. */
  density: number | null
  path: FlightPath
}

function makeShot(id: number, speed: number, angleDeg: number, density: number | null): Shot {
  const launch = { speed, angleDeg }
  const path =
    density === null ? vacuumPath(launch) : dragPath({ ...launch, projectile: RANGE_BALL, air: { density } })
  return { id, speed, angleDeg, density, path }
}

const near = (a: number, b: number) => Math.abs(a - b) <= DENSITY_TOLERANCE
const seaLevel = (s: Shot) => s.density !== null && near(s.density, SEA_LEVEL_AIR_DENSITY)

function airText(density: number | null): string {
  if (density === null) return 'no air'
  if (near(density, SEA_LEVEL_AIR_DENSITY)) return 'sea-level air'
  if (near(density, DENVER_DENSITY)) return 'Denver air'
  return `air at ${density.toFixed(3)} kg/m³`
}

interface Found {
  best: string | null
  cost: string | null
  denver: string | null
}

/** What the learner's shots so far show; each goal is met once its message is set. */
function findings(shots: readonly Shot[]): Found {
  const found: Found = { best: null, cost: null, denver: null }

  // 1. The best angle at one speed in sea-level air: the furthest shot is bracketed by shorter ones on both sides.
  const atSpeed = shots.filter((s) => s.speed === BEST_ANGLE_SPEED && seaLevel(s))
  if (atSpeed.length >= 3) {
    const top = atSpeed.reduce((a, b) => (b.path.range > a.path.range ? b : a))
    const truth = rangeBallBest(BEST_ANGLE_SPEED)
    const bracketed = atSpeed.some((s) => s.angleDeg < top.angleDeg) && atSpeed.some((s) => s.angleDeg > top.angleDeg)
    if (bracketed && top.angleDeg < 45 && Math.abs(top.angleDeg - truth.angleDeg) <= 2) {
      found.best = `At ${BEST_ANGLE_SPEED} m/s in sea-level air, ${top.angleDeg}° went ${top.path.range.toFixed(1)} m, further than your shots either side. The exact best is ${truth.angleDeg.toFixed(1)}°, well below 45°.`
    }
  }

  // 2. The same shot with air off and with air on.
  for (const off of shots.filter((s) => s.density === null)) {
    const on = shots.find((s) => s.density !== null && s.speed === off.speed && s.angleDeg === off.angleDeg)
    if (on) {
      found.cost = `${off.angleDeg}° at ${off.speed} m/s: ${off.path.range.toFixed(1)} m with no air, ${on.path.range.toFixed(1)} m in ${airText(on.density)}. The air took ${(off.path.range - on.path.range).toFixed(1)} m off.`
      break
    }
  }

  // 3. The same shot in Denver air and at sea level.
  for (const thin of shots.filter((s) => s.density !== null && near(s.density, DENVER_DENSITY))) {
    const sea = shots.find((s) => seaLevel(s) && s.speed === thin.speed && s.angleDeg === thin.angleDeg)
    if (sea) {
      found.denver = `${thin.angleDeg}° at ${thin.speed} m/s: ${sea.path.range.toFixed(1)} m at sea level, ${thin.path.range.toFixed(1)} m in Denver's thinner air, ${(thin.path.range - sea.path.range).toFixed(1)} m further.`
      break
    }
  }
  return found
}

export function Play({ onNext }: { onNext: () => void }) {
  const [speed, setSpeed] = useState(BEST_ANGLE_SPEED)
  const [angle, setAngle] = useState(45)
  const [air, setAir] = useState(true)
  const [density, setDensity] = useState(SEA_LEVEL_AIR_DENSITY)
  const [shots, setShots] = useState<Shot[]>([])
  const found = useMemo(() => findings(shots), [shots])

  function fire() {
    setShots([...shots, makeShot((shots.at(-1)?.id ?? 0) + 1, speed, angle, air ? density : null)])
  }

  const current = shots.at(-1)
  const recent = shots.slice(-4, -1)
  const frame = frameFor(
    shots.slice(-4).flatMap((s) => s.path.samples.map((p) => p.pos)),
    { minWidth: 60, minAspect: 0.22 },
  )

  return (
    <Step title="Play">
      <p>
        The range ball, the size and weight of a baseball, with the air switch and air density. These goals are only
        suggestions.
      </p>
      <ul className="goals">
        <GoalItem done={Boolean(found.best)}>
          With the air on at sea level ({SEA_LEVEL_AIR_DENSITY} kg/m³), find the angle that sends a {BEST_ANGLE_SPEED} m/s shot
          furthest.
        </GoalItem>
        <GoalItem done={Boolean(found.cost)}>Fire the same shot with the air off and on. How much does air cost?</GoalItem>
        <GoalItem done={Boolean(found.denver)}>
          Denver is one mile up, where the air is thinner: about {DENVER_DENSITY} kg/m³ on a standard day. Fire the same shot
          in Denver air and at sea level.
        </GoalItem>
      </ul>
      <FieldScene frame={frame} label="The range seen from the side, with your last few shots.">
        {recent.map((s) => (
          <polyline key={s.id} points={polyline(s.path.samples.map((p) => p.pos))} className={s.density === null ? 'sv-old sv-old-vacuum' : 'sv-old'} />
        ))}
        {current && <LiveShot key={current.id} shot={current} r={size(frame, 1)} />}
      </FieldScene>
      <div className="controls">
        <label>
          Launch angle: {angle}°
          <input
            type="range"
            min={PLAY_ANGLE_RANGE.min}
            max={PLAY_ANGLE_RANGE.max}
            value={angle}
            onChange={(e) => setAngle(Number(e.target.value))}
          />
        </label>
        <label>
          Launch speed: {speed} m/s
          <input
            type="range"
            min={PLAY_SPEED_RANGE.min}
            max={PLAY_SPEED_RANGE.max}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          />
        </label>
        <label className="rack-switch">
          <input type="checkbox" checked={air} onChange={(e) => setAir(e.target.checked)} />
          Air: {air ? 'on' : 'off'}
        </label>
        <label>
          Air density: {air ? `${density.toFixed(3)} kg/m³` : 'off'}
          <input
            type="range"
            min={PLAY_DENSITY_RANGE.min}
            max={PLAY_DENSITY_RANGE.max}
            step={PLAY_DENSITY_RANGE.step}
            value={density}
            disabled={!air}
            onChange={(e) => setDensity(Number(e.target.value))}
          />
        </label>
        <div className="row">
          <button type="button" className="button" disabled={!air} onClick={() => setDensity(SEA_LEVEL_AIR_DENSITY)}>
            Sea level
          </button>
          <button type="button" className="button" disabled={!air} onClick={() => setDensity(DENVER_DENSITY)}>
            Denver
          </button>
        </div>
        <button type="button" className="button button-primary" onClick={fire}>
          Fire
        </button>
      </div>
      <p aria-live="polite" className="readout">
        {current
          ? `${current.angleDeg}° at ${current.speed} m/s, ${airText(current.density)}: landed ${current.path.range.toFixed(1)} m away, peaking at ${current.path.apexHeight.toFixed(1)} m.`
          : 'No shots yet.'}
      </p>
      {[found.best, found.cost, found.denver].filter(Boolean).map((m) => (
        <p key={m} className="found">
          {m}
        </p>
      ))}
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

function LiveShot({ shot, r }: { shot: Shot; r: number }) {
  const { path } = shot
  const playback = usePlayback(path.flightTime, { startSlow: false })
  // Reduced motion: the finished shot appears at once.
  const t = reducedMotion ? path.flightTime : playback.t
  const p = path.positionAt(t)
  const trail = path.samples.filter((s) => s.t <= t).map((s) => s.pos).concat(p)
  return (
    <>
      <polyline points={polyline(trail)} className={shot.density === null ? 'sv-ghost' : 'sv-real'} />
      <circle cx={p.x} cy={-p.y} r={r} className="sv-ball" />
    </>
  )
}
