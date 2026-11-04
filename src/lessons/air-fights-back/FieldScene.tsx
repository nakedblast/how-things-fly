import type { ReactNode } from 'react'
import { size, type Frame } from '../../scenes/frame'
import { SideView } from '../../scenes/SideView'

/** Open ground with a ball machine at the origin; the lesson's layers go on top. */
export function FieldScene({ frame, label, children }: { frame: Frame; label: string; children?: ReactNode }) {
  const s = (p: number) => size(frame, p)
  return (
    <SideView frame={frame} label={label}>
      {/* Ball machine: a box on legs, its mouth at the origin. */}
      <rect x={-s(3.6)} y={-s(2.2)} width={s(3.4)} height={s(1.8)} rx={s(0.4)} className="sv-cannon" />
      <line x1={-s(3)} y1={-s(0.4)} x2={-s(3.4)} y2={0} className="sv-aim" />
      <line x1={-s(0.8)} y1={-s(0.4)} x2={-s(0.4)} y2={0} className="sv-aim" />
      {children}
    </SideView>
  )
}

/** A landing marker on the ground, with an optional label above it. */
export function Marker({ x, frame, label, className = 'sv-marker' }: { x: number; frame: Frame; label?: string; className?: string }) {
  const s = (p: number) => size(frame, p)
  return (
    <g>
      <polygon points={`${x},0 ${x - s(1.2)},${-s(2.4)} ${x + s(1.2)},${-s(2.4)}`} className={className} />
      {label && (
        <text x={x} y={-s(3.2)} fontSize={s(2.6)} textAnchor="middle" className="sv-label">
          {label}
        </text>
      )}
    </g>
  )
}

/** A thin upright tick on the ground, for the mirror point. */
export function GroundTick({ x, frame, label }: { x: number; frame: Frame; label: string }) {
  const s = (p: number) => size(frame, p)
  return (
    <g>
      <line x1={x} y1={0} x2={x} y2={-s(9)} className="sv-dropline" />
      <text x={x} y={-s(9.8)} fontSize={s(2.4)} textAnchor="middle" className="sv-label">
        {label}
      </text>
    </g>
  )
}
