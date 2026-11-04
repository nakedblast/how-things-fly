import { useState } from 'react'
import { reducedMotion, usePlayback } from '../../book/lesson/playback'
import { clampFlightTime } from './scenario'

const SCRUB_STEP = 0.05

export interface MapPoint { range: number; drift: number }

export function missText(point: MapPoint, distance: number) {
  const along = point.range - distance
  return `Came down ${Math.abs(point.drift).toFixed(0)} m ${point.drift < 0 ? 'left' : 'right'} of the marker and ${Math.abs(along).toFixed(0)} m ${along < 0 ? 'short' : 'long'}.`
}

/** Compress long flights while displaying and scrubbing actual simulation seconds. */
export function useLongPlayback(duration: number, flight: unknown = duration) {
  const end = clampFlightTime(Infinity, duration)
  const clock = usePlayback(end / 12, { startSlow: false, stride: 1 })
  const [previousFlight, setPreviousFlight] = useState(() => flight)
  const changed = !Object.is(previousFlight, flight)
  // Reset before committing the new view so the old clock cannot expose its landing.
  if (changed) {
    setPreviousFlight(() => flight)
    clock.seek(0)
    if (!reducedMotion) clock.play()
  }
  return {
    ...clock,
    t: changed ? 0 : clampFlightTime(clock.t * 12, end),
    // The scrubber moves in 0.05 s steps, so its last step can stop just short of the landing: snap it there.
    seek: (t: number) => clock.seek((t >= end - SCRUB_STEP ? end : clampFlightTime(t, end)) / 12),
  }
}
