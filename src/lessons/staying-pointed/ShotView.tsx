import { lazy, Suspense, useState, type ReactNode } from 'react'
import { reducedMotion } from '../../book/lesson/playback'
import { FlightSide, type Marks } from './DartDrawing'
import { shotFrame } from './views'
import type { DartShot } from './scenario'

// three.js loads only if the learner asks for the 3D view.
const DartScene = lazy(() => import('./DartScene'))

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch {
    return false
  }
}

/** A dart flight at time t: the side view, or on request the same moment in 3D. */
export function ShotView({
  shot,
  t,
  label,
  ghost,
  marks,
  strobe = 0.4,
  children,
}: {
  shot: DartShot
  t: number
  label: string
  ghost?: boolean
  marks?: Marks
  strobe?: number
  children?: ReactNode
}) {
  const [webGL] = useState(hasWebGL)
  const [three, setThree] = useState(false)
  return (
    <div className="shot-view">
      {three ? (
        <Suspense fallback={<p className="loading">Loading 3D view…</p>}>
          <div className="dart-scene-wrap" role="img" aria-label={`3D view. ${label}`}>
            <DartScene shot={shot} t={t} reducedMotion={reducedMotion} />
          </div>
        </Suspense>
      ) : (
        <FlightSide shot={shot} t={t} frame={shotFrame([shot])} strobe={strobe} ghost={ghost} marks={marks} label={label}>
          {children}
        </FlightSide>
      )}
      {webGL && (
        <button type="button" className="button button-small" onClick={() => setThree(!three)}>
          {three ? 'Back to the side view' : 'Watch in 3D'}
        </button>
      )}
      {!three && <p className="hint">The dart is drawn larger than life so you can see which way it points.</p>}
    </div>
  )
}
