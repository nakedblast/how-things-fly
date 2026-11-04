import { useEffect, useMemo, useState } from 'react'
import { lessonById, LESSONS } from '../../book/lessons'
import { ConfidencePicker, PlaybackControls, Recall, Sources, Step, StepNav, type RecallQuestion } from '../../book/lesson/kit'
import { Reward } from '../../book/lesson/Reward'
import { useLessonFlow } from '../../book/lesson/useLessonFlow'
import type { Confidence, LessonStep } from '../../book/progress'
import { Stamp } from '../../book/Stamp'
import { progressStore, useProgress } from '../../book/useProgress'
import { Explain } from './Explain'
import { MythFigure } from './MythFigure'
import { Play } from './Play'
import { Prove } from './Prove'
import { fire, LESSON_ID, PREDICT_DISTANCE, PREDICT_SETTINGS, predictionOutcome } from './scenario'
import { SideProfile } from './SideProfile'
import { TargetMap } from './TargetMap'
import { missText, useLongPlayback, type MapPoint } from './views'
import { SOURCES } from './sources'

const STEPS: readonly LessonStep[] = ['recall', 'hook', 'predict', 'test', 'explain', 'play', 'prove', 'reward']
const RECALL: readonly RecallQuestion[] = [
  { id: 'air-angle', question: 'In the ball range, what did air do to the angle that went furthest?', options: [{ value: 'below', label: 'Moved it below 45°' }, { value: 'same', label: 'Kept it at 45°' }, { value: 'above', label: 'Moved it above 45°' }], answer: 'below', explain: 'A lower shot spends less time losing speed in dense air.' },
  { id: 'balance-leads', question: 'For a finned dart to stay nose first, which point has to lead?', options: [{ value: 'balance', label: 'The balance point' }, { value: 'push', label: 'The air’s push point' }], answer: 'balance', explain: 'Fins behind the balance point turn the nose back toward its direction of travel.' },
]

export function StampBook() {
  const progress = useProgress()
  const built = LESSONS.filter((l) => l.built)
  const complete = built.every((l) => progress.lessons[l.id]?.stampEarnedAt)
  return <section aria-label="Stamp book">
    <h3>Your stamp book</h3>
    <ul className="stamp-grid">{built.map((l) => <li key={l.id}><Stamp lesson={l} earned={Boolean(progress.lessons[l.id]?.stampEarnedAt)} /><span className="stamp-caption">{l.title.split(':')[0]}</span></li>)}</ul>
    {complete && <p className="result result-pass">Range qualification complete</p>}
  </section>
}

export default function TheLongShot() {
  const flow = useLessonFlow(LESSON_ID, STEPS)
  const shot = useMemo(() => fire(PREDICT_SETTINGS), [])
  return <div className="lesson ls-lesson">
    <StepNav flow={flow} />
    {flow.current === 'recall' && <Recall questions={RECALL} onNext={flow.next} />}
    {flow.current === 'hook' && <Step title="Final qualification">
      <p className="lede">Final qualification: one shot at a marker 120 km downrange.</p>
      <SideProfile shot={shot} t={0} />
      <p>In 1918 the Paris Gun sent shells high into the stratosphere. Your final range task uses its long flight to put wind, thin air and the Earth’s rotation together. The marker stands on an empty, fictional test range.</p>
      <p>If you aim straight at it, will a fast projectile go straight to it?</p>
      <button className="button button-primary" type="button" onClick={flow.next}>Make your prediction</button>
    </Step>}
    {flow.current === 'predict' && <Predict locked={flow.reached('test')} onNext={flow.next} />}
    {flow.current === 'test' && <Test onNext={flow.next} />}
    {flow.current === 'explain' && <Step title="Explain"><Explain shot={shot} /><button className="button button-primary" type="button" onClick={flow.next}>Separate the effects on the range</button></Step>}
    {flow.current === 'play' && <Play onNext={flow.next} />}
    {flow.current === 'reward' && <Reward lesson={lessonById(LESSON_ID)!} figure={<MythFigure />} stampBook={<StampBook />} changedNote="You put your first landing on the marker, a reasonable guess from everyday throws, then allowed for the sideways push and reached all three markers." unlockNote="Wind, thinning air and Earth rotation are now issued. Supersonic speeds are available as an early issue from the sound-barrier lesson." />}
    {flow.reached('prove') && <div hidden={flow.current !== 'prove'}><Prove onPassed={flow.next} /></div>}
    <Sources sources={SOURCES} />
  </div>
}

function savedMarker(value: unknown): MapPoint | undefined {
  if (!value || typeof value !== 'object') return undefined
  const p = value as Partial<MapPoint>
  return typeof p.range === 'number' && Number.isFinite(p.range) && typeof p.drift === 'number' && Number.isFinite(p.drift) ? { range: p.range, drift: p.drift } : undefined
}

function Predict({ locked, onNext }: { locked: boolean; onNext: () => void }) {
  const saved = useProgress().lessons[LESSON_ID]?.predictions.find((p) => p.id === 'landing')
  const [marker, setMarker] = useState<MapPoint | undefined>(() => savedMarker(saved?.value))
  const [confidence, setConfidence] = useState<Confidence | null>(saved?.confidence ?? null)
  function commit() {
    if (!marker || !confidence) return
    progressStore.recordPrediction(LESSON_ID, { id: 'landing', value: { ...marker }, confidence, at: new Date().toISOString() })
    onNext()
  }
  return <Step title="Predict: place the landing">
    <p>The gun points along the marker line. Its range table already allows for air, but treats Earth as standing still. There is no wind. Place a cross where you think the shell will come down, then choose your confidence.</p>
    <TargetMap distance={PREDICT_DISTANCE} ghost={marker} onPlace={locked ? undefined : setMarker} />
    {!locked && <p className="hint">Click the map, or focus it and use arrow keys. Enter selects the centre; Shift moves further. Place a single landing marker.</p>}
    <p role="status" className="readout">{marker ? `Your marker: ${Math.abs(marker.drift).toFixed(0)} m ${marker.drift < 0 ? 'left' : 'right'}, ${Math.abs(marker.range - PREDICT_DISTANCE).toFixed(0)} m ${marker.range < PREDICT_DISTANCE ? 'short' : 'long'}.` : 'No landing marker placed yet.'}</p>
    {locked ? <><p className="hint">Your first prediction stays filed in the logbook.</p><button type="button" className="button" onClick={onNext}>Back to the test</button></> : <>
      <ConfidencePicker name="ls-confidence" value={confidence} onChange={setConfidence} />
      <button type="button" className="button button-primary" disabled={!marker || !confidence} onClick={commit}>Commit and fire</button>
    </>}
  </Step>
}

function Test({ onNext }: { onNext: () => void }) {
  const saved = useProgress().lessons[LESSON_ID]?.predictions.find((p) => p.id === 'landing')
  const [compare, setCompare] = useState(false)
  const shot = useMemo(() => fire({ ...PREDICT_SETTINGS, rotation: !compare }), [compare])
  const playback = useLongPlayback(shot.flight.flightTime)
  const done = playback.t >= shot.flight.flightTime - 0.001
  useEffect(() => {
    const marker = savedMarker(saved?.value)
    if (saved && !saved.outcome && marker) progressStore.setOutcome(LESSON_ID, 'landing', predictionOutcome(marker, PREDICT_DISTANCE))
  }, [saved])
  function toggle(value: boolean) { setCompare(value); playback.replay() }
  return <Step title="Test: the long flight">
    <SideProfile shot={shot} t={playback.t} />
    <PlaybackControls playback={playback} duration={shot.flight.flightTime} />
    <p className="hint">Twelve times real speed; Slow motion slows the replay. Scrub to landing to inspect the miss.</p>
    <p className="readout" role="status">{done ? missText(shot, PREDICT_DISTANCE) : `${playback.t.toFixed(1)} s in flight; peak ${(shot.apexHeight / 1000).toFixed(1)} km.`}</p>
    {done && <TargetMap distance={PREDICT_DISTANCE} landing={shot} ghost={savedMarker(saved?.value)} />}
    <label className="choice"><input type="checkbox" checked={compare} onChange={(e) => toggle(e.target.checked)} />Compare: replay on a still Earth</label>
    {compare && <p>The same elevation and aim, with Earth’s rotation switched off.</p>}
    <button type="button" className="button button-primary" onClick={onNext}>Why did that happen?</button>
  </Step>
}

