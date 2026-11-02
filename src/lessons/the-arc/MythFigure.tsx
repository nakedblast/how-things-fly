import type { Prediction } from '../../book/progress'
import { useProgress } from '../../book/useProgress'
import { vacuumTrajectory } from '../../physics/trajectory'
import { CliffScene } from './CliffScene'
import { FIRED, LESSON_ID } from './scenario'
import { pathPoints, type Point } from './sketch'

/** The myth card's picture: the learner's own sketch next to the real arc. */
export function MythFigure() {
  const predictions = useProgress().lessons[LESSON_ID]?.predictions ?? []
  const sketch = predictions.find((p: Prediction) => p.id === 'sketch')?.value as { points?: Point[] } | undefined
  const real = vacuumTrajectory(FIRED, 60).map((s): Point => [s.pos.x, s.pos.y])
  return (
    <figure className="figure myth-figure">
      <CliffScene label="Your predicted path, dashed, next to the real arc, solid.">
        {sketch?.points && <polyline points={pathPoints(sketch.points)} className="sv-ghost" />}
        <polyline points={pathPoints(real)} className="sv-real" />
      </CliffScene>
      <figcaption className="hint">Dashed: what you predicted. Solid: what happened.</figcaption>
    </figure>
  )
}
