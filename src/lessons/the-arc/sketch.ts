// Reading the learner's sketch of the fired ball's path (Predict, lesson 1).
// Points are metres in the cliff scene: x out to sea, y up.

export type Point = [number, number]
export type PathShape = 'impetus' | 'arc' | 'other'

/**
 * How much of the total drop the path has made by the time it has covered a fraction of its
 * sideways distance. A real arc fired level has made 25% of its drop at half distance and 64%
 * at four fifths; "straight, then drop" has made almost none of it until the very end.
 */
export function dropAt(points: readonly Point[], fraction: number): number {
  const [x0, y0] = points[0]
  const xEnd = Math.max(...points.map((p) => p[0]))
  const yEnd = Math.min(...points.map((p) => p[1]))
  const total = y0 - yEnd
  if (total <= 0 || xEnd <= x0) return 0
  const target = x0 + fraction * (xEnd - x0)
  const i = points.findIndex((p) => p[0] >= target)
  return (y0 - points[i][1]) / total
}

/** Classifies a sketch as the impetus myth, a real arc, or neither. */
export function classifyPath(points: readonly Point[]): PathShape {
  if (points.length < 3) return 'other'
  const half = dropAt(points, 0.5)
  const late = dropAt(points, 0.8)
  if (late < 0.4) return 'impetus'
  if (half <= 0.42) return 'arc'
  return 'other'
}

/** Why a sketch cannot be read yet, or null when it is usable. */
export function sketchProblem(points: readonly Point[], minWidth: number, minDrop: number): string | null {
  if (points.length < 3) return 'Draw the path with your finger or mouse, starting at the cannon.'
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  if (Math.max(...xs) - points[0][0] < minWidth) return 'Your path hardly leaves the cliff. Draw it out over the sea.'
  if (points[0][1] - Math.min(...ys) < minDrop) return 'Carry your path all the way down to the water.'
  return null
}

/** Keeps a sketch small enough to save: about `max` points, rounded to 10 cm. */
export function simplify(points: readonly Point[], max = 40): Point[] {
  const stride = Math.max(1, Math.ceil(points.length / max))
  const kept = points.filter((_, i) => i % stride === 0)
  if (kept.at(-1) !== points.at(-1)) kept.push(points.at(-1)!)
  return kept.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10])
}

/** Reference shapes for learners who choose rather than draw, from (0, h) out to `reach`. */
export function presetPath(shape: PathShape, h: number, reach: number): Point[] {
  const n = 24
  return Array.from({ length: n + 1 }, (_, i): Point => {
    const f = i / n
    switch (shape) {
      case 'arc':
        return [f * reach, h * (1 - f * f)]
      case 'impetus':
        // Straight out, a short bend, then straight down: the gunners' drawings.
        if (f < 0.6) return [(f / 0.6) * reach * 0.8, h]
        if (f < 0.8) {
          const a = ((f - 0.6) / 0.2) * (Math.PI / 2)
          return [reach * 0.8 + reach * 0.2 * Math.sin(a), h - reach * 0.2 * (1 - Math.cos(a))]
        }
        return [reach, h - reach * 0.2 - ((f - 0.8) / 0.2) * (h - reach * 0.2)]
      default:
        return [f * reach, h * (1 - f)]
    }
  })
}

/** SVG polyline points for a path in metres (SVG y points down). */
export function pathPoints(points: readonly Point[]): string {
  return points.map(([x, y]) => `${x},${-y}`).join(' ')
}
