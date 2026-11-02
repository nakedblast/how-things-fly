import type { ReactNode } from 'react'
import { tickStep, type Frame } from './frame'

interface Props {
  frame: Frame
  label: string
  /** Water instead of grass below y = 0. */
  sea?: boolean
  /** Draw distance marks along the ground. */
  ticks?: boolean
  className?: string
  children?: ReactNode
  svgProps?: React.SVGProps<SVGSVGElement>
}

/**
 * A side-view SVG in metres (x downrange). Children draw with y flipped: use `-y` for height.
 * The SVG keeps the frame's aspect ratio, so it is as tall as the shot needs and no taller.
 */
export function SideView({ frame, label, sea, ticks = true, className, children, svgProps }: Props) {
  const width = frame.x1 - frame.x0
  const ground = width * 0.05 // strip of ground or sea below y = 0, for the distance marks
  const height = frame.top + ground
  const step = tickStep(width)
  const font = width / 34
  const marks: number[] = []
  for (let x = Math.ceil(frame.x0 / step) * step; x <= frame.x1; x += step) if (x >= 0) marks.push(x)

  return (
    <svg
      className={className ? `side-view ${className}` : 'side-view'}
      viewBox={`${frame.x0} ${-frame.top} ${width} ${height}`}
      role="img"
      aria-label={label}
      {...svgProps}
    >
      <rect x={frame.x0} y={-frame.top} width={width} height={frame.top} className="sv-sky" />
      <rect x={frame.x0} y={0} width={width} height={ground} className={sea ? 'sv-sea' : 'sv-ground'} />
      {ticks &&
        marks.map((x) => (
          <text key={x} x={x} y={ground * 0.7} fontSize={font} textAnchor="middle" className="sv-tick">
            {x} m
          </text>
        ))}
      {children}
    </svg>
  )
}
