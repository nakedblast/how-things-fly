import { useMemo, useRef, type ComponentRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { Vector3, type Group, type Mesh } from 'three'
import type { FlightPath } from '../physics/path'
import { frameFor } from './frame'
import { FLAGS, RANGE_LENGTH, WALL } from './rangeLayout'

type Props = { path: FlightPath; ghost?: FlightPath; shot: number; reducedMotion: boolean }

const PAUSE_AFTER_LANDING = 1.2 // s, then the shot replays
const FOV = 50 // degrees, vertical

// Draws a precomputed flight path; owns no physics itself.
export default function FlightScene({ path, ghost, shot, reducedMotion }: Props) {
  const frame = frameFor([...path.samples, ...(ghost?.samples ?? [])].map((s) => s.pos))
  // With reduced motion the camera holds a wide view of the whole shot, so the fog moves out with it.
  const overview = overviewCamera(frame)
  const fogFar = reducedMotion ? overview.distance * 3 : 260
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [-10, 6, 22], fov: FOV, far: 4000 }}>
      <color attach="background" args={['#cfe3ee']} />
      <fog attach="fog" args={['#cfe3ee', fogFar * 0.3, fogFar]} />
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
      <Environment length={Math.max(RANGE_LENGTH, frame.x1)} />
      <Flight key={shot} path={path} ghost={ghost} reducedMotion={reducedMotion} overview={overview} />
    </Canvas>
  )
}

type Overview = { center: Vector3; distance: number }

// A fixed side-on camera that fits the whole shot, for reduced motion.
function overviewCamera(frame: { x0: number; x1: number; top: number }): Overview {
  const center = new Vector3((frame.x0 + frame.x1) / 2, frame.top / 2, 0)
  const halfHeight = Math.max(frame.top / 2 + 4, (frame.x1 - frame.x0) / 2 / (16 / 9))
  return { center, distance: halfHeight / Math.tan((FOV * Math.PI) / 360) }
}

function Flight({
  path,
  ghost,
  reducedMotion,
  overview,
}: Omit<Props, 'shot'> & { overview: Overview }) {
  const ball = useRef<Mesh>(null)
  const dart = useRef<Group>(null)
  const trail = useRef<ComponentRef<typeof Line>>(null)
  const clock = useRef(0)
  const lookAt = useRef(new Vector3())
  const desired = useMemo(() => new Vector3(), [])

  const { flightTime } = path
  const points = useMemo(
    () => path.samples.map((s) => [s.pos.x, s.pos.y, 0] as [number, number, number]),
    [path],
  )
  const ghostPoints = useMemo(
    () => ghost?.samples.map((s) => [s.pos.x, s.pos.y, 0] as [number, number, number]),
    [ghost],
  )

  useFrame(({ camera }, dt) => {
    // Reduced motion: hold the finished shot, as the 2D view does.
    if (reducedMotion) clock.current = flightTime
    else clock.current += Math.min(dt, 0.1)
    if (clock.current > flightTime + PAUSE_AFTER_LANDING) clock.current = 0
    const pos = path.positionAt(clock.current)

    ball.current?.position.set(pos.x, pos.y + 0.3, 0)
    if (path.pitchAt) {
      dart.current?.position.set(pos.x, pos.y + 0.3, 0)
      dart.current?.rotation.set(0, 0, path.pitchAt(Math.min(clock.current, flightTime)))
    }
    const segments = Math.ceil((Math.min(clock.current, flightTime) / flightTime) * (points.length - 1))
    if (trail.current) trail.current.geometry.instanceCount = segments

    if (reducedMotion) {
      camera.position.set(overview.center.x, overview.center.y, overview.distance)
      camera.lookAt(overview.center)
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
      {ghostPoints && (
        <Line points={ghostPoints} color="#594f45" lineWidth={2} dashed dashSize={2} gapSize={1} />
      )}
      <Line ref={trail} points={points} color="#e8a33d" lineWidth={3} />
      {path.pitchAt ? (
        // Drawn three times life size, like the ball, so its direction reads from the chase camera.
        <group ref={dart} scale={3}>
          <mesh rotation-z={-Math.PI / 2} castShadow>
            <cylinderGeometry args={[0.0125, 0.0125, 0.54, 16]} />
            <meshStandardMaterial color="#b8862b" metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0.3, 0, 0]} rotation-z={-Math.PI / 2} castShadow>
            <coneGeometry args={[0.0125, 0.06, 16]} />
            <meshStandardMaterial color="#b8862b" metalness={0.4} roughness={0.5} />
          </mesh>
          {[0, Math.PI / 2].map((r) => (
            <mesh key={r} position={[-0.245, 0, 0]} rotation-x={r} castShadow>
              <boxGeometry args={[0.05, 0.075, 0.003]} />
              <meshStandardMaterial color="#a8322a" />
            </mesh>
          ))}
        </group>
      ) : (
        <mesh ref={ball} castShadow>
          <sphereGeometry args={[0.3, 24, 16]} />
          <meshStandardMaterial color="#2a2420" metalness={0.3} roughness={0.5} />
        </mesh>
      )}
    </>
  )
}

function Environment({ length }: { length: number }) {
  const markers = useMemo(() => Array.from({ length: RANGE_LENGTH / 10 + 1 }, (_, i) => i * 10), [])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[length / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[length + 200, 200]} />
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
