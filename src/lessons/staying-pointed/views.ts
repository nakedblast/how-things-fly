// Plain helpers for the lesson's views: framing and wording.

import { frameFor, size, type Frame } from '../../scenes/frame'
import type { DartShot, Projectile } from './scenario'

export function shotFrame(shots: readonly DartShot[]): Frame {
  return frameFor(
    shots.flatMap((s) => s.flight.samples.map((p) => p.pos)),
    { minWidth: 30, minAspect: 0.3, behind: 4 },
  )
}

/** How much larger than life to draw the projectile so it reads at this frame's size. */
export function enlargement(p: Projectile, frame: Frame): number {
  return Math.max(1, size(frame, 9) / p.shape.length)
}

/** Text for a behaviour, for readouts. */
export function behaviourText(shot: DartShot): string {
  switch (shot.behaviour) {
    case 'true':
      return `flew true: after its release wobble it never pointed more than ${Math.max(1, Math.round(shot.lateAlphaDeg))}° off its path`
    case 'wobble':
      return `wobbled: it stayed nose-first but swung up to ${Math.round(shot.lateAlphaDeg)}° off its path`
    case 'tumble':
      return 'tumbled: it swung right round, at times flying tail-first'
  }
}
