import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { roofGeometry } from '../roof'
import { SceneExtras, StaticWindow } from './Extras'
import { Garage } from './Garage'
import { Ground } from './Ground'
import { PedestrianDoor } from './PedestrianDoor'
import { Yard } from './Yard'

const noop = () => {}

// Neinteraktivan prikaz objekta: za početnu stranu, upite i slike u ponudi.
// `scene` dodaje struju, panele, prostorije i niz; `setting="yard"` crta dvorište.
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
  canopy = null,
  scene = null,
  setting = 'studio',
  hideRoof = false,
  interior = false,
  orbit = false,
  theta = 0.5,
  phi = 1.15,
  zoom = 1,
  onShot,
  className = 'h-56 w-full',
  autoRotate = false,
  background = '#dbe4ec',
}) {
  const { width, length, height } = dimensions
  const units = scene?.units || 1
  const offsetX = ((units - 1) * width) / 2
  const rise = roofGeometry(dimensions, roof).rise
  const yard = setting === 'yard'
  return (
    <div className={className}>
      <Canvas
        shadows
        dpr={onShot ? 2 : [1, 1.5]}
        camera={{ position: [5, 3.4, 14], fov: yard ? 34 : 40, near: 0.1, far: 400 }}
        gl={{ antialias: true, preserveDrawingBuffer: Boolean(onShot) }}
        onCreated={(state) => {
          state.gl.toneMapping = THREE.ACESFilmicToneMapping
          state.gl.toneMappingExposure = yard ? 0.95 : 1.05
        }}
      >
        {!yard && <color attach="background" args={[background]} />}
        <hemisphereLight args={yard ? ['#dcebff', '#8a9670', 0.75] : ['#e7eef6', '#b7ad9c', 0.55]} />
        <ambientLight intensity={yard ? 0.18 : 0.3} />
        <directionalLight
          position={[offsetX + 16, 22, 12]}
          intensity={yard ? 1.9 : 1.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={1}
          shadow-camera-far={90}
          shadow-camera-left={-34}
          shadow-camera-right={34}
          shadow-camera-top={34}
          shadow-camera-bottom={-34}
          shadow-bias={-0.00025}
          shadow-normalBias={0.04}
        />
        <Aim width={width * units} length={length} height={height + rise * 0.5} theta={theta} phi={phi} zoom={zoom} offsetX={offsetX} />
        {yard && <Yard width={width * units} length={length} offsetX={offsetX} doorWall={door?.style === 'none' ? 'front' : door?.wall} />}
        <group position={[offsetX, 0, 0]}>
          <Ground width={width * units} length={length} plain={yard} />
        </group>
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
          canopy={canopy}
          site={scene?.site}
          hideRoof={hideRoof}
        />
        {pedestrianDoors.map((item) => (
          <PedestrianDoor key={item.id} item={item} dimensions={dimensions} selected={false} onSelect={noop} onChange={noop} />
        ))}
        {windows.map((item) => (
          <StaticWindow key={item.id} item={item} dimensions={dimensions} />
        ))}
        <SceneExtras scene={scene} openTop={hideRoof} interior={interior} />
        {(orbit || autoRotate) && (
          <OrbitControls enablePan={false} enableZoom={false} enableRotate={orbit} autoRotate={autoRotate} autoRotateSpeed={0.6} maxPolarAngle={Math.PI / 2.05} makeDefault />
        )}
        {onShot && <Capture onShot={onShot} />}
      </Canvas>
    </div>
  )
}

function Aim({ width, length, height, theta, phi, zoom, offsetX }) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls)
  useLayoutEffect(() => {
    const target = new THREE.Vector3(offsetX, Math.max(1.05, height * 0.42), 0)
    const distance = (Math.hypot(width, length) * 1.15 + 4.4) / zoom
    camera.position.copy(target).add(new THREE.Vector3().setFromSphericalCoords(distance, phi, theta))
    camera.updateProjectionMatrix()
    if (controls) {
      controls.target.copy(target)
      controls.update()
    } else {
      camera.lookAt(target)
    }
  }, [width, length, height, theta, phi, zoom, offsetX, camera, controls])
  return null
}

function Capture({ onShot }) {
  const { gl } = useThree()
  const shotRef = useRef(onShot)
  useEffect(() => {
    shotRef.current = onShot
  })
  useLayoutEffect(() => {
    let live = true
    let frames = 0
    const tick = () => {
      if (!live) return
      frames += 1
      if (frames < 4) {
        requestAnimationFrame(tick)
        return
      }
      shotRef.current(gl.domElement.toDataURL('image/jpeg', 0.82))
    }
    requestAnimationFrame(tick)
    return () => {
      live = false
    }
  }, [gl])
  return null
}
