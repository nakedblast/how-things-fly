import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import FlightView2D from './scenes/FlightView2D'
import { FrameMeter } from './FrameMeter'
import { SEA_LEVEL_AIR_DENSITY } from './physics/flight'
import { constantAtmosphere, scaledStandardAtmosphere } from './physics/atmosphere'
import { simulateDart } from './physics/dart'
import { dartPath, dragPath, flight3dPath, vacuumPath } from './physics/path'
import { dragTable, simulateFlight3D } from './physics/flight3d'
import { rangeDart, stopX } from './lessons/staying-pointed/scenario'
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
  wind: { head: 0, cross: 0 },
  thinAir: false,
  earthRotation: false,
  latitudeDeg: 49,
  supersonic: false,
}
const RANGE_LIMITS = {
  speed: { min: 5, max: 90, step: 1, unit: 'm/s' },
  angleDeg: { min: 5, max: 85, step: 1, unit: '°' },
  airDensity: { min: 0, max: 1.5, step: 0.005, unit: 'kg/m³' },
  mass: { min: 0.01, max: 5, step: 0.005, unit: 'kg' },
  diameter: { min: 20, max: 250, step: 1, unit: 'mm' },
} as const
const SPHERE_DRAG_COEFFICIENT = 0.47
// FAA AC 450.115-1A, section 9.2.1, Table 1 (p. 35). Below Mach 0.5 the range
// retains its original 0.47 Cd; the published transonic and supersonic nodes follow.
const SPHERE_DRAG_CURVE = dragTable([
  [0, 0.47], [0.5, 0.47], [0.6, 0.52], [0.8, 0.64], [0.9, 0.73],
  [1, 0.82], [1.4, 1.05], [2, 1], [4, 0.93], [10, 0.92],
])
// The lesson 5 training dart with its weight at the nose.
const RANGE_DART = rangeDart(stopX('nose')).dart
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
    note: "At subsonic speeds, a sphere's drag coefficient ranges from 0.07 to 0.5 depending on speed; the range uses 0.47, near the top, for a smooth ball.",
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
  {
    label: 'FAA Advisory Circular AC 450.115-1A — sphere drag coefficients',
    url: 'https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_450.115-1A.pdf',
    note: 'Section 9.2.1, Table 1 (p. 35) gives the sphere Cd reference curve from Mach 0.3 to 10. The proving ground keeps Cd 0.47 through Mach 0.5, then interpolates the published points linearly. It is an illustrative reference, not a correction for every ball size or Reynolds-number regime.',
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
  const fins = usable('fins') ? setup.fins ?? false : false
  const wind = usable('wind') ? setup.wind ?? DEFAULT_RANGE_SETUP.wind! : DEFAULT_RANGE_SETUP.wind!
  const thinAir = usable('altitude') ? setup.thinAir ?? false : false
  const earthRotation = usable('earthRotation') ? setup.earthRotation ?? false : false
  const latitudeDeg = usable('earthRotation') ? setup.latitudeDeg ?? 49 : 49
  const supersonic = usable('supersonic') ? setup.supersonic ?? false : false
  const maxSpeed = supersonic && !fins ? 1600 : RANGE_LIMITS.speed.max
  const effectiveSpeed = Math.min(speed, maxSpeed)
  const effectiveSetup: RangeSetup = {
    speed: effectiveSpeed, angleDeg, air, airDensity, mass, diameter, fins,
    wind, thinAir, earthRotation, latitudeDeg, supersonic,
  }

  const { path, ghost } = useMemo(() => {
    const launch = { speed: effectiveSpeed, angleDeg }
    const noAir = vacuumPath(launch)
    if (fins) {
      const flight = simulateDart({ dart: RANGE_DART, speed: effectiveSpeed, elevationDeg: angleDeg, airDensity: air ? airDensity : 0, timeStep: 1 / 500 })
      return { path: dartPath(flight), ghost: air ? noAir : undefined }
    }
    const has3DEffect = wind.head !== 0 || wind.cross !== 0 || thinAir || earthRotation || supersonic
    if (has3DEffect) {
      const density = air ? airDensity : 0
      const areaPerMass = (Math.PI * (diameter / 1000) ** 2) / (8 * mass)
      const stiffness = density * areaPerMass * 1.05 * effectiveSpeed
      const timeStep = Math.min(0.03, stiffness > 0 ? 0.12 / stiffness : 0.03)
      const flight = simulateFlight3D({
        launch: { speed: effectiveSpeed, elevationDeg: angleDeg },
        projectile: {
          mass,
          diameter: diameter / 1000,
          drag: supersonic ? SPHERE_DRAG_CURVE : SPHERE_DRAG_COEFFICIENT,
        },
        environment: {
          atmosphere: thinAir
            ? scaledStandardAtmosphere(density)
            : constantAtmosphere(density),
          wind: { x: -wind.head, y: 0, z: wind.cross },
          earthRotation: earthRotation ? { latitudeDeg, azimuthDeg: 232 } : undefined,
        },
        timeStep,
      })
      return { path: flight3dPath(flight), ghost: air ? noAir : undefined }
    }
    if (!air) return { path: noAir, ghost: undefined }
    return {
      path: dragPath({
        ...launch,
        projectile: { mass, diameter: diameter / 1000, dragCoefficient: SPHERE_DRAG_COEFFICIENT },
        air: { density: airDensity },
      }),
      ghost: noAir,
    }
  }, [effectiveSpeed, angleDeg, air, airDensity, mass, diameter, fins, wind.head, wind.cross, thinAir, earthRotation, latitudeDeg, supersonic])

  const drift = path.lateralDrift
  const driftReadout = drift === undefined
    ? ''
    : `; drifted ${Math.abs(drift) < 1 ? `${(Math.abs(drift) * 100).toFixed(0)} cm` : `${Math.abs(drift).toFixed(1)} m`} ${drift < 0 ? 'left' : 'right'}`

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
          Lands {path.range.toFixed(1)} m away, peaking at {path.apexHeight.toFixed(1)} m{driftReadout}
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
                        {e.id === 'fins' ? (
                          <label className="rack-switch">
                            <input
                              type="checkbox"
                              checked={fins}
                              disabled={!usable(e.id)}
                              aria-describedby={descriptionId}
                              onChange={(event) => setSetup({ ...setup, fins: event.target.checked })}
                            />
                            Fly: {fins ? 'the finned dart' : 'the range ball'}
                          </label>
                        ) : e.id === 'air' ? (
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
                        ) : e.id === 'wind' ? (
                          <>
                            <label>
                              <span className="rack-label">Headwind / tailwind: {wind.head} m/s</span>
                              <input
                                type="range" min={-20} max={20} step={0.1} value={wind.head}
                                disabled={!usable(e.id)} aria-describedby={descriptionId}
                                onChange={(event) => setSetup({ ...setup, wind: { ...wind, head: Number(event.target.value) } })}
                              />
                            </label>
                            <label>
                              <span className="rack-label">Crosswind (from left positive): {wind.cross} m/s</span>
                              <input
                                type="range" min={-20} max={20} step={0.1} value={wind.cross}
                                disabled={!usable(e.id)} aria-describedby={descriptionId}
                                onChange={(event) => setSetup({ ...setup, wind: { ...wind, cross: Number(event.target.value) } })}
                              />
                            </label>
                          </>
                        ) : e.id === 'altitude' ? (
                          <label className="rack-switch">
                            <input
                              type="checkbox" checked={thinAir} disabled={!usable(e.id)} aria-describedby={descriptionId}
                              onChange={(event) => setSetup({ ...setup, thinAir: event.target.checked })}
                            />
                            Air thins with height: {thinAir ? 'on' : 'off'}
                          </label>
                        ) : e.id === 'earthRotation' ? (
                          <>
                            <label className="rack-switch">
                              <input
                                type="checkbox" checked={earthRotation} disabled={!usable(e.id)} aria-describedby={descriptionId}
                                onChange={(event) => setSetup({ ...setup, earthRotation: event.target.checked })}
                              />
                              Earth rotation: {earthRotation ? 'on' : 'off'}
                            </label>
                            <label>
                              <span className="rack-label">Latitude: {latitudeDeg}°</span>
                              <input
                                type="range" min={-80} max={80} step={1} value={latitudeDeg}
                                disabled={!usable(e.id)} aria-describedby={descriptionId}
                                onChange={(event) => setSetup({ ...setup, latitudeDeg: Number(event.target.value) })}
                              />
                            </label>
                          </>
                        ) : e.id === 'supersonic' ? (
                          <label className="rack-switch">
                            <input
                              type="checkbox" checked={supersonic} disabled={!usable(e.id)} aria-describedby={descriptionId}
                              onChange={(event) => setSetup({ ...setup, supersonic: event.target.checked })}
                            />
                            Supersonic sphere drag and speed limit: {supersonic ? 'on' : 'off'}
                          </label>
                        ) : setting && (
                          <label>
                            <span className="rack-label">
                              {e.label}: {effectiveSetup[setting]} {RANGE_LIMITS[setting].unit}
                            </span>
                            <input
                              type="range"
                              min={RANGE_LIMITS[setting].min}
                              max={setting === 'speed' ? maxSpeed : RANGE_LIMITS[setting].max}
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
                          {e.id === 'fins' && fins && usable(e.id) && '. The dart has its own mass and size (410 g, 25 mm), so mass, diameter, wind, altitude, Earth rotation and supersonic controls apply only to the ball. With no air, nothing turns it: it keeps its launch angle.'}
                          {state === 'early-issue' && <>Early issue. {e.note}</>}
                          {state === 'locked' && (
                            <>
                              Locked. Earn the stamp in{' '}
                              <a href={href({ name: 'lesson', id: lesson.id })}>lesson {lesson.number}, {lesson.title}</a>.
                            </>
                          )}
                          {(e.id === 'wind' || e.id === 'altitude') && usable(e.id) && !air && (
                            <>
                              {' '}Needs air: switch air on to feel it.
                              {!usable('air') && <> Earn the stamp in{' '}
                                <a href={href({ name: 'lesson', id: 'air-fights-back' })}>lesson 3, {lessonById('air-fights-back')!.title}</a>.
                              </>}
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
            <div className="flight-3d" role="img" aria-label="3D view of the shot">
              <FlightScene path={path} ghost={ghost} shot={shot} reducedMotion={reducedMotion} />
            </div>
          </Suspense>
        ) : (
          <FlightView2D path={path} ghost={ghost} shot={shot} reducedMotion={reducedMotion} />
        )}
      </div>
    </main>
  )
}
