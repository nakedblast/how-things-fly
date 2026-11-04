import { useId } from 'react'
import { clampFlightTime, flightSampleIndex, type LongShot } from './scenario'

const R = 6_371_000
const ground = (x: number) => -x * x / (R + Math.sqrt(Math.max(0, R * R - x * x)))

/** Tangent-plane heights retain the curved surface rather than flattening the drawing. */
export function SideProfile({ shot, t = shot.flight.flightTime }: { shot: LongShot; t?: number }) {
  const id = useId()
  const time = clampFlightTime(t, shot.flight.flightTime)
  const samples = shot.flight.samples
  const width = Math.max(130_000, shot.flight.range * 1.05)
  const top = Math.max(50_000, shot.apexHeight * 1.1)
  const x = (v: number) => 48 + v / width * 536
  const y = (v: number) => 246 - v / top * 208
  const points = samples.filter((s, i) => (i % 30 === 0 || i === samples.length - 1) && s.t <= time)
  const surface = Array.from({ length: 61 }, (_, i) => width * i / 60)
  const current = samples[flightSampleIndex(time, shot.flight.flightTime, samples.length)]
  const dots = samples.length > 0
    ? Array.from({ length: 10 }, (_, i) => samples[Math.round(i / 9 * (samples.length - 1))]).filter((s) => s.t <= time)
    : []
  if (!current) return <figure className="figure ls-figure"><figcaption>No flight samples available.</figcaption></figure>
  return (
    <figure className="figure ls-figure">
      <svg viewBox="0 0 610 288" role="img" aria-labelledby={id}>
        <title id={id}>Side profile. Peak {(shot.apexHeight / 1000).toFixed(1)} kilometres; flight {shot.flight.flightTime.toFixed(0)} seconds. Curved ground and dots at equal times.</title>
        <path d={`M ${x(0)} ${y(11_000)} L ${x(width)} ${y(11_000 + ground(width))} L ${x(width)} ${y(top)} L ${x(0)} ${y(top)} Z`} fill="#dce4e5" />
        {[0, 10_000, 20_000, 40_000].map((h) => <g key={h}><path d={`M48 ${y(h)} H584`} className="ls-grid" /><text x="40" y={y(h) + 4} textAnchor="end">{h / 1000}</text></g>)}
        <text x="50" y="16">Height (km)</text>
        <text x="350" y={y(20_000) - 8}>Stratosphere</text>
        <path d={`M48 ${y(12_000)} H584`} stroke="currentColor" strokeDasharray="3 5" fill="none" />
        <text x="350" y={y(12_000) - 8}>Airliner height ≈12 km</text>
        <path d={`M ${surface.map((v) => `${x(v)},${y(ground(v))}`).join(' L ')} L584 264 H48 Z`} fill="#d4c9ad" />
        <path d={`M ${surface.map((v) => `${x(v)},${y(ground(v))}`).join(' L ')}`} fill="none" stroke="currentColor" />
        <polyline points={points.map((s) => `${x(s.pos.x)},${y(s.pos.y)}`).join(' ')} className="ls-trail" />
        {dots.map((s, i) => <circle key={`${s.t}-${i}`} cx={x(s.pos.x)} cy={y(s.pos.y)} r="3" fill="currentColor" />)}
        <circle cx={x(current.pos.x)} cy={y(current.pos.y)} r="5" fill="var(--stamp-ink)" />
        {[0, 30, 60, 90, 120].map((km) => <text key={km} x={x(km * 1000)} y="278" textAnchor="middle">{km}</text>)}
        <text x="584" y="278" textAnchor="end">km</text>
      </svg>
      <figcaption className="hint">Side profile · curved ground · dots at equal time intervals</figcaption>
    </figure>
  )
}
