import { useEffect, useState } from 'react'
import { PlaybackControls, Step } from '../../book/lesson/kit'
import { DEFAULT_SETTINGS, fire, type LongShot, type ShotSettings } from './scenario'
import { SideProfile } from './SideProfile'
import { TargetMap } from './TargetMap'
import { missText, useLongPlayback } from './views'

export function GunControls({ settings, onChange, disabled = false, highlight = false }: {
  settings: ShotSettings; onChange: (s: ShotSettings) => void; disabled?: boolean; highlight?: boolean
}) {
  return <div className={highlight ? 'controls ls-highlight' : 'controls'}>
    <label>Elevation: {settings.elevation.toFixed(2)}°
      <input aria-label="Elevation" type="range" min="30" max="65" step="0.05" value={settings.elevation} disabled={disabled} onChange={(e) => onChange({ ...settings, elevation: Number(e.target.value) })} />
    </label>
    <label>Aim: {Math.abs(settings.aim).toFixed(2)}° {settings.aim < 0 ? 'left' : settings.aim > 0 ? 'right' : '(along the marker line)'}
      <input aria-label="Aim" type="range" min="-2" max="2" step="0.02" value={settings.aim} disabled={disabled} onChange={(e) => onChange({ ...settings, aim: Number(e.target.value) })} />
    </label>
  </div>
}

export function ShotResult({ shot, distance, ghost, onLanded }: {
  shot: LongShot; distance: number; ghost?: { range: number; drift: number }; onLanded?: () => void
}) {
  const playback = useLongPlayback(shot.flight.flightTime, shot.flight)
  const done = playback.t >= shot.flight.flightTime - 0.001
  useEffect(() => {
    if (done) onLanded?.()
  }, [done, onLanded])
  return <>
    <SideProfile shot={shot} t={playback.t} />
    <PlaybackControls playback={playback} duration={shot.flight.flightTime} />
    <p className="hint">Flight replayed at twelve times real speed; Slow motion slows the replay.</p>
    <p className="readout" role="status">{done ? missText(shot, distance) : `${playback.t.toFixed(1)} s into a ${shot.flight.flightTime.toFixed(1)} s flight.`}</p>
    <TargetMap distance={distance} landing={done ? shot : undefined} ghost={ghost} />
  </>
}

export function Play({ onNext }: { onNext: () => void }) {
  const [settings, setSettings] = useState<ShotSettings>(DEFAULT_SETTINGS)
  const [windOn, setWindOn] = useState(false)
  const [windSpeed, setWindSpeed] = useState(12)
  const [windDirection, setWindDirection] = useState(270)
  const [fired, setFired] = useState<{ shot: LongShot; id: number; goals: boolean[] } | null>(null)
  const [found, setFound] = useState([false, false, false])
  function launch() {
    const s = { ...settings, wind: windOn ? windSpeed : 0, windDirection }
    const shot = fire(s)
    // Comparisons are computed only on Fire, and at identical elevation/aim.
    const reference = !s.thinAir ? fire({ ...s, thinAir: true }) : null
    // Goals tick when the shell lands, not when it is fired.
    const goals = [
      Boolean(reference && shot.range < reference.range / 2),
      s.rotation && s.latitude < 0 && s.wind === 0 && s.aim === 0 && shot.drift < 0,
      s.rotation && s.latitude > 0 && Math.abs(s.aim) < 0.001 && s.wind !== 0 && Math.abs(shot.drift) <= 100,
    ]
    setFired({ shot, id: (fired?.id ?? 0) + 1, goals })
  }
  return <Step title="Play: separate the effects">
    <p>Change the conditions, then fire. Keep the aim along the marker line when you are testing sideways pushes. These optional checks point to three things worth finding.</p>
    <ul className="goals">
      <li>{found[0] ? '✓ Found:' : '○ Find:'} sea-level air all the way up cuts the range to below half.</li>
      <li>{found[1] ? '✓ Found:' : '○ Find:'} with no wind and straight aim, a southern latitude moves the landing left.</li>
      <li>{found[2] ? '✓ Found:' : '○ Find:'} on the northern range, use wind alone to cancel rotation to within 100 m of the line.</li>
    </ul>
    <GunControls settings={settings} onChange={setSettings} />
    <div className="controls">
      <label className="choice"><input type="checkbox" checked={windOn} onChange={(e) => setWindOn(e.target.checked)} />Wind</label>
      {windOn && <>
        <label>Wind speed: {windSpeed} m/s<input type="range" min="0" max="20" step="0.5" value={windSpeed} onChange={(e) => setWindSpeed(Number(e.target.value))} /></label>
        <label>Wind blows toward: {windDirection}°<input type="range" min="0" max="360" step="5" value={windDirection} onChange={(e) => setWindDirection(Number(e.target.value))} /></label>
        <p className="hint">Downrange 0° · right 90° · back 180° · left 270°. Constant with height.</p>
      </>}
      <label className="choice"><input type="checkbox" checked={settings.thinAir} onChange={(e) => setSettings({ ...settings, thinAir: e.target.checked })} />Air thins with height</label>
      <label className="choice"><input type="checkbox" checked={settings.rotation} onChange={(e) => setSettings({ ...settings, rotation: e.target.checked })} />Earth rotation</label>
      <label>Latitude: {settings.latitude}° {settings.latitude < 0 ? 'south' : 'north'}<input type="range" min="-80" max="80" step="0.5" value={settings.latitude} onChange={(e) => setSettings({ ...settings, latitude: Number(e.target.value) })} /></label>
    </div>
    <button className="button" type="button" onClick={launch}>Fire</button>
    {fired && <ShotResult key={fired.id} shot={fired.shot} distance={120_000} onLanded={() => setFound((old) => (old.every((f, i) => f || !fired.goals[i]) ? old : old.map((f, i) => f || fired.goals[i])))} />}
    <button className="button button-primary" type="button" onClick={onNext}>Take the final qualification</button>
  </Step>
}
