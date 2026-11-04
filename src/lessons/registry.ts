import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

// Built lessons, each in its own chunk so the book opens fast.
export const LESSON_MODULES: Record<string, LazyExoticComponent<ComponentType>> = {
  'the-long-shot': lazy(() => import('./the-long-shot/TheLongShot')),
  'the-arc': lazy(() => import('./the-arc/TheArc')),
  'air-fights-back': lazy(() => import('./air-fights-back/AirFightsBack')),
  'staying-pointed': lazy(() => import('./staying-pointed/StayingPointed')),
}

// Pictures for the logbook's field notes: the learner's prediction next to what happened.
export const MYTH_FIGURES: Record<string, LazyExoticComponent<ComponentType>> = {
  'the-long-shot': lazy(() => import('./the-long-shot/MythFigure').then((m) => ({ default: m.MythFigure }))),
  'the-arc': lazy(() => import('./the-arc/MythFigure').then((m) => ({ default: m.MythFigure }))),
  'air-fights-back': lazy(() => import('./air-fights-back/MythFigure').then((m) => ({ default: m.MythFigure }))),
  'staying-pointed': lazy(() => import('./staying-pointed/MythFigure').then((m) => ({ default: m.MythFigure }))),
}
