import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Box, Camera, Eye, Maximize2, ScanEye } from 'lucide-react'
import { formatMeters } from '../config'
import { roofGeometry } from '../roof'
import { Car } from './Car'
import { FurniturePiece } from './Furniture'
import { Garage } from './Garage'
import { Ground } from './Ground'
import { PedestrianDoor } from './PedestrianDoor'
import { WindowUnit } from './WindowUnit'

const VIEWS = [
  { id: 'corner', label: 'Ugao', phi: 1.2, theta: 0.62 },
  { id: 'front', label: 'Napred', phi: 1.42, theta: 0 },
  { id: 'side', label: 'Bok', phi: 1.42, theta: Math.PI / 2 },
  { id: 'back', label: 'Pozadi', phi: 1.3, theta: Math.PI + 0.5 },
  { id: 'top', label: 'Odozgo', phi: 0.06, theta: 0 },
]

export function GarageCanvas({
  dimensions,
  wallMaterial,
  roofMaterial,
  doorMaterial,
  floorMaterial,
  windows,
  furniture,
  door,
  roof,
  gutters = true,
  pedestrianDoors = [],
  canopy,
  car,
  selected,
  projectName,
  onSelect,
  onChangeWindow,
  onChangePedestrian,
  onChangeFurniture,
  onChangeCar,
  onGestureEnd,
}) {
  const { width, length, height } = dimensions
  const rise = roofGeometry(dimensions, roof).rise
  const [xray, setXray] = useState(false)
  const [view, setView] = useState({ ...VIEWS[0], nonce: 0 })
  const three = useRef(null)
  const roofLabel =
    roof.kind === 'mono' ? `Jedna voda ${roof.pitch}°` : roof.kind === 'duo' ? `Dve vode ${roof.pitch}°` : 'Ravan krov'

  function snapshot() {
    const state = three.current
    if (!state) return
    state.gl.render(state.scene, state.camera)
    const link = document.createElement('a')
    link.download = `${(projectName || 'objekat').replace(/[^\p{L}\p{N}-]+/gu, '-').toLowerCase()}.png`
    link.href = state.gl.domElement.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="absolute inset-0">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [4.6, 3.5, 15], fov: 40, near: 0.1, far: 200 }}
        gl={{ antialias: true }}
        onCreated={(state) => {
          three.current = state
          state.gl.toneMapping = THREE.ACESFilmicToneMapping
          state.gl.toneMappingExposure = 1.05
        }}
        onPointerMissed={() => onSelect(null)}
      >
        <color attach="background" args={['#dbe4ec']} />
        <fog attach="fog" args={['#dbe4ec', 34, 90]} />
        <hemisphereLight args={['#eef3f8', '#9a9c84', 0.65]} />
        <ambientLight intensity={0.22} />
        <directionalLight position={[2, 4, 12]} intensity={0.6} />
        <directionalLight
          position={[16, 24, 10]}
          intensity={1.75}
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
        <FrameCamera width={width} length={length} height={height + rise} view={view} />
        <Ground width={width} length={length} onClear={() => onSelect(null)} />
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
          xray={xray}
        />
        {pedestrianDoors.map((item) => (
          <PedestrianDoor
            key={item.id}
            item={item}
            dimensions={dimensions}
            selected={selected?.kind === 'pedestrian' && selected.id === item.id}
            onSelect={() => onSelect({ kind: 'pedestrian', id: item.id })}
            onChange={(patch) => onChangePedestrian(item.id, patch)}
            onGestureEnd={onGestureEnd}
          />
        ))}
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

      <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-white/60 bg-white/85 p-1 shadow-sm backdrop-blur">
          <Eye size={14} className="mx-1.5 text-stone-500" aria-hidden="true" />
          {VIEWS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setView((current) => ({ ...entry, nonce: current.nonce + 1 }))}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                view.id === entry.id ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-white/60 bg-white/85 p-1 shadow-sm backdrop-blur">
          <button
            type="button"
            aria-pressed={xray}
            onClick={() => setXray((value) => !value)}
            title="Providni zidovi i čelični skelet iz računice"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
              xray ? 'bg-orange-500 text-white' : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            <ScanEye size={14} />
            Konstrukcija
          </button>
          <button
            type="button"
            onClick={snapshot}
            title="Sačuvaj sliku ovog pogleda"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-100"
          >
            <Camera size={14} />
            Slika
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-3 rounded-xl border border-white/60 bg-white/85 px-3 py-2 text-sm text-stone-700 shadow-sm backdrop-blur">
        <Maximize2 size={16} className="text-stone-400" aria-hidden="true" />
        <span>
          <span className="block font-semibold text-stone-900 tabular-nums">
            {formatMeters(width).replace(' m', '')} × {formatMeters(length).replace(' m', '')} × {formatMeters(height)}
          </span>
          <span className="block text-xs text-stone-500">
            {roofLabel} · {(width * length).toFixed(1).replace('.', ',')} m²
          </span>
        </span>
      </div>
      <div className="pointer-events-none absolute right-3 bottom-3 hidden items-center gap-2 rounded-xl border border-white/60 bg-white/85 px-3 py-2 text-xs text-stone-500 shadow-sm backdrop-blur lg:flex">
        <Box size={14} aria-hidden="true" />
        Prevuci prazno da rotiraš · predmet da ga pomeriš · Del briše · Ctrl+Z vraća
      </div>
    </div>
  )
}

function FrameCamera({ width, length, height, view }) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls)
  const current = useRef({ phi: view.phi, theta: view.theta })
  const nonce = useRef(view.nonce)

  useLayoutEffect(() => {
    if (nonce.current !== view.nonce) {
      nonce.current = view.nonce
      current.current = { phi: view.phi, theta: view.theta }
    }
    const target = new THREE.Vector3(0, Math.max(1.05, height * 0.42), 0)
    const distance = Math.hypot(width, length) * 1.15 + 4.4
    const { phi, theta } = current.current

    camera.position.copy(target).add(new THREE.Vector3().setFromSphericalCoords(distance, phi, theta))
    camera.updateProjectionMatrix()

    if (controls) {
      controls.target.copy(target)
      controls.update()
    } else {
      camera.lookAt(target)
    }
  }, [width, length, height, camera, controls, view])

  return (
    <OrbitControls
      makeDefault
      enableDamping
      maxPolarAngle={Math.PI / 2 - 0.04}
      minDistance={3}
      maxDistance={48}
      onEnd={(event) => {
        const orbit = event.target
        const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(orbit.target))
        if (spherical.radius > 0.1) current.current = { phi: spherical.phi, theta: spherical.theta }
      }}
    />
  )
}
