// 3D view of one dart flight. It draws precomputed samples at the time it is given; the lesson's
// playback clock drives it, so the 2D and 3D views always show the same moment.

import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { DoubleSide, Shape, Vector3, type Group } from 'three'
import type { DartShot, Part, Projectile, Tone } from './scenario'

const COLOURS: Record<Tone, string> = {
  body: '#d8cbb0',
  weight: '#b8862b',
  point: '#6d6d6d',
  camera: '#2a2420',
  cork: '#e9dcc0',
  nock: '#b03a2e',
}
const FIN_COLOUR = '#b03a2e'

export default function DartScene({ shot, t, reducedMotion }: { shot: DartShot; t: number; reducedMotion: boolean }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [-2, 2, 4], fov: 45, far: 500 }} className="dart-scene">
      <color attach="background" args={['#cfe3ee']} />
      <fog attach="fog" args={['#cfe3ee', 30, 120]} />
      <hemisphereLight args={['#ffffff', '#8a7f62', 1]} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} />
      <mesh rotation-x={-Math.PI / 2} position={[40, 0, 0]}>
        <planeGeometry args={[300, 120]} />
        <meshStandardMaterial color="#9fb37a" />
      </mesh>
      {Array.from({ length: 13 }, (_, i) => (
        <mesh key={i} position={[i * 10, 0.01, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.08, 4]} />
          <meshStandardMaterial color="#f4ecdc" />
        </mesh>
      ))}
      <Flight shot={shot} t={t} reducedMotion={reducedMotion} />
    </Canvas>
  )
}

function Flight({ shot, t, reducedMotion }: { shot: DartShot; t: number; reducedMotion: boolean }) {
  const dart = useRef<Group>(null)
  const look = useRef(new Vector3())
  const want = useMemo(() => new Vector3(), [])
  const now = shot.sampleAt(t)
  const trail = shot.flight.samples
    .filter((s, i) => i % 10 === 0 && s.t <= t)
    .map((s) => [s.pos.x, s.pos.y, 0] as [number, number, number])
    .concat([[now.pos.x, now.pos.y, 0]])

  useFrame(({ camera }, dt) => {
    dart.current?.position.set(now.pos.x, now.pos.y, 0)
    dart.current?.rotation.set(0, 0, now.pitch)
    want.set(now.pos.x - 1.6, now.pos.y + 0.7, 3.2)
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 6)
    camera.position.lerp(want, k)
    look.current.lerp(want.set(now.pos.x + 0.3, now.pos.y, 0), k)
    camera.lookAt(look.current)
  })

  return (
    <>
      {trail.length > 1 && <Line points={trail} color="#e8a33d" lineWidth={2} />}
      <group ref={dart}>
        <Model projectile={shot.projectile} />
      </group>
    </>
  )
}

/** The projectile's parts as meshes, balance point at the origin and nose towards +x. */
export function Model({ projectile }: { projectile: Projectile }) {
  const { shape, dart } = projectile
  const X = (b: number) => dart.xcg - b
  return (
    <group>
      {shape.parts.map((p: Part, i) => {
        switch (p.kind) {
          case 'cone':
            return (
              <mesh key={i} position={[X((p.from + p.to) / 2), 0, 0]} rotation-z={-Math.PI / 2}>
                <coneGeometry args={[p.r, p.to - p.from, 20]} />
                <meshStandardMaterial color={COLOURS[p.tone ?? 'body']} />
              </mesh>
            )
          case 'tube':
            return (
              <mesh key={i} position={[X((p.from + p.to) / 2), 0, 0]} rotation-z={-Math.PI / 2}>
                <cylinderGeometry args={[p.r, p.r, p.to - p.from, 20]} />
                <meshStandardMaterial color={COLOURS[p.tone ?? 'body']} metalness={p.tone === 'weight' ? 0.6 : 0} roughness={0.5} />
              </mesh>
            )
          case 'skirt':
            return (
              <mesh key={i} position={[X((p.from + p.to) / 2), 0, 0]} rotation-z={-Math.PI / 2}>
                <cylinderGeometry args={[p.r0, p.r1, p.to - p.from, 24, 1, true]} />
                <meshStandardMaterial color="#fbf8f0" side={DoubleSide} />
              </mesh>
            )
          case 'fins':
            return <Fins key={i} part={p} X={X} />
        }
      })}
    </group>
  )
}

function Fins({ part, X }: { part: Extract<Part, { kind: 'fins' }>; X: (b: number) => number }) {
  const shape = useMemo(() => {
    const s = new Shape()
    s.moveTo(X(part.le), part.r)
    s.lineTo(X(part.le + part.sweep), part.r + part.span)
    s.lineTo(X(part.le + part.sweep + part.tip), part.r + part.span)
    s.lineTo(X(part.le + part.root), part.r)
    s.closePath()
    return s
  }, [part, X])
  const count = part.feathers ? 3 : 4
  return (
    <>
      {Array.from({ length: count }, (_, k) => (
        <mesh key={k} rotation-x={(k * 2 * Math.PI) / count}>
          <shapeGeometry args={[shape]} />
          <meshStandardMaterial color={part.feathers ? '#fbf8f0' : FIN_COLOUR} side={DoubleSide} />
        </mesh>
      ))}
    </>
  )
}
