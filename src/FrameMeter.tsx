import { useEffect, useState } from 'react'

type Stats = { fps: number; worstMs: number }

// Frame-rate readout over one-second windows, independent of the renderer.
export function FrameMeter() {
  const [stats, setStats] = useState<Stats>({ fps: 0, worstMs: 0 })

  useEffect(() => {
    let raf = 0
    let windowStart = performance.now()
    let last = windowStart
    let frames = 0
    let worst = 0
    const tick = (now: number) => {
      frames++
      worst = Math.max(worst, now - last)
      last = now
      if (now - windowStart >= 1000) {
        setStats({ fps: Math.round((frames * 1000) / (now - windowStart)), worstMs: Math.round(worst) })
        windowStart = now
        frames = 0
        worst = 0
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <p className="meter" data-fps={stats.fps} data-worst-ms={stats.worstMs}>
      {stats.fps} fps · worst frame {stats.worstMs} ms
    </p>
  )
}
