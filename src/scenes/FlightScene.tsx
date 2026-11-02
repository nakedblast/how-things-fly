import { useMemo, useRef, type ComponentRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { Vector3, type Mesh } from 'three'
import {
  vacuumFlightTime,
  vacuumPositionAt,
  vacuumTrajectory,
  type LaunchParams,
} from '../physics/trajectory'
import { FLAGS, RANGE_LENGTH, TRAIL_STEPS, WALL } from './rangeLayout'

type Props = { launch: LaunchParams; shot: number; reducedMotion: boolean }

const PAUSE_AFTER_LANDING = 1.2 // s, then the shot replays

// Draws the physics module's output; owns no physics itself.
export default function FlightScene({ launch, shot, reducedMotion }: Props) {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [-10, 6, 22], fov: 50, far: 600 }}>
      <color attach="background" args={['#cfe3ee']} />
      <fog attach="fog" args={['#cfe3ee', 80, 260]} />
      <hemisphereLight args={['#ffffff', '#8a7f62', 0.8]} />
      <directionalLight
        position={[40, 60, 30]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={150}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      <Environment />
      <Flight key={shot} launch={launch} reducedMotion={reducedMotion} />
    </Canvas>
  )
}

function Flight({ launch, reducedMotion }: { launch: LaunchParams; reducedMotion: boolean }) {
  const ball = useRef<Mesh>(null)
  const trail = useRef<ComponentRef<typeof Line>>(null)
  const clock = useRef(0)
  const lookAt = useRef(new Vector3())
  const desired = useMemo(() => new Vector3(), [])

  const flightTime = vacuumFlightTime(launch)
  const points = useMemo(
    () => vacuumTrajectory(launch, TRAIL_STEPS).map((s) => [s.pos.x, s.pos.y, 0] as [number, number, number]),
    [launch],
  )

  useFrame(({ camera }, dt) => {
    clock.current += Math.min(dt, 0.1)
    if (clock.current > flightTime + PAUSE_AFTER_LANDING) clock.current = 0
    const pos = vacuumPositionAt(launch, clock.current)

    ball.current?.position.set(pos.x, pos.y + 0.3, 0)
    const segments = Math.ceil((Math.min(clock.current, flightTime) / flightTime) * TRAIL_STEPS)
    if (trail.current) trail.current.geometry.instanceCount = segments

    if (reducedMotion) {
      camera.position.set(RANGE_LENGTH / 2, 30, 110)
      camera.lookAt(RANGE_LENGTH / 2, 8, 0)
      return
    }
    const k = 1 - Math.exp(-dt * 3)
    desired.set(pos.x - 14, pos.y + 5, 20)
    camera.position.lerp(desired, k)
    lookAt.current.lerp(desired.set(pos.x + 4, pos.y, 0), k)
    camera.lookAt(lookAt.current)
  })

  return (
    <>
      <Line ref={trail} points={points} color="#e8a33d" lineWidth={3} />
      <mesh ref={ball} castShadow>
        <sphereGeometry args={[0.3, 24, 16]} />
        <meshStandardMaterial color="#2a2420" metalness={0.3} roughness={0.5} />
      </mesh>
    </>
  )
}

function Environment() {
  const markers = useMemo(() => Array.from({ length: RANGE_LENGTH / 10 + 1 }, (_, i) => i * 10), [])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[RANGE_LENGTH / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[RANGE_LENGTH + 200, 200]} />
        <meshStandardMaterial color="#9fb37a" />
      </mesh>
      {markers.map((x) => (
        <mesh key={x} position={[x, 0.01, 0]} rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[0.15, 6]} />
          <meshStandardMaterial color="#f4ecdc" />
        </mesh>
      ))}
      <mesh position={[WALL.x, WALL.height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL.thickness, WALL.height, WALL.width]} />
        <meshStandardMaterial color="#a0522d" roughness={0.9} />
      </mesh>
      {FLAGS.map((f) => (
        <Flag key={f.x} x={f.x} color={f.color} />
      ))}
    </group>
  )
}

function Flag({ x, color }: { x: number; color: string }) {
  return (
    <group position={[x, 0, -1.5]}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 3, 8]} />
        <meshStandardMaterial color="#f4ecdc" />
      </mesh>
      <mesh position={[0.5, 2.6, 0]} castShadow>
        <planeGeometry args={[1, 0.7]} />
        <meshStandardMaterial color={color} side={2} />
      </mesh>
    </group>
  )
}
