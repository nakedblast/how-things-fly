// The book's table of contents, in reading order (see the curriculum).
// A lesson with `built: false` shows as "coming soon" with its hook question.

export interface Lesson {
  /** Stable id used in URLs and saved progress; never renumber. */
  id: string
  number: number
  act: number
  title: string
  /** Name of the misconception the lesson's myth card is about. */
  myth: string
  hook: string
  /** Proving-ground equipment issued when the stamp is earned. */
  unlocks: string
  built: boolean
}

export const ACTS: Record<number, string> = {
  1: 'Gravity',
  2: 'Air',
  3: 'Staying true',
  4: 'Fast and far',
}

export const LESSONS: readonly Lesson[] = [
  {
    id: 'the-arc',
    myth: 'Impetus',
    number: 1,
    act: 1,
    title: 'The arc',
    hook: 'A cannon on a cliff fires a ball straight out to sea. At the same moment, a ball is dropped from the same height. Which hits the water first?',
    unlocks: 'Launch speed and angle',
    built: true,
  },
  {
    id: 'two-ways-to-hit',
    myth: 'One right angle',
    number: 2,
    act: 1,
    title: 'Two ways to hit',
    hook: 'A target stands behind a tall wall. Is there only one angle that will reach it?',
    unlocks: 'Target editor',
    built: false,
  },
  {
    id: 'air-fights-back',
    myth: 'The way down mirrors the way up',
    number: 3,
    act: 2,
    title: 'Air fights back',
    hook: 'A ball machine fires a tennis ball 45° up. Now that there is air, does the way down mirror the way up?',
    unlocks: 'Air switch and air density',
    built: true,
  },
  {
    id: 'heavy-and-light',
    myth: 'Heavier falls faster',
    number: 4,
    act: 2,
    title: 'Heavy and light',
    hook: 'Drop a golf ball and a ping-pong ball from a tower. Do they land together?',
    unlocks: 'Mass and diameter',
    built: false,
  },
  {
    id: 'staying-pointed',
    myth: 'The heavy end trails',
    number: 5,
    act: 3,
    title: 'Staying pointed: fins and feathers',
    hook: 'Why does an arrow carry its feathers at the back and not at the front?',
    unlocks: 'Fin-stabilised projectiles',
    built: false,
  },
  {
    id: 'spin',
    myth: 'Spin drills through the air',
    number: 6,
    act: 3,
    title: 'Spin: the gyroscope in flight',
    hook: 'A spinning bullet and a finned dart both fly nose-first. What is the spin actually doing?',
    unlocks: 'Spin rate',
    built: false,
  },
  {
    id: 'magnus',
    myth: 'Steered after the kick',
    number: 7,
    act: 3,
    title: 'Spin that curves: the Magnus effect',
    hook: 'Once a free kick has left the boot, nobody touches it. So what bends it around the wall?',
    unlocks: 'Spin axis',
    built: false,
  },
  {
    id: 'shape-is-speed',
    myth: 'Bigger carries further',
    number: 8,
    act: 4,
    title: 'Shape is speed',
    hook: 'Two projectiles of the same weight leave at the same speed. Why does one arrive far faster than the other?',
    unlocks: 'Profile designer',
    built: false,
  },
  {
    id: 'sound-barrier',
    myth: 'Drag rises smoothly',
    number: 9,
    act: 4,
    title: 'The sound barrier',
    hook: 'Why does the air push back so much harder once a projectile nears the speed of sound?',
    unlocks: 'Supersonic speeds',
    built: false,
  },
  {
    id: 'the-long-shot',
    myth: 'Aim straight at it',
    number: 10,
    act: 4,
    title: 'The long shot',
    hook: 'In 1918 a gun fired on Paris from far beyond the horizon. What did its crew have to allow for that nobody had needed before?',
    unlocks: 'Wind, altitude and Earth rotation',
    built: false,
  },
]

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id)
}
