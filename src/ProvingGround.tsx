import { lazy, Suspense, useMemo, useState } from 'react'
import FlightView2D from './scenes/FlightView2D'
import { FrameMeter } from './FrameMeter'
import { vacuumApexHeight, vacuumRange } from './physics/trajectory'
import { href } from './book/router'

// three.js and R3F load only when the 3D view is shown.
const FlightScene = lazy(() => import('./scenes/FlightScene'))

type View = '3d' | '2d'

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch {
    return false
  }
}

function initialView(): View {
  const requested = new URLSearchParams(window.location.search).get('view')
  if (requested === '2d' || !hasWebGL()) return '2d'
  return '3d'
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function ProvingGround() {
  const [angleDeg, setAngleDeg] = useState(35)
  const [speed, setSpeed] = useState(30)
  const [view, setView] = useState<View>(initialView)
  const [shot, setShot] = useState(0)
  const launch = useMemo(() => ({ speed, angleDeg }), [speed, angleDeg])
  const range = vacuumRange(launch)

  return (
    <main className="app">
      <header className="panel">
        <a className="back" href={href({ name: 'contents' })}>
          ← Contents
        </a>
        <h1 tabIndex={-1}>The proving ground</h1>
        <label>
          Launch angle: {angleDeg}°
          <input type="range" min={5} max={85} value={angleDeg} onChange={(e) => setAngleDeg(Number(e.target.value))} />
        </label>
        <label>
          Launch speed: {speed} m/s
          <input type="range" min={10} max={35} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
        </label>
        <div className="row">
          <button type="button" onClick={() => setShot((s) => s + 1)}>
            Fire again
          </button>
          <button type="button" onClick={() => setView(view === '3d' ? '2d' : '3d')}>
            Show {view === '3d' ? '2D' : '3D'} view
          </button>
        </div>
        <p aria-live="polite">
          Lands {range.toFixed(1)} m away, peaking at {vacuumApexHeight(launch).toFixed(1)} m (no air).
        </p>
        <FrameMeter />
      </header>
      <div className="stage">
        {view === '3d' ? (
          <Suspense fallback={<p className="loading">Loading 3D view…</p>}>
            <FlightScene launch={launch} shot={shot} reducedMotion={reducedMotion} />
          </Suspense>
        ) : (
          <FlightView2D launch={launch} shot={shot} reducedMotion={reducedMotion} />
        )}
      </div>
    </main>
  )
}
