import { useProgress } from '../../book/useProgress'
import { FieldScene, GroundTick, Marker } from './FieldScene'
import { polyline, predictedDescent } from './geometry'
import { LESSON_ID, MAIN, MAIN_FRAME } from './scenario'

/** The myth card's picture: the learner's predicted way down next to the real flight. */
export function MythFigure() {
  const predictions = useProgress().lessons[LESSON_ID]?.predictions ?? []
  const guess = (predictions.find((p) => p.id === 'landing')?.value as { x?: number } | undefined)?.x
  const apex = { x: MAIN.apexX, y: MAIN.apexY }
  return (
    <figure className="figure myth-figure">
      <FieldScene frame={MAIN_FRAME} label="Your predicted way down, dashed, next to the real flight, solid.">
        {guess !== undefined && <polyline points={polyline(predictedDescent(apex, guess))} className="sv-ghost" />}
        {guess !== undefined && <Marker x={guess} frame={MAIN_FRAME} />}
        <GroundTick x={MAIN.mirrorX} frame={MAIN_FRAME} label="mirror" />
        <polyline points={polyline(MAIN.path.samples.map((s) => s.pos))} className="sv-real" />
      </FieldScene>
      <figcaption className="hint">Dashed: what you predicted. Solid: what happened.</figcaption>
    </figure>
  )
}
