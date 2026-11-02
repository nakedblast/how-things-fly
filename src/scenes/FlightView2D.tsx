import { useEffect, useMemo, useRef, useState } from 'react'
import { vacuumFlightTime, vacuumPositionAt, vacuumTrajectory, type LaunchParams } from '../physics/trajectory'
import { frameFor, tickStep } from './frame'
import { FLAGS, TRAIL_STEPS, WALL } from './rangeLayout'

type Props = { launch: LaunchParams; shot: number; reducedMotion: boolean }

const PAUSE_AFTER_LANDING = 1.2 // s, then the shot replays
const FAR = 1000 // m of sky and ground drawn beyond the frame, for the letterbox space
const MAX_ZOOM = 2.5 // how much closer than "whole shot across the width" a tall screen may go
const SHOT_SHARE = 0.5 // share of the screen height the shot may fill (the control panel covers the top)

// Side-view SVG fallback; reuses the same physics output as the 3D scene.
// The view is framed to the shot rather than the whole range. Where the screen is tall and narrow
// (a portrait phone), fitting the whole shot across the width would leave it tiny under empty sky,
// so the view zooms in, up to MAX_ZOOM, and pans to follow the ball.
export default function FlightView2D({ launch, shot, reducedMotion }: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const ball = useRef<SVGCircleElement>(null)
  const trail = useRef<SVGPolylineElement>(null)
  const [screen, setScreen] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = svg.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) =>
      setScreen({ w: entry.contentRect.width, h: entry.contentRect.height }),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const flightTime = vacuumFlightTime(launch)
  const samples = useMemo(() => vacuumTrajectory(launch, TRAIL_STEPS), [launch])
  const frame = frameFor(
    samples.map((s) => s.pos),
    { minWidth: 45, minAspect: 0.2 },
  )
  const frameWidth = frame.x1 - frame.x0

  // Metres shown across the screen, and whether the view has to pan to follow the ball.
  let viewWidth = frameWidth
  if (screen.w > 0 && screen.h > 0 && !reducedMotion) {
    const fitWidth = screen.w / frameWidth // px per metre with the whole shot across the screen
    const fitHeight = (screen.h * SHOT_SHARE) / frame.top
    const scale = Math.max(fitWidth, Math.min(fitHeight, fitWidth * MAX_ZOOM))
    viewWidth = Math.min(frameWidth, screen.w / scale)
  }
  const follow = viewWidth < frameWidth - 0.5
  const u = viewWidth / 100 // about 1% of the screen width, for sizes that should look constant
  const viewHeight = follow ? (viewWidth * screen.h) / screen.w : frame.top + 4 * u
  const step = tickStep(viewWidth)
  const marks = Array.from({ length: Math.floor(FAR / step) }, (_, i) => i * step)
  const bottom = 4 * u

  useEffect(() => {
    const viewBoxAt = (x: number) => {
      const x0 = follow ? Math.min(Math.max(x - viewWidth * 0.35, frame.x0), frame.x1 - viewWidth) : frame.x0
      return `${x0} ${bottom - viewHeight} ${viewWidth} ${viewHeight}`
    }
    const show = (t: number) => {
      const pos = vacuumPositionAt(launch, t)
      const n = Math.ceil((Math.min(t, flightTime) / flightTime) * TRAIL_STEPS)
      const pts = samples.slice(0, n).map((s) => `${s.pos.x},${-s.pos.y}`)
      pts.push(`${pos.x},${-pos.y}`)
      trail.current?.setAttribute('points', pts.join(' '))
      ball.current?.setAttribute('cx', String(pos.x))
      ball.current?.setAttribute('cy', String(-pos.y))
      svg.current?.setAttribute('viewBox', viewBoxAt(pos.x))
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
  }, [launch, shot, samples, flightTime, reducedMotion, follow, viewWidth, viewHeight, bottom, frame.x0, frame.x1])

  return (
    <svg
      ref={svg}
      className="flight-2d"
      viewBox={`${frame.x0} ${bottom - viewHeight} ${viewWidth} ${viewHeight}`}
      preserveAspectRatio="xMinYMax meet"
      role="img"
      aria-label="Side view of the shot"
    >
      <rect x={-FAR} y={-FAR} width={2 * FAR} height={FAR} fill="#cfe3ee" />
      <rect x={-FAR} y={0} width={2 * FAR} height={FAR} fill="#9fb37a" />
      {marks.map((x) => (
        <text key={x} x={x} y={2.8 * u} fontSize={2.2 * u} textAnchor="middle" fill="#2a2420">
          {x}
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
      <circle ref={ball} r={Math.max(0.4, 1.1 * u)} fill="#2a2420" />
    </svg>
  )
}
