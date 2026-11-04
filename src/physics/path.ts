// A flight reduced to what a view needs to draw and animate it, whichever model produced it.

import { flightPositionAt, simulateFlight, type FlightParams } from './flight'
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
  /** Position at time t, clamped to [0, flightTime]. */
  positionAt(t: number): Vec2
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
