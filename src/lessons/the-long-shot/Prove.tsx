import { useState } from 'react'
import { HintLadder, Step } from '../../book/lesson/kit'
import { progressStore } from '../../book/useProgress'
import { ExplainAir, ExplainRotation, ExplainWind } from './Explain'
import { GunControls, ShotResult } from './Play'
import { fire, LESSON_ID, missDistance, practiceSettings, PROVE_MARKERS, settingsForMarker, type LongShot, type Marker } from './scenario'

export function Prove({ onPassed }: { onPassed: () => void }) {
  const [passed, setPassed] = useState<string[]>([])
  const [gold, setGold] = useState(false)
  function qualify() {
    const myth = progressStore.lesson(LESSON_ID).predictions.find((p) => p.id === 'landing')
    progressStore.fileMythCard(LESSON_ID, myth?.outcome === 'myth' ? 'changed-my-mind' : 'saw-through-it', 'landing')
    if (gold) progressStore.awardMedal(LESSON_ID, 'prove-gold')
    progressStore.awardStamp(LESSON_ID)
    onPassed()
  }
  return <Step title="Prove: final qualification">
    <p>Three markers on an empty test range. Each shot adds an effect. Adjust both elevation and aim; there is no limit on retries.</p>
    {PROVE_MARKERS.map((marker, index) => index <= passed.length && <Challenge key={marker.id} marker={marker} index={index} done={passed.includes(marker.id)} onPass={(precision) => {
      setPassed((old) => [...old, marker.id])
      if (index === 2) setGold(precision)
    }} />)}
    {passed.length === PROVE_MARKERS.length && <div className="passed"><p>All three markers reached.{gold ? ' The final shot also earned the precision medal.' : ''}</p><button type="button" className="button button-primary" onClick={qualify}>Collect your stamp</button></div>}
  </Step>
}

function Challenge({ marker, index, done, onPass }: { marker: Marker; index: number; done: boolean; onPass: (gold: boolean) => void }) {
  const [generation, setGeneration] = useState(0)
  const [settings, setSettings] = useState(() => ({ ...settingsForMarker(marker), elevation: 40, aim: 0 }))
  const [shot, setShot] = useState<{ flight: LongShot; id: number } | null>(null)
  const [misses, setMisses] = useState(0)
  const [rung, setRung] = useState(0)
  const [walked, setWalked] = useState(false)
  const solution = practiceSettings(marker, generation).solution
  const error = shot ? missDistance(shot.flight, marker.distance) : null
  function launch() {
    const flight = fire(settings)
    const miss = missDistance(flight, marker.distance)
    setShot({ flight, id: (shot?.id ?? 0) + 1 })
    if (miss <= 300 && !walked) onPass(miss <= 100)
    else if (miss > 300) setMisses((n) => n + 1)
  }
  function fresh() {
    const next = generation + 1
    setGeneration(next)
    setSettings({ ...practiceSettings(marker, next).settings, elevation: 40, aim: 0 })
    setShot(null); setMisses(0); setRung(0); setWalked(false)
  }
  const remember = index === 0 ? <ExplainWind /> : index === 1 ? <ExplainAir /> : <ExplainRotation />
  return <section className="puzzle" aria-labelledby={`ls-prove-${index}`}>
    <h3 id={`ls-prove-${index}`}>Shot {index + 1}: {marker.title}{generation > 0 ? ' · fresh wind' : ''}</h3>
    <p>Marker {(marker.distance / 1000).toFixed(1)} km downrange. Wind {Math.abs(settings.wind).toFixed(1)} m/s {settings.wind < 0 ? 'from the right' : 'from the left'}. Air thins with height. Earth rotation {marker.rotation ? `on at ${marker.latitude}° north` : 'off'}.</p>
    <p className="hint">Pass within 300 m.{index === 2 && ' Gold within 100 m.'}</p>
    <GunControls settings={settings} onChange={setSettings} disabled={done || walked} highlight={rung >= 1} />
    {!done && !walked && <button type="button" className="button" onClick={launch}>Fire shot {index + 1}</button>}
    {shot && <>
      <ShotResult key={shot.id} shot={shot.flight} distance={marker.distance} />
      <p role="status" className={done ? 'result result-pass' : 'result'}>{done ? `Marker reached: ${error!.toFixed(0)} m from its centre.` : walked ? 'The walked solution is practice. Solve a fresh wind to qualify.' : `${error!.toFixed(0)} m from the marker. ${index === 1 ? 'Look at how elevation changes time in thin air, then correct the sideways wind.' : index === 2 ? 'Allow for wind and the Earth’s rightward push together.' : 'Use elevation for distance and aim against the wind for sideways position.'}`}</p>
    </>}
    {!done && <HintLadder misses={misses} rung={rung} onOpen={(n) => { setRung(n); if (n === 4) setWalked(true) }} rungs={{
      lookHere: <p>{index === 1 ? 'Elevation is highlighted: the shell needs to get above the dense air.' : 'Aim is highlighted: the landing follows the wind and, on the last shot, Earth’s rotation.'}</p>,
      remember,
      oneStep: <p>{index === 1 ? 'Start above 45°, then trim elevation for range.' : `Aim ${solution.aim < 0 ? 'left' : 'right'}, against the sideways displacement, by roughly ${Math.abs(solution.aim).toFixed(1)}°.`}</p>,
      showMe: <>
        <p>In this model, set elevation to {solution.elevation.toFixed(2)}°, then aim {Math.abs(solution.aim).toFixed(2)}° {solution.aim < 0 ? 'left' : 'right'}. Elevation reaches the distance; the aim offsets the combined sideways push.</p>
        <button type="button" className="button" onClick={() => setShot({ flight: fire({ ...settings, ...solution }), id: (shot?.id ?? 0) + 1 })}>Replay the worked solution</button>
        <button type="button" className="button button-primary" onClick={fresh}>Try a fresh wind to qualify</button>
      </>,
    }} />}
  </section>
}
