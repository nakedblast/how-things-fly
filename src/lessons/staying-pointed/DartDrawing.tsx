// SVG drawings of the lesson's projectiles. Physics comes in as precomputed samples; nothing here
// simulates anything.

import type { ReactNode } from 'react'
import type { DartSample } from '../../physics/dart'
import type { Vec2 } from '../../physics/trajectory'
import type { Frame } from '../../scenes/frame'
import { size } from '../../scenes/frame'
import { SideView } from '../../scenes/SideView'
import type { DartShot, Part, Projectile } from './scenario'
import { enlargement } from './views'

const DEG = 180 / Math.PI

export type Marks = 'cg' | 'both'

function points(pts: readonly [number, number][]): string {
  return pts.map(([x, y]) => `${x},${y}`).join(' ')
}

/**
 * One projectile in its own body frame: the balance point at the origin, the nose towards +x.
 * Draw it with a transform; `ghost` draws only a dashed outline.
 */
export function Body({
  projectile,
  ghost,
  marks,
}: {
  projectile: Projectile
  ghost?: boolean
  /** Show the balance point, or the balance point and the push point. */
  marks?: Marks
}) {
  const { shape, dart } = projectile
  const X = (b: number) => dart.xcg - b
  const cls = (tone: string) => (ghost ? 'dart-ghost' : `dart-${tone}`)
  const parts = shape.parts.map((p: Part, i) => {
    switch (p.kind) {
      case 'cone':
        return <polygon key={i} className={cls(p.tone ?? 'body')} points={points([[X(p.from), 0], [X(p.to), -p.r], [X(p.to), p.r]])} />
      case 'tube':
        return <rect key={i} className={cls(p.tone ?? 'body')} x={X(p.to)} y={-p.r} width={p.to - p.from} height={2 * p.r} />
      case 'skirt':
        return (
          <polygon key={i} className={cls('skirt')} points={points([[X(p.from), -p.r0], [X(p.to), -p.r1], [X(p.to), p.r1], [X(p.from), p.r0]])} />
        )
      case 'fins':
        return (
          <g key={i}>
            {[-1, 1].map((side) => (
              <polygon
                key={side}
                className={cls(p.feathers ? 'feather' : 'fin')}
                points={points([
                  [X(p.le), side * p.r],
                  [X(p.le + p.sweep), side * (p.r + p.span)],
                  [X(p.le + p.sweep + p.tip), side * (p.r + p.span)],
                  [X(p.le + p.root), side * p.r],
                ])}
              />
            ))}
          </g>
        )
    }
  })
  const k = shape.length / 16 // marker size
  return (
    <g>
      {parts}
      {marks && !ghost && (
        <g>
          <circle r={k * 1.1} className="dart-cg" />
          <path d={`M0,${-k * 1.1} A${k * 1.1},${k * 1.1} 0 0 1 ${k * 1.1},0 L0,0 Z M0,${k * 1.1} A${k * 1.1},${k * 1.1} 0 0 1 ${-k * 1.1},0 L0,0 Z`} className="dart-cg-fill" />
          {marks === 'both' && <g transform={`translate(${X(dart.aero.xcp)},0)`}>
            <line x1={0} y1={-k * 4} x2={0} y2={-k * 1.4} className="dart-cp" />
            <polygon points={points([[0, -k * 0.8], [-k * 0.9, -k * 2], [k * 0.9, -k * 2]])} className="dart-cp-head" />
          </g>}
        </g>
      )}
    </g>
  )
}

/** Flips the body so the nose points along `pitch` (radians above the horizontal) in a y-down SVG. */
function placed(at: Vec2, pitch: number, scale: number): string {
  return `translate(${at.x},${-at.y}) rotate(${-pitch * DEG}) scale(${scale})`
}

/**
 * The side view of a flight: the path, the projectile drawn enlarged at strobe times and now,
 * and optionally the dashed "nose-first" ghost pointing exactly along the path.
 */
export function FlightSide({
  shot,
  t,
  frame,
  strobe,
  ghost,
  marks,
  label,
  children,
}: {
  shot: DartShot
  t: number
  frame: Frame
  /** Seconds between strobe drawings; none if unset. */
  strobe?: number
  ghost?: boolean
  marks?: Marks
  label: string
  children?: ReactNode
}) {
  const scale = enlargement(shot.projectile, frame)
  const trail = shot.flight.samples.filter((s) => s.t <= t).map((s) => s.pos)
  const now = shot.sampleAt(t)
  const strobes: DartSample[] = []
  if (strobe) for (let s = strobe; s < Math.min(t, shot.duration) - strobe / 4; s += strobe) strobes.push(shot.sampleAt(s))
  const heading = (s: DartSample) => Math.atan2(s.vel.y, s.vel.x)
  return (
    <SideView frame={frame} label={label}>
      <Launcher frame={frame} elevationDeg={shot.launch.elevationDeg} />
      <polyline points={trail.concat(now.pos).map((p) => `${p.x},${-p.y}`).join(' ')} className="sv-real sv-thin" />
      {ghost &&
        strobes.concat(now).map((s) => (
          <g key={`g${s.t}`} transform={placed(s.pos, heading(s), scale)}>
            <Body projectile={shot.projectile} ghost />
          </g>
        ))}
      {strobes.map((s) => (
        <g key={s.t} transform={placed(s.pos, s.pitch, scale)} className="dart-strobe">
          <Body projectile={shot.projectile} />
        </g>
      ))}
      <g transform={placed(now.pos, now.pitch, scale)}>
        <Body projectile={shot.projectile} marks={marks} />
      </g>
      {children}
    </SideView>
  )
}

function Launcher({ frame, elevationDeg }: { frame: Frame; elevationDeg: number }) {
  const s = (p: number) => size(frame, p)
  const a = (elevationDeg * Math.PI) / 180
  return (
    <g>
      <line x1={0} y1={0} x2={-s(3) * Math.cos(a)} y2={s(3) * Math.sin(a) - 0.0001} className="sv-aim" />
      <rect x={-s(1.4)} y={-s(1)} width={s(2)} height={s(1)} className="sv-cannon" />
    </g>
  )
}

/**
 * The projectile at equal time steps, each turned so its direction of travel points right:
 * nose-first, wobbling or turning round is plain at a glance whatever the path does.
 */
export function AttitudeStrip({
  shot,
  frames = 6,
  upTo,
  label,
  marks,
}: {
  shot: DartShot
  frames?: number
  /** Only show frames up to this time (the rest are left blank). */
  upTo?: number
  label: string
  marks?: Marks
}) {
  const L = shot.projectile.shape.length
  const cell = L * 1.25
  const width = cell * frames
  const height = L * 1.15
  const times = Array.from({ length: frames }, (_, i) => (shot.duration * i) / (frames - 1))
  return (
    <svg className="attitude-strip" viewBox={`0 ${-height / 2} ${width} ${height + L * 0.3}`} role="img" aria-label={label}>
      <rect x={0} y={-height / 2} width={width} height={height} className="strip-bg" />
      {times.map((t, i) => {
        const shown = upTo === undefined || t <= upTo + 1e-9
        const s = shot.sampleAt(t)
        return (
          <g key={i}>
            {i > 0 && <line x1={cell * i} y1={-height / 2} x2={cell * i} y2={height / 2} className="strip-rule" />}
            {shown && (
              <g transform={`translate(${cell * (i + 0.5)},0) rotate(${-s.alpha * DEG})`}>
                <Body projectile={shot.projectile} marks={marks} />
              </g>
            )}
            <text x={cell * (i + 0.5)} y={height / 2 + L * 0.24} fontSize={L * 0.2} textAnchor="middle" className="sv-label">
              {formatTime(t, shot.duration)}
            </text>
          </g>
        )
      })}
      <g className="strip-travel">
        <line x1={L * 0.1} y1={-height / 2 + L * 0.08} x2={L * 0.5} y2={-height / 2 + L * 0.08} className="sv-arrow" />
        <polygon points={points([[L * 0.56, -height / 2 + L * 0.08], [L * 0.48, -height / 2 + L * 0.04], [L * 0.48, -height / 2 + L * 0.12]])} className="sv-arrowhead" />
      </g>
    </svg>
  )
}

function formatTime(t: number, duration: number): string {
  return duration < 0.5 ? `${Math.round(t * 1000)} ms` : `${t.toFixed(1)} s`
}

/** A projectile drawn on its own, level and nose right, for pictures and choices. */
export function Portrait({ projectile, marks, label, reversed }: { projectile: Projectile; marks?: Marks; label: string; reversed?: boolean }) {
  const { shape, dart } = projectile
  const L = shape.length
  const pad = L * 0.08
  const span = Math.max(...shape.parts.map((p) => (p.kind === 'fins' ? p.r + p.span : p.kind === 'skirt' ? p.r1 : p.r)))
  const h = Math.max(span * 2 + pad * 2, marks === 'both' ? L * 0.55 : marks ? L * 0.3 : L * 0.22)
  // Body coordinates put the balance point at 0, the nose at +xcg and the tail at xcg − L.
  const x0 = dart.xcg - L - pad
  return (
    <svg className="portrait" viewBox={`${x0} ${-h / 2} ${L + 2 * pad} ${h}`} role="img" aria-label={label}>
      <g transform={reversed ? `translate(${2 * x0 + L + 2 * pad},0) scale(-1,1)` : undefined}>
        <Body projectile={projectile} marks={marks} />
      </g>
    </svg>
  )
}

