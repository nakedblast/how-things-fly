import { useEffect, useState } from 'react'

export const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export interface Playback {
  t: number
  playing: boolean
  slow: boolean
  play(): void
  pause(): void
  replay(): void
  seek(t: number): void
  setSlow(slow: boolean): void
}

/**
 * A simulation clock from 0 to `duration` seconds with pause, slow motion and scrubbing.
 * Under reduced motion it never starts by itself, and playing advances in whole steps of `stride`.
 */
export function usePlayback(
  duration: number,
  { autoplay = true, stride = 0.5, slowRate = 0.25, startSlow = true } = {},
): Playback {
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(autoplay && !reducedMotion)
  const [slow, setSlow] = useState(startSlow)

  useEffect(() => {
    if (!playing) return
    if (reducedMotion) {
      const id = window.setInterval(() => setT((prev) => Math.min(duration, prev + stride)), 700)
      return () => window.clearInterval(id)
    }
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1) * (slow ? slowRate : 1)
      last = now
      setT((prev) => Math.min(duration, prev + dt))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, slow, duration, stride, slowRate])

  // Stop at the end of the flight.
  const ended = t >= duration
  if (ended && playing) setPlaying(false)

  return {
    t,
    playing,
    slow,
    play: () => {
      setT((prev) => (prev >= duration ? 0 : prev))
      setPlaying(true)
    },
    pause: () => setPlaying(false),
    replay: () => {
      setT(0)
      setPlaying(true)
    },
    seek: (v) => {
      setPlaying(false)
      setT(Math.min(Math.max(v, 0), duration))
    },
    setSlow,
  }
}
