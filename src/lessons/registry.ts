import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

// Built lessons, each in its own chunk so the book opens fast.
export const LESSON_MODULES: Record<string, LazyExoticComponent<ComponentType>> = {
  'the-arc': lazy(() => import('./the-arc/TheArc')),
}

// Pictures for the logbook's field notes: the learner's prediction next to what happened.
export const MYTH_FIGURES: Record<string, LazyExoticComponent<ComponentType>> = {
  'the-arc': lazy(() => import('./the-arc/MythFigure').then((m) => ({ default: m.MythFigure }))),
}
