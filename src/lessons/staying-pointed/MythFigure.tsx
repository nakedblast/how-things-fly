import { useProgress } from '../../book/useProgress'
import { AttitudeStrip } from './DartDrawing'
import { LESSON_ID, rangeShot, stopX, WEIGHT_STOPS, type WeightStop } from './scenario'

/** The myth card's picture: the dart with the learner's weight position next to the weight at the nose. */
export function MythFigure() {
  const predictions = useProgress().lessons[LESSON_ID]?.predictions ?? []
  const stop = (predictions.find((p) => p.id === 'weight')?.value as { stop?: WeightStop } | undefined)?.stop
  const label = (s: WeightStop) => WEIGHT_STOPS.find((w) => w.value === s)!.label.toLowerCase()
  return (
    <figure className="figure myth-figure">
      {stop && stop !== 'nose' && (
        <AttitudeStrip shot={rangeShot(stopX(stop))} marks="both" label={`Your prediction, the weight ${label(stop)}, in flight.`} />
      )}
      <AttitudeStrip shot={rangeShot(stopX('nose'))} marks="both" label="The weight at the nose end, in flight: it stays nose first." />
      <figcaption className="hint">
        {stop && stop !== 'nose' ? `Top: your weight, ${label(stop)}. Bottom: ` : ''}the weight at the nose end, balance point ahead of the push point.
      </figcaption>
    </figure>
  )
}
