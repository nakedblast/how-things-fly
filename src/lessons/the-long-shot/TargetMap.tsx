import { useId } from 'react'
import type { MapPoint } from './views'

export function TargetMap({ distance, landing, ghost, onPlace }: {
  distance: number; landing?: MapPoint; ghost?: MapPoint; onPlace?: (point: MapPoint) => void
}) {
  const id = useId()
  // Ignore incomplete or damaged points instead of allowing NaN to corrupt the SVG.
  const landed = landing && Number.isFinite(landing.range) && Number.isFinite(landing.drift) ? landing : undefined
  const predicted = ghost && Number.isFinite(ghost.range) && Number.isFinite(ghost.drift) ? ghost : undefined
  // Each axis expands together if a miss is outside the usual few-kilometre map.
  const extent = Math.max(3000, ...[landed, predicted].filter((p): p is MapPoint => Boolean(p)).flatMap((p) => [Math.abs(p.drift) * 1.2, Math.abs(p.range - distance) * 1.2]))
  const px = (z: number) => 250 + z / extent * 200
  const py = (r: number) => 232 - (r - distance) / extent * 200
  function place(x: number, y: number) {
    onPlace?.({ drift: Math.round(Math.max(-extent, Math.min(extent, (x - 250) / 200 * extent)) / 50) * 50, range: distance + Math.round(Math.max(-extent, Math.min(extent, (232 - y) / 200 * extent)) / 50) * 50 })
  }
  return (
    <figure className="figure ls-figure">
      <svg viewBox="0 0 500 480" role={onPlace ? 'application' : 'img'} aria-labelledby={id} tabIndex={onPlace ? 0 : undefined}
        onPointerDown={onPlace ? (event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          // viewBox and element share the same aspect ratio.
          place((event.clientX - rect.left) / rect.width * 500, (event.clientY - rect.top) / rect.height * 480)
        } : undefined}
        onKeyDown={onPlace ? (event) => {
          const p = predicted ?? { range: distance, drift: 0 }
          const delta = event.shiftKey ? 500 : 50
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'Enter', ' '].includes(event.key)) {
            event.preventDefault()
            const next = event.key === 'Home' ? { range: distance, drift: 0 } : {
              range: p.range + (event.key === 'ArrowUp' ? delta : event.key === 'ArrowDown' ? -delta : 0),
              drift: p.drift + (event.key === 'ArrowRight' ? delta : event.key === 'ArrowLeft' ? -delta : 0),
            }
            onPlace(next)
          }
        } : undefined}>
        <title id={id}>{onPlace ? 'Place your landing marker: arrow keys move 50 metres, Shift moves 500; Home centres; Enter selects centre.' : 'Target map: dashed cross is your prediction, filled dot is the landing.'}</title>
        <rect x="50" y="32" width="400" height="400" fill="#e8e2d1" stroke="currentColor" />
        {Array.from({ length: 7 }, (_, i) => (i - 3) * Math.ceil(extent / 3000) * 1000).filter((v) => Math.abs(v) <= extent).map((v) => <g key={v}>
          <path d={`M${px(v)} 32 V432 M50 ${py(distance + v)} H450`} className="ls-grid" />
          <text x={px(v)} y="452" textAnchor="middle">{v / 1000}</text>
        </g>)}
        <path d="M250 432 V32" stroke="currentColor" strokeDasharray="2 5" fill="none" />
        <circle cx="250" cy="232" r={300 / extent * 200} fill="none" stroke="currentColor" />
        <path d="M242 232 H258 M250 224 V240" stroke="currentColor" strokeWidth="2" />
        <text x="260" y="222">Marker</text>
        {predicted && <g transform={`translate(${px(predicted.drift)} ${py(predicted.range)})`} className="ls-ghost"><circle r="10" /><path d="M-15 0 H15 M0 -15 V15" /></g>}
        {landed && <g transform={`translate(${px(landed.drift)} ${py(landed.range)})`}><circle r="6" fill="var(--stamp-ink)" /><text x="9" y="-9">Landed</text></g>}
        <text x="250" y="20" textAnchor="middle">Further downrange ↑</text>
        <text x="250" y="476" textAnchor="middle">← left · sideways km · right →</text>
      </svg>
      <figcaption className="hint">Target map · marker {(distance / 1000).toFixed(1)} km downrange · ring: pass radius. {predicted && 'Dashed cross: your prediction.'}</figcaption>
    </figure>
  )
}
