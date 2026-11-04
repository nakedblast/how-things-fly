// Reading progress, kept only in this browser (see LESSON_DESIGN.md, "Progress data").
// Every storage access is guarded: without storage the book still works and forgets on reload.

export const STORAGE_KEY = 'far-and-true.progress'
export const SCHEMA_VERSION = 1

export const LESSON_STEPS = ['recall', 'hook', 'predict', 'test', 'explain', 'play', 'prove', 'reward'] as const
export type LessonStep = (typeof LESSON_STEPS)[number]

/** How sure the learner said they were when committing to a prediction. */
export type Confidence = 'guess' | 'fairly-sure' | 'certain'
/** Compared with what happened: matched the real result, or held the lesson's myth, or neither. */
export type PredictionOutcome = 'matched' | 'myth' | 'other'
export type MythVariant = 'changed-my-mind' | 'saw-through-it'
export type Medal = 'prove-gold' | `play-gold:${string}`

/** Plain JSON a lesson defines for itself: a marker position, a sketch, a chosen option. */
export type PredictionValue = null | boolean | number | string | PredictionValue[] | { [key: string]: PredictionValue }

export interface Prediction {
  /** Which prediction in the lesson, e.g. "which-lands-first". */
  id: string
  value: PredictionValue
  confidence: Confidence
  /** Unset until the Test step has run. */
  outcome?: PredictionOutcome
  at: string
}

export interface LessonProgress {
  step: LessonStep
  predictions: Prediction[]
  stampEarnedAt?: string
  myth?: { variant: MythVariant; predictionId: string }
  medals: Medal[]
}

export interface RangeSetup {
  speed: number
  angleDeg: number
  air: boolean
  airDensity: number
  mass: number
  diameter: number // mm in the rack; converted to metres when building physics parameters
}

export interface Progress {
  version: typeof SCHEMA_VERSION
  lessons: Record<string, LessonProgress>
  /** The last lesson opened, for "continue reading" on the cover. */
  lastLessonId?: string
  range?: RangeSetup
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function emptyProgress(): Progress {
  return { version: SCHEMA_VERSION, lessons: {} }
}

export function emptyLesson(): LessonProgress {
  return { step: 'recall', predictions: [], medals: [] }
}

const CONFIDENCE: readonly string[] = ['guess', 'fairly-sure', 'certain']
const OUTCOMES: readonly string[] = ['matched', 'myth', 'other']
const MYTHS: readonly string[] = ['changed-my-mind', 'saw-through-it']

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function parseRange(raw: unknown): RangeSetup | undefined {
  if (!isRecord(raw)) return undefined
  const { speed, angleDeg, air, airDensity, mass, diameter } = raw
  if (typeof speed !== 'number' || !Number.isFinite(speed)
    || typeof angleDeg !== 'number' || !Number.isFinite(angleDeg)
    || typeof air !== 'boolean'
    || typeof airDensity !== 'number' || !Number.isFinite(airDensity)
    || typeof mass !== 'number' || !Number.isFinite(mass)
    || typeof diameter !== 'number' || !Number.isFinite(diameter)) return undefined
  return { speed, angleDeg, air, airDensity, mass, diameter }
}

function parsePrediction(raw: unknown): Prediction | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.at !== 'string') return null
  if (typeof raw.confidence !== 'string' || !CONFIDENCE.includes(raw.confidence)) return null
  const p: Prediction = {
    id: raw.id,
    value: (raw.value ?? null) as PredictionValue,
    confidence: raw.confidence as Confidence,
    at: raw.at,
  }
  if (typeof raw.outcome === 'string' && OUTCOMES.includes(raw.outcome)) p.outcome = raw.outcome as PredictionOutcome
  return p
}

function parseLesson(raw: unknown): LessonProgress | null {
  if (!isRecord(raw)) return null
  const lesson = emptyLesson()
  if (typeof raw.step === 'string' && (LESSON_STEPS as readonly string[]).includes(raw.step)) {
    lesson.step = raw.step as LessonStep
  }
  if (Array.isArray(raw.predictions)) {
    lesson.predictions = raw.predictions.map(parsePrediction).filter((p): p is Prediction => p !== null)
  }
  if (typeof raw.stampEarnedAt === 'string') lesson.stampEarnedAt = raw.stampEarnedAt
  const myth = raw.myth
  if (isRecord(myth) && typeof myth.variant === 'string' && MYTHS.includes(myth.variant) && typeof myth.predictionId === 'string') {
    lesson.myth = { variant: myth.variant as MythVariant, predictionId: myth.predictionId }
  }
  if (Array.isArray(raw.medals)) {
    lesson.medals = raw.medals.filter(
      (m): m is Medal => typeof m === 'string' && (m === 'prove-gold' || m.startsWith('play-gold:')),
    )
  }
  return lesson
}

/** Reads saved progress defensively: unknown or damaged fields are dropped, never thrown. */
export function parseProgress(json: string | null): Progress {
  if (!json) return emptyProgress()
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return emptyProgress()
  }
  if (!isRecord(raw) || raw.version !== SCHEMA_VERSION || !isRecord(raw.lessons)) return emptyProgress()
  const progress = emptyProgress()
  for (const [id, value] of Object.entries(raw.lessons)) {
    const lesson = parseLesson(value)
    if (lesson) progress.lessons[id] = lesson
  }
  if (typeof raw.lastLessonId === 'string') progress.lastLessonId = raw.lastLessonId
  const range = parseRange(raw.range)
  if (range) progress.range = range
  return progress
}

export interface ProgressStore {
  getSnapshot(): Progress
  subscribe(listener: () => void): () => void
  /** False when the browser refused storage; progress then lasts only until reload. */
  isPersistent(): boolean
  update(change: (draft: Progress) => void): void
  lesson(id: string): LessonProgress
  setStep(lessonId: string, step: LessonStep): void
  recordPrediction(lessonId: string, prediction: Prediction): void
  setOutcome(lessonId: string, predictionId: string, outcome: PredictionOutcome): void
  fileMythCard(lessonId: string, variant: MythVariant, predictionId: string): void
  awardStamp(lessonId: string): void
  awardMedal(lessonId: string, medal: Medal): void
  openLesson(lessonId: string): void
  setRange(setup: RangeSetup): void
  reset(): void
  /** Reloads from storage, e.g. after another tab changed it. */
  reload(): void
}

export function createProgressStore(storage: StorageLike | null, now: () => Date = () => new Date()): ProgressStore {
  let persistent = storage !== null
  const listeners = new Set<() => void>()

  function read(): Progress {
    if (!storage) return emptyProgress()
    try {
      return parseProgress(storage.getItem(STORAGE_KEY))
    } catch {
      persistent = false
      return emptyProgress()
    }
  }

  let state = read()

  function write() {
    if (!storage) return
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state))
      persistent = true
    } catch {
      persistent = false
    }
  }

  function emit() {
    for (const l of listeners) l()
  }

  function update(change: (draft: Progress) => void) {
    const draft = structuredClone(state)
    change(draft)
    state = draft
    write()
    emit()
  }

  function withLesson(id: string, change: (lesson: LessonProgress) => void) {
    update((draft) => {
      const lesson = (draft.lessons[id] ??= emptyLesson())
      change(lesson)
    })
  }

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    isPersistent: () => persistent,
    update,
    lesson: (id) => state.lessons[id] ?? emptyLesson(),
    setStep: (lessonId, step) =>
      withLesson(lessonId, (l) => {
        l.step = step
      }),
    recordPrediction: (lessonId, prediction) =>
      withLesson(lessonId, (l) => {
        // A learner re-entering a lesson may predict again; the latest commitment replaces the earlier one.
        l.predictions = [...l.predictions.filter((p) => p.id !== prediction.id), prediction]
      }),
    setOutcome: (lessonId, predictionId, outcome) =>
      withLesson(lessonId, (l) => {
        const p = l.predictions.find((x) => x.id === predictionId)
        if (p) p.outcome = outcome
      }),
    fileMythCard: (lessonId, variant, predictionId) =>
      withLesson(lessonId, (l) => {
        // The first filing is kept: "changed my mind" records the original prediction.
        l.myth ??= { variant, predictionId }
      }),
    awardStamp: (lessonId) =>
      withLesson(lessonId, (l) => {
        l.stampEarnedAt ??= now().toISOString()
      }),
    awardMedal: (lessonId, medal) =>
      withLesson(lessonId, (l) => {
        if (!l.medals.includes(medal)) l.medals = [...l.medals, medal]
      }),
    openLesson: (lessonId) =>
      update((draft) => {
        draft.lastLessonId = lessonId
      }),
    setRange: (setup) =>
      update((draft) => {
        draft.range = { ...setup }
      }),
    reset() {
      state = emptyProgress()
      if (storage) {
        try {
          storage.removeItem(STORAGE_KEY)
        } catch {
          persistent = false
        }
      }
      emit()
    },
    reload() {
      state = read()
      emit()
    },
  }
}

/** The browser's localStorage, or null where reading it throws (blocked cookies, some private modes). */
export function browserStorage(): StorageLike | null {
  try {
    const s = window.localStorage
    const probe = `${STORAGE_KEY}.probe`
    s.setItem(probe, '1')
    s.removeItem(probe)
    return s
  } catch {
    return null
  }
}
