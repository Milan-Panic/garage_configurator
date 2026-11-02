import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { Garage } from './Garage'
import { Ground } from './Ground'
import { PedestrianDoor } from './PedestrianDoor'
import { WindowModel } from './WindowUnit'
import { FLOOR_LEVEL } from '../config'
import { wallFrame } from '../layout'
import { frameColor } from '../materials'

export function GarageView({
  dimensions,
  wallMaterial,
  roofMaterial,
  doorMaterial,
  floorMaterial,
  windows = [],
  door,
  roof,
  gutters = true,
  pedestrianDoors = [],
  orbit = false,
  theta = 0.5,
  onShot,
  className = 'h-56 w-full',
  autoRotate = false,
  background = '#dbe4ec',
}) {
  const { width, length, height } = dimensions
  return (
    <div className={className}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [5, 3.4, 14], fov: 40, near: 0.1, far: 200 }}
        gl={{ antialias: true, preserveDrawingBuffer: Boolean(onShot) }}
      >
        <color attach="background" args={[background]} />
        <hemisphereLight args={['#e7eef6', '#b7ad9c', 0.55]} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[12, 18, 8]} intensity={1.4} />
        <Aim width={width} length={length} height={height} theta={theta} />
        <Ground width={width} length={length} />
        <Garage
          width={width}
          length={length}
          height={height}
          wallMaterial={wallMaterial}
          roofMaterial={roofMaterial}
          doorMaterial={doorMaterial}
          floorMaterial={floorMaterial}
          windows={windows}
          door={door}
          roof={roof}
          gutters={gutters}
          pedestrianDoors={pedestrianDoors}
        />
        {pedestrianDoors.map((item) => (
          <PedestrianDoor key={item.id} item={item} dimensions={dimensions} selected={false} onSelect={() => {}} onChange={() => {}} />
        ))}
        {windows.map((item) => (
          <StaticWindow key={item.id} item={item} dimensions={dimensions} />
        ))}
        {(orbit || autoRotate) && (
          <OrbitControls enablePan={false} enableZoom={false} enableRotate={orbit} autoRotate={autoRotate} autoRotateSpeed={0.6} maxPolarAngle={Math.PI / 2.05} makeDefault />
        )}
        {onShot && <Capture onShot={onShot} />}
      </Canvas>
    </div>
  )
}

function Aim({ width, length, height, theta }) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls)
  useLayoutEffect(() => {
    const target = new THREE.Vector3(0, Math.max(1.05, height * 0.42), 0)
    const distance = Math.hypot(width, length) * 1.15 + 4.4
    camera.position.copy(target).add(new THREE.Vector3().setFromSphericalCoords(distance, 1.15, theta))
    camera.updateProjectionMatrix()
    if (controls) {
      controls.target.copy(target)
      controls.update()
    } else {
      camera.lookAt(target)
    }
  }, [width, length, height, theta, camera, controls])
  return null
}

function Capture({ onShot }) {
  const { gl } = useThree()
  const frames = useRef(0)
  const sent = useRef(false)
  const shotRef = useRef(onShot)
  shotRef.current = onShot
  useLayoutEffect(() => {
    let live = true
    const tick = () => {
      if (!live || sent.current) return
      frames.current += 1
      if (frames.current < 3) {
        requestAnimationFrame(tick)
        return
      }
      sent.current = true
      shotRef.current(gl.domElement.toDataURL('image/jpeg', 0.62))
    }
    requestAnimationFrame(tick)
    return () => {
      live = false
    }
  }, [gl])
  return null
}

function StaticWindow({ item, dimensions }) {
  const wall = wallFrame(item.wall, dimensions)
  const basis = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(...wall.axis),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(...wall.normal),
  )
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(basis)
  const position = [
    wall.origin[0] + wall.axis[0] * item.along,
    FLOOR_LEVEL + item.sill + item.height / 2,
    wall.origin[2] + wall.axis[2] * item.along,
  ]
  return (
    <group position={position} quaternion={quaternion}>
      <WindowModel type={item.type} width={item.width} height={item.height} color={frameColor(item.frame)} bars={item.bars} />
    </group>
  )
}
