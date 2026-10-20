import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { formatMeters } from '../config'
import { Car } from './Car'
import { FurniturePiece } from './Furniture'
import { Garage } from './Garage'
import { Ground } from './Ground'
import { WindowUnit } from './WindowUnit'

export function GarageCanvas({
  dimensions,
  wallMaterial,
  roofMaterial,
  doorMaterial,
  windows,
  furniture,
  door,
  car,
  selected,
  onSelect,
  onChangeWindow,
  onChangeFurniture,
  onChangeCar,
  onGestureEnd,
}) {
  const { width, length, height } = dimensions

  return (
    <div className="absolute inset-0">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [4.6, 3.5, 15], fov: 40, near: 0.1, far: 200 }}
        gl={{ antialias: true }}
        onPointerMissed={() => onSelect(null)}
      >
        <color attach="background" args={['#c9d6e4']} />
        <hemisphereLight args={['#e7eef6', '#b7ad9c', 0.55]} />
        <ambientLight intensity={0.28} />
        <directionalLight position={[2, 4, 12]} intensity={0.72} />
        <directionalLight
          position={[16, 24, 10]}
          intensity={1.65}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={1}
          shadow-camera-far={90}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
          shadow-bias={-0.00025}
          shadow-normalBias={0.04}
        />
        <FrameCamera width={width} length={length} height={height} />
        <Ground width={width} length={length} onClear={() => onSelect(null)} />
        <Garage
          width={width}
          length={length}
          height={height}
          wallMaterial={wallMaterial}
          roofMaterial={roofMaterial}
          doorMaterial={doorMaterial}
          windows={windows}
          door={door}
        />
        {windows.map((item) => (
          <WindowUnit
            key={item.id}
            item={item}
            dimensions={dimensions}
            selected={selected?.kind === 'window' && selected.id === item.id}
            onSelect={() => onSelect({ kind: 'window', id: item.id })}
            onChange={(patch) => onChangeWindow(item.id, patch)}
            onGestureEnd={onGestureEnd}
          />
        ))}
        {furniture.map((item) => (
          <FurniturePiece
            key={item.id}
            item={item}
            selected={selected?.kind === 'furniture' && selected.id === item.id}
            onSelect={() => onSelect({ kind: 'furniture', id: item.id })}
            onChange={(patch) => onChangeFurniture(item.id, patch)}
            onGestureEnd={onGestureEnd}
          />
        ))}
        {car && (
          <Car
            item={car}
            selected={selected?.kind === 'car'}
            onSelect={() => onSelect({ kind: 'car' })}
            onChange={onChangeCar}
            onGestureEnd={onGestureEnd}
          />
        )}
      </Canvas>
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-white/50 bg-white/80 px-3 py-2 text-sm text-stone-700 shadow-sm backdrop-blur-sm">
        <span className="font-medium text-stone-900">
          {formatMeters(width).replace(' m', '')} × {formatMeters(length).replace(' m', '')} × {formatMeters(height)}
        </span>
        <span className="mt-0.5 block text-xs text-stone-500">
          Prazan prostor rotira pogled. Predmet prevuci da ga pomeriš. Ctrl+Z vraća izmenu.
        </span>
      </div>
    </div>
  )
}

function FrameCamera({ width, length, height }) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls)
  const view = useRef({ phi: 1.42, theta: 0.3, moved: false })

  useLayoutEffect(() => {
    const target = new THREE.Vector3(0, Math.max(1.05, height * 0.42), 0)
    const distance = Math.hypot(width, length) * 1.15 + 4.4
    const { phi, theta } = view.current

    camera.position.copy(target).add(new THREE.Vector3().setFromSphericalCoords(distance, phi, theta))
    camera.updateProjectionMatrix()

    if (controls) {
      controls.target.copy(target)
      controls.update()
    } else {
      camera.lookAt(target)
    }
  }, [width, length, height, camera, controls])

  return (
    <OrbitControls
      makeDefault
      enableDamping
      maxPolarAngle={Math.PI / 2 - 0.04}
      minDistance={3}
      maxDistance={48}
      onEnd={(event) => {
        if (!view.current.moved) return
        const orbit = event.target
        const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(orbit.target))
        if (spherical.radius > 0.1) {
          view.current.phi = spherical.phi
          view.current.theta = spherical.theta
        }
      }}
      onStart={() => {
        view.current.moved = true
      }}
    />
  )
}
