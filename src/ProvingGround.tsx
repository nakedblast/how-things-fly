import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import FlightView2D from './scenes/FlightView2D'
import { FrameMeter } from './FrameMeter'
import { SEA_LEVEL_AIR_DENSITY } from './physics/flight'
import { dragPath, vacuumPath } from './physics/path'
import { controlState, EQUIPMENT, type ControlId } from './book/equipment'
import { lessonById } from './book/lessons'
import type { RangeSetup } from './book/progress'
import { href } from './book/router'
import { progressStore, useProgress } from './book/useProgress'
import { Sources } from './book/lesson/kit'

// three.js and R3F load only when the 3D view is shown.
const FlightScene = lazy(() => import('./scenes/FlightScene'))

const DEFAULT_RANGE_SETUP: RangeSetup = {
  speed: 30,
  angleDeg: 35,
  air: false,
  airDensity: SEA_LEVEL_AIR_DENSITY,
  mass: 0.145,
  diameter: 74,
}
const RANGE_LIMITS = {
  speed: { min: 5, max: 90, step: 1, unit: 'm/s' },
  angleDeg: { min: 5, max: 85, step: 1, unit: '°' },
  airDensity: { min: 0, max: 1.5, step: 0.005, unit: 'kg/m³' },
  mass: { min: 0.01, max: 5, step: 0.005, unit: 'kg' },
  diameter: { min: 20, max: 250, step: 1, unit: 'mm' },
} as const
const SPHERE_DRAG_COEFFICIENT = 0.47
const SAVE_DELAY_MS = 300

type NumericSetting = keyof typeof RANGE_LIMITS
const SETTING_FOR_CONTROL: Partial<Record<ControlId, NumericSetting>> = {
  speed: 'speed', angle: 'angleDeg', airDensity: 'airDensity', mass: 'mass', diameter: 'diameter',
}
const RACK_GROUPS = [...new Set(EQUIPMENT.map((e) => e.lessonId))].map((lessonId) => ({
  lesson: lessonById(lessonId)!,
  equipment: EQUIPMENT.filter((e) => e.lessonId === lessonId),
}))
const RANGE_SOURCES = [
  {
    label: 'NASA Glenn Research Center — Shape Effects on Drag',
    url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/shape-effects-on-drag/',
    note: "A sphere's drag coefficient ranges from 0.07 to 0.5 depending on speed; the range uses 0.47, near the top, for a smooth ball.",
  },
  {
    label: 'MLB Official Baseball Rules — Rule 3.01',
    url: 'https://mktg.mlbstatic.com/mlb/official-information/2026-official-baseball-rules.pdf',
    note: 'The starting mass and diameter are baseball-sized: 0.145 kg and 74 mm.',
  },
  {
    label: 'U.S. Standard Atmosphere, 1976 — sea-level conditions',
    url: 'https://ntrs.nasa.gov/citations/19770009539',
    note: 'Standard sea-level air density is 1.225 kg/m³.',
  },
]

type View = '3d' | '2d'

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch {
    return false
  }
}

function initialView(webGL: boolean): View {
  const requested = new URLSearchParams(window.location.search).get('view')
  return requested === '2d' || !webGL ? '2d' : '3d'
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function ProvingGround() {
  const progress = useProgress()
  const [setup, setSetup] = useState<RangeSetup>(() => progress.range ?? DEFAULT_RANGE_SETUP)
  const [webGL] = useState(hasWebGL)
  const [view, setView] = useState<View>(() => initialView(webGL))
  const [shot, setShot] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => progressStore.setRange(setup), SAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [setup])

  const states = new Map(EQUIPMENT.map((e) => [e.id, controlState(e, progress)]))
  const usable = (id: ControlId) => states.get(id) === 'issued' || states.get(id) === 'early-issue'
  const speed = usable('speed') ? setup.speed : DEFAULT_RANGE_SETUP.speed
  const angleDeg = usable('angle') ? setup.angleDeg : DEFAULT_RANGE_SETUP.angleDeg
  const air = usable('air') ? setup.air : DEFAULT_RANGE_SETUP.air
  const airDensity = usable('airDensity') ? setup.airDensity : DEFAULT_RANGE_SETUP.airDensity
  const mass = usable('mass') ? setup.mass : DEFAULT_RANGE_SETUP.mass
  const diameter = usable('diameter') ? setup.diameter : DEFAULT_RANGE_SETUP.diameter
  const effectiveSetup: RangeSetup = { speed, angleDeg, air, airDensity, mass, diameter }

  const { path, ghost } = useMemo(() => {
    const launch = { speed, angleDeg }
    const noAir = vacuumPath(launch)
    if (!air) return { path: noAir, ghost: undefined }
    return {
      path: dragPath({
        ...launch,
        projectile: { mass, diameter: diameter / 1000, dragCoefficient: SPHERE_DRAG_COEFFICIENT },
        air: { density: airDensity },
      }),
      ghost: noAir,
    }
  }, [speed, angleDeg, air, airDensity, mass, diameter])

  return (
    <main className="app proving-ground">
      <header className="panel proving-header">
        <a className="back" href={href({ name: 'contents' })}>← Contents</a>
        <h1 tabIndex={-1}>The proving ground</h1>
        <div className="row">
          <button type="button" onClick={() => setShot((s) => s + 1)}>Fire again</button>
          <button
            type="button"
            disabled={!webGL}
            onClick={() => setView(view === '3d' ? '2d' : '3d')}
          >
            Show {view === '3d' ? '2D' : '3D'} view
          </button>
        </div>
        {!webGL && <p className="hint">3D is unavailable here; the side view shows the same flight.</p>}
        <p className="readout" aria-live="polite" aria-atomic="true">
          Lands {path.range.toFixed(1)} m away, peaking at {path.apexHeight.toFixed(1)} m
          {ghost && ` (no air: ${ghost.range.toFixed(1)} m)`}
        </p>
        {ghost && (
          <ul className="legend" aria-label="Flight paths">
            <li><span className="key" aria-hidden="true" />With air</li>
            <li><span className="key key-ghost" aria-hidden="true" />No air</li>
          </ul>
        )}
        <FrameMeter />
      </header>

      <section className="panel proving-rack" aria-labelledby="equipment-heading">
        <h2 id="equipment-heading">Equipment rack</h2>
        {RACK_GROUPS.map(({ lesson, equipment }) => (
          <fieldset className="rack-group" key={lesson.id}>
            <legend>Lesson {lesson.number} · {lesson.title}</legend>
            <ul className="rack-list">
              {equipment.map((e) => {
                const state = states.get(e.id)!
                const setting = SETTING_FOR_CONTROL[e.id]
                const descriptionId = `rack-${e.id}-note`
                return (
                  <li className="rack-item" data-state={state} key={e.id}>
                    {state === 'not-yet-built' ? (
                      <>
                        <span className="rack-label">{e.label}</span>
                        <p className="equipment-state">Arrives with lesson {lesson.number}</p>
                      </>
                    ) : (
                      <>
                        {e.id === 'air' ? (
                          <label className="rack-switch">
                            <input
                              type="checkbox"
                              checked={air}
                              disabled={!usable(e.id)}
                              aria-describedby={descriptionId}
                              onChange={(event) => setSetup({ ...setup, air: event.target.checked })}
                            />
                            Air: {air ? 'on' : 'off'}
                          </label>
                        ) : setting && (
                          <label>
                            <span className="rack-label">
                              {e.label}: {effectiveSetup[setting]} {RANGE_LIMITS[setting].unit}
                            </span>
                            <input
                              type="range"
                              min={RANGE_LIMITS[setting].min}
                              max={RANGE_LIMITS[setting].max}
                              step={RANGE_LIMITS[setting].step}
                              value={effectiveSetup[setting]}
                              disabled={!usable(e.id)}
                              aria-describedby={descriptionId}
                              onChange={(event) => setSetup({ ...setup, [setting]: Number(event.target.value) })}
                            />
                          </label>
                        )}
                        <p className="equipment-state" id={descriptionId}>
                          {state === 'issued' && 'Issued'}
                          {state === 'early-issue' && <>Early issue. {e.note}</>}
                          {state === 'locked' && (
                            <>
                              Locked. Earn the stamp in{' '}
                              <a href={href({ name: 'lesson', id: lesson.id })}>lesson {lesson.number}, {lesson.title}</a>.
                            </>
                          )}
                        </p>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          </fieldset>
        ))}
        <Sources sources={RANGE_SOURCES} />
      </section>

      <div className="stage proving-stage">
        {view === '3d' ? (
          <Suspense fallback={<p className="loading">Loading 3D view…</p>}>
            <FlightScene path={path} ghost={ghost} shot={shot} reducedMotion={reducedMotion} />
          </Suspense>
        ) : (
          <FlightView2D path={path} ghost={ghost} shot={shot} reducedMotion={reducedMotion} />
        )}
      </div>
    </main>
  )
}
