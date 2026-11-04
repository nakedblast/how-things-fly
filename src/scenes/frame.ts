// Picks the part of the range a 2D side view shows: the shot and what matters around it,
// rather than the whole range, so a portrait phone still shows the arc at a readable size.

export interface Frame {
  /** Left and right edges, metres downrange. */
  x0: number
  x1: number
  /** Top edge, metres above the ground; the bottom edge is a little below the ground. */
  top: number
}

export interface FrameOptions {
  /** Metres of ground shown behind the launch point. */
  behind?: number
  /** Narrowest frame, metres, so short shots are not blown up to fill the screen. */
  minWidth?: number
  /** Width is rounded up to this step, so small changes in the shot do not make the view jump. */
  step?: number
  /** Lowest ratio of height to width, so a flat shot still leaves room above it. */
  minAspect?: number
}

/** Frames points given in metres (x downrange, y up) with some margin. */
export function frameFor(points: readonly { x: number; y: number }[], options: FrameOptions = {}): Frame {
  const { behind = 5, minWidth = 30, step = 10, minAspect = 0.25 } = options
  let maxX = 0
  let maxY = 0
  for (const p of points) {
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  const x0 = -behind
  const width = Math.ceil(Math.max(maxX * 1.08 + 3 - x0, minWidth) / step) * step
  const top = Math.max(maxY * 1.15 + 1, width * minAspect)
  return { x0, x1: x0 + width, top }
}

/** A tick spacing that gives roughly 4–9 labelled distance marks across the frame, so labels never touch. */
export function tickStep(width: number): number {
  for (const s of [5, 10, 20, 25, 50, 100, 200]) if (width / s <= 9) return s
  return 500
}

/** A size in metres that looks about the same on screen whatever the frame: `size(frame, 1)` is 1% of the width. */
export function size(frame: Frame, percent: number): number {
  return ((frame.x1 - frame.x0) * percent) / 100
}
