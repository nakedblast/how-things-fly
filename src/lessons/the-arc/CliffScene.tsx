import type { ReactNode } from 'react'
import { size } from '../../scenes/frame'
import { SideView } from '../../scenes/SideView'
import { CLIFF_FRAME, CLIFF_HEIGHT } from './scenario'

const f = CLIFF_FRAME

/** The cliff, the cannon and the sea, with the lesson's layers drawn on top. */
export function CliffScene({
  label,
  children,
  svgProps,
  className,
}: {
  label: string
  children?: ReactNode
  svgProps?: React.SVGProps<SVGSVGElement>
  className?: string
}) {
  const h = CLIFF_HEIGHT
  return (
    <SideView frame={f} label={label} sea className={className} svgProps={svgProps}>
      <polygon points={`${f.x0},0 ${f.x0},${-h + 1} -0.6,${-h + 1} 0.4,0`} className="sv-cliff" />
      {/* Cannon: barrel level, mouth at (0, h). */}
      <rect x={-4.2} y={-h - 0.55} width={4.2} height={1.1} rx={0.4} className="sv-cannon" />
      <circle cx={-3.4} cy={-h + 0.2} r={1} className="sv-wheel" />
      <text x={-8} y={-h - 2.5} fontSize={size(f, 3.2)} textAnchor="middle" className="sv-label">
        cannon
      </text>
      {children}
    </SideView>
  )
}
