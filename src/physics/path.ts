// A flight reduced to what a view needs to draw and animate it, whichever model produced it.

import type { DartFlight } from './dart'
import { flightPositionAt, simulateFlight, type FlightParams } from './flight'
import type { Flight3D } from './flight3d'
import {
  vacuumApexHeight,
  vacuumFlightTime,
  vacuumPositionAt,
  vacuumRange,
  type LaunchParams,
  type Sample,
  type Vec2,
} from './trajectory'

export interface FlightPath {
  /** Launch to landing, evenly spaced in time, for drawing the trail. */
  samples: Sample[]
  flightTime: number // s
  range: number // m
  apexHeight: number // m
  /** Signed landing drift in the source model's lateral axis; positive is right. */
  lateralDrift?: number
  /** Position at time t, clamped to [0, flightTime]. */
  positionAt(t: number): Vec2
  /** Body angle above the horizontal at time t, radians, for projectiles that point somewhere. */
  pitchAt?(t: number): number
}

export const DEFAULT_PATH_STEPS = 240 // enough for a smooth trail at any sandbox range

function evenSamples(flightTime: number, positionAt: (t: number) => Vec2, steps: number): Sample[] {
  const samples: Sample[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (flightTime * i) / steps
    samples.push({ t, pos: positionAt(t) })
  }
  return samples
}

export function vacuumPath(launch: LaunchParams, steps = DEFAULT_PATH_STEPS): FlightPath {
  const flightTime = vacuumFlightTime(launch)
  const positionAt = (t: number) => vacuumPositionAt(launch, t)
  return {
    samples: evenSamples(flightTime, positionAt, steps),
    flightTime,
    range: vacuumRange(launch),
    apexHeight: vacuumApexHeight(launch),
    positionAt,
  }
}

/** A rigid-body dart flight, with its pitch, for drawing an oriented dart. */
export function dartPath(flight: DartFlight, steps = DEFAULT_PATH_STEPS): FlightPath {
  const s = flight.samples
  // Samples come at a fixed time step (the last one at landing), so find by bisection.
  const at = (t: number) => {
    const c = Math.min(Math.max(t, 0), flight.flightTime)
    let lo = 0
    let hi = s.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (s[mid].t <= c) lo = mid
      else hi = mid
    }
    const u = s[hi].t > s[lo].t ? (c - s[lo].t) / (s[hi].t - s[lo].t) : 0
    return { a: s[lo], b: s[hi], u }
  }
  const positionAt = (t: number) => {
    const { a, b, u } = at(t)
    return { x: a.pos.x + (b.pos.x - a.pos.x) * u, y: a.pos.y + (b.pos.y - a.pos.y) * u }
  }
  const pitchAt = (t: number) => {
    const { a, b, u } = at(t)
    return a.pitch + (b.pitch - a.pitch) * u
  }
  let apexHeight = 0
  for (const p of s) apexHeight = Math.max(apexHeight, p.pos.y)
  return {
    samples: evenSamples(flight.flightTime, positionAt, steps),
    flightTime: flight.flightTime,
    range: flight.range,
    apexHeight,
    positionAt,
    pitchAt,
  }
}

export function dragPath(params: FlightParams, steps = DEFAULT_PATH_STEPS): FlightPath {
  const flight = simulateFlight(params)
  const positionAt = (t: number) => flightPositionAt(flight, t)
  return {
    samples: evenSamples(flight.flightTime, positionAt, steps),
    flightTime: flight.flightTime,
    range: flight.range,
    apexHeight: flight.apex.pos.y,
    positionAt,
  }
}

/** Projects a flat-earth 3D flight onto the existing side-view axes and keeps its cross-range drift. */
export function flight3dPath(flight: Flight3D, steps = DEFAULT_PATH_STEPS): FlightPath {
  const source = flight.samples
  const positionAt = (t: number): Vec2 => {
    const c = Math.min(Math.max(t, 0), flight.flightTime)
    let lo = 0
    let hi = source.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (source[mid].t <= c) lo = mid
      else hi = mid
    }
    const a = source[lo]
    const b = source[hi]
    const u = b.t > a.t ? (c - a.t) / (b.t - a.t) : 0
    return { x: a.pos.x + (b.pos.x - a.pos.x) * u, y: a.pos.y + (b.pos.y - a.pos.y) * u }
  }
  return {
    samples: evenSamples(flight.flightTime, positionAt, steps),
    flightTime: flight.flightTime,
    range: flight.range,
    apexHeight: flight.apex.pos.y,
    lateralDrift: flight.drift,
    positionAt,
  }
}
