// Drawing helpers for the lesson's side views (metres, y up; SVG draws with y flipped).

import type { Vec2 } from '../../physics/trajectory'

export function polyline(points: readonly Vec2[]): string {
  return points.map((p) => `${p.x},${-p.y}`).join(' ')
}

/** A predicted way down: a smooth half-arc from the top of the flight to a landing mark. */
export function predictedDescent(apex: Vec2, landX: number, n = 32): Vec2[] {
  const pts: Vec2[] = []
  for (let i = 0; i <= n; i++) {
    const u = i / n
    pts.push({ x: apex.x + (landX - apex.x) * u, y: apex.y * (1 - u * u) })
  }
  return pts
}
