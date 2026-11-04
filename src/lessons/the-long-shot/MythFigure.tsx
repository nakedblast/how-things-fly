import { useMemo } from 'react'
import { useProgress } from '../../book/useProgress'
import { fire, LESSON_ID, PREDICT_DISTANCE, PREDICT_SETTINGS } from './scenario'
import { TargetMap } from './TargetMap'
import { missText } from './views'

export function MythFigure() {
  const value = useProgress().lessons[LESSON_ID]?.predictions.find((p) => p.id === 'landing')?.value as { range?: number; drift?: number } | undefined
  const ghost = typeof value?.range === 'number' && typeof value.drift === 'number' ? { range: value.range, drift: value.drift } : undefined
  const shot = useMemo(() => fire(PREDICT_SETTINGS), [])
  return <div className="ls-lesson myth-figure"><TargetMap distance={PREDICT_DISTANCE} landing={shot} ghost={ghost} /><p className="hint">{missText(shot, PREDICT_DISTANCE)} {ghost && 'Dashed cross: your original prediction. Filled dot: what happened.'}</p></div>
}
