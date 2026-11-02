import { useEffect, useMemo, useRef } from 'react'
import {
  vacuumApexHeight,
  vacuumFlightTime,
  vacuumPositionAt,
  vacuumTrajectory,
  type LaunchParams,
} from '../physics/trajectory'
import { FLAGS, RANGE_LENGTH, TRAIL_STEPS, WALL } from './rangeLayout'

type Props = { launch: LaunchParams; shot: number; reducedMotion: boolean }

const PAUSE_AFTER_LANDING = 1.2 // s, then the shot replays

// Side-view SVG fallback; reuses the same physics output as the 3D scene.
export default function FlightView2D({ launch, shot, reducedMotion }: Props) {
  const ball = useRef<SVGCircleElement>(null)
  const trail = useRef<SVGPolylineElement>(null)

  const flightTime = vacuumFlightTime(launch)
  const samples = useMemo(() => vacuumTrajectory(launch, TRAIL_STEPS), [launch])
  const top = Math.max(vacuumApexHeight(launch) * 1.15, 20)

  useEffect(() => {
    const show = (t: number) => {
      const pos = vacuumPositionAt(launch, t)
      const n = Math.ceil((Math.min(t, flightTime) / flightTime) * TRAIL_STEPS)
      const pts = samples.slice(0, n).map((s) => `${s.pos.x},${-s.pos.y}`)
      pts.push(`${pos.x},${-pos.y}`)
      trail.current?.setAttribute('points', pts.join(' '))
      ball.current?.setAttribute('cx', String(pos.x))
      ball.current?.setAttribute('cy', String(-pos.y))
    }
    // Reduced motion: show the finished shot without animating it.
    if (reducedMotion) {
      show(flightTime)
      return
    }
    let raf = 0
    let last = performance.now()
    let t = 0
    const tick = (now: number) => {
      t += Math.min((now - last) / 1000, 0.1)
      last = now
      if (t > flightTime + PAUSE_AFTER_LANDING) t = 0
      show(t)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [launch, shot, samples, flightTime, reducedMotion])

  return (
    <svg
      className="flight-2d"
      viewBox={`-5 ${-top} ${RANGE_LENGTH + 10} ${top + 4}`}
      preserveAspectRatio="xMidYMax meet"
      role="img"
      aria-label="Side view of the shot"
    >
      <rect x={-5} y={-top} width={RANGE_LENGTH + 10} height={top} fill="#cfe3ee" />
      <rect x={-5} y={0} width={RANGE_LENGTH + 10} height={4} fill="#9fb37a" />
      {Array.from({ length: RANGE_LENGTH / 10 + 1 }, (_, i) => (
        <text key={i} x={i * 10} y={2.8} fontSize={1.8} textAnchor="middle" fill="#2a2420">
          {i * 10}
        </text>
      ))}
      <rect x={WALL.x - WALL.thickness / 2} y={-WALL.height} width={WALL.thickness} height={WALL.height} fill="#a0522d" />
      {FLAGS.map((f) => (
        <g key={f.x}>
          <line x1={f.x} y1={0} x2={f.x} y2={-3} stroke="#2a2420" strokeWidth={0.12} />
          <polygon points={`${f.x},-3 ${f.x + 1.2},-2.6 ${f.x},-2.2`} fill={f.color} />
        </g>
      ))}
      <polyline ref={trail} fill="none" stroke="#e8a33d" strokeWidth={3} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle ref={ball} r={1.2} fill="#2a2420" />
    </svg>
  )
}
