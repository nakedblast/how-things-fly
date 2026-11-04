import { lessonById } from './lessons'
import type { Progress } from './progress'

export type ControlId = 'speed' | 'angle' | 'targets' | 'air' | 'airDensity' | 'mass' | 'diameter'
  | 'fins' | 'spinRate' | 'spinAxis' | 'profile' | 'supersonic' | 'wind' | 'altitude' | 'earthRotation'

export interface Equipment {
  id: ControlId
  lessonId: string
  label: string
  note: string
  working: boolean
}

export const EQUIPMENT: readonly Equipment[] = [
  { id: 'speed', lessonId: 'the-arc', label: 'Launch speed', note: 'Lesson 1 issues the speed control for your own launches.', working: true },
  { id: 'angle', lessonId: 'the-arc', label: 'Launch angle', note: 'Lesson 1 issues the angle control for your own launches.', working: true },
  { id: 'targets', lessonId: 'two-ways-to-hit', label: 'Target editor', note: 'Lesson 2 issues targets for the range.', working: false },
  { id: 'air', lessonId: 'air-fights-back', label: 'Air', note: 'Lesson 3 issues the air switch: fly with air or in a vacuum.', working: true },
  { id: 'airDensity', lessonId: 'air-fights-back', label: 'Air density', note: 'Lesson 3 issues air density, from a vacuum to air thicker than at sea level.', working: true },
  { id: 'mass', lessonId: 'heavy-and-light', label: 'Mass', note: "Lesson 4 isn't written yet, so the mass control is yours early.", working: true },
  { id: 'diameter', lessonId: 'heavy-and-light', label: 'Diameter', note: "Lesson 4 isn't written yet, so the diameter control is yours early.", working: true },
  { id: 'fins', lessonId: 'staying-pointed', label: 'Fins and feathers', note: 'Lesson 5 issues the finned dart, which flies nose-first.', working: true },
  { id: 'spinRate', lessonId: 'spin', label: 'Spin rate', note: 'Lesson 6 issues the spin control for your projectiles.', working: false },
  { id: 'spinAxis', lessonId: 'magnus', label: 'Spin axis', note: 'Lesson 7 issues the spin axis control to explore curved flight.', working: false },
  { id: 'profile', lessonId: 'shape-is-speed', label: 'Profile designer', note: 'Lesson 8 issues the tools to change projectile shape.', working: false },
  { id: 'supersonic', lessonId: 'sound-barrier', label: 'Supersonic speeds', note: 'Lesson 9 issues the equipment for flight beyond the speed of sound.', working: false },
  { id: 'wind', lessonId: 'the-long-shot', label: 'Wind', note: 'Lesson 10 issues the wind control for the long shot.', working: false },
  { id: 'altitude', lessonId: 'the-long-shot', label: 'Altitude', note: 'Lesson 10 issues the altitude control for the long shot.', working: false },
  { id: 'earthRotation', lessonId: 'the-long-shot', label: 'Earth rotation', note: 'Lesson 10 issues the Earth rotation control for the long shot.', working: false },
]

export type ControlState = 'issued' | 'early-issue' | 'locked' | 'not-yet-built'

export function controlState(e: Equipment, progress: Progress): ControlState {
  if (!e.working) return 'not-yet-built'
  if (progress.lessons[e.lessonId]?.stampEarnedAt) return 'issued'
  if (lessonById(e.lessonId)?.built === false) return 'early-issue'
  return 'locked'
}
