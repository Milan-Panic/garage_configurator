import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Box, Camera, Eye, ImagePlus, Maximize2, ScanEye, SquareDashed, Trees, X } from 'lucide-react'
import { formatMeters } from '../config'
import { roofGeometry } from '../roof'
import { Car } from './Car'
import { findCollisions } from '../collide'
import { SceneExtras } from './Extras'
import { FurniturePiece } from './Furniture'
import { Garage } from './Garage'
import { Ground } from './Ground'
import { PedestrianDoor } from './PedestrianDoor'
import { Yard } from './Yard'
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
  scene,
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
  const [openTop, setOpenTop] = useState(false)
  const [yard, setYard] = useState(false)
  // Kupčeva fotografija placa kao pozadina. Ostaje samo u ovom pregledaču.
  const [photo, setPhoto] = useState(null)
  useEffect(() => () => photo && URL.revokeObjectURL(photo), [photo])
  const units = scene?.units || 1
  const offsetX = ((units - 1) * width) / 2
  const clashes = useMemo(() => (scene ? findCollisions(scene) : new Set()), [scene])
  // Dizalica ispod auta prati visinu na koju je auto podignut.
  const liftUnderCar = car
    ? furniture.find((item) => (item.type === 'lift2' || item.type === 'lift4') && Math.abs(item.x - car.x) < 0.7 && Math.abs(item.z - car.z) < 1.2)
    : null
  const carBase = car ? (liftUnderCar?.type === 'lift4' ? Math.max(0.14, car.elevation || 0) : car.elevation || 0) : 0
  const [view, setView] = useState({ ...VIEWS[0], nonce: 0 })
  const three = useRef(null)
  const roofLabel =
    roof.kind === 'mono' ? `Jedna voda ${roof.pitch}°` : roof.kind === 'duo' ? `Dve vode ${roof.pitch}°` : 'Ravan krov'

  function snapshot() {
    const state = three.current
    if (!state) return
    state.gl.render(state.scene, state.camera)
    const source = state.gl.domElement
    const name = `${(projectName || 'objekat').replace(/[^\p{L}\p{N}-]+/gu, '-').toLowerCase()}.png`
    const save = (href) => {
      const link = document.createElement('a')
      link.download = name
      link.href = href
      link.click()
    }
    if (!photo) {
      save(source.toDataURL('image/png'))
      return
    }
    // Sa fotografijom u pozadini slika se slaže iz dva sloja, kao na ekranu.
    const image = new Image()
    image.onload = () => {
      const sheet = document.createElement('canvas')
      sheet.width = source.width
      sheet.height = source.height
      const context = sheet.getContext('2d')
      const scale = Math.max(sheet.width / image.width, sheet.height / image.height)
      const drawWidth = image.width * scale
      const drawHeight = image.height * scale
      context.drawImage(image, (sheet.width - drawWidth) / 2, (sheet.height - drawHeight) / 2, drawWidth, drawHeight)
      state.gl.render(state.scene, state.camera)
      context.drawImage(source, 0, 0)
      save(sheet.toDataURL('image/png'))
    }
    image.src = photo
  }

  return (
    <div className="absolute inset-0 bg-cover bg-center" style={photo ? { backgroundImage: `url(${photo})` } : undefined}>
      <Canvas
        shadows
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: [4.6, 3.5, 15], fov: 40, near: 0.1, far: 400 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={(state) => {
          three.current = state
          state.gl.toneMapping = THREE.ACESFilmicToneMapping
          state.gl.toneMappingExposure = 1.05
        }}
        onPointerMissed={() => onSelect(null)}
      >
        {!photo && !yard && <color attach="background" args={['#dbe4ec']} />}
        {!photo && !yard && <fog attach="fog" args={['#dbe4ec', 34, 90]} />}
        {!photo && yard && <Yard width={width * units} length={length} offsetX={offsetX} doorWall={door?.style === 'none' ? 'front' : door?.wall} />}
        <hemisphereLight args={['#eef3f8', '#9a9c84', 0.65]} />
        <ambientLight intensity={0.22} />
        <directionalLight position={[2, 4, 12]} intensity={0.6} />
        <directionalLight
          position={[offsetX + 16, 24, 10]}
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
        <FrameCamera width={width * units} length={length} height={height + rise} view={view} offsetX={offsetX} />
        <group position={[offsetX, 0, 0]}>
          <Ground width={width * units} length={length} plain={yard || Boolean(photo)} onClear={() => onSelect(null)} />
          {photo && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
              <planeGeometry args={[80, 80]} />
              <shadowMaterial opacity={0.32} />
            </mesh>
          )}
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
          xray={xray}
          hideRoof={openTop}
        />
        <SceneExtras
          scene={scene}
          openTop={openTop}
          xray={xray}
          selectedRoomId={selected?.kind === 'room' ? selected.id : null}
          onSelectRoom={(id) => onSelect({ kind: 'room', id })}
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
            clash={clashes.has(item.id)}
            raise={liftUnderCar?.id === item.id ? carBase : 0}
            onSelect={() => onSelect({ kind: 'furniture', id: item.id })}
            onChange={(patch) => onChangeFurniture(item.id, patch)}
            onGestureEnd={onGestureEnd}
          />
        ))}
        {car && (
          <Car
            item={car}
            selected={selected?.kind === 'car'}
            clash={clashes.has('car')}
            base={carBase}
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
            aria-pressed={openTop}
            onClick={() => setOpenTop((value) => !value)}
            title="Skini krov da vidiš raspored unutra"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
              openTop ? 'bg-orange-500 text-white' : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            <SquareDashed size={14} />
            Bez krova
          </button>
          <button
            type="button"
            aria-pressed={yard && !photo}
            onClick={() => {
              setPhoto(null)
              setYard((value) => !value || Boolean(photo))
            }}
            title="Prikaži objekat u dvorištu, sa nebom, drvećem i čovekom za razmeru"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
              yard && !photo ? 'bg-orange-500 text-white' : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            <Trees size={14} />
            Dvorište
          </button>
          <label
            title="Stavi svoju fotografiju placa u pozadinu, pa okreni objekat da legne na mesto"
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
              photo ? 'bg-orange-500 text-white' : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            <ImagePlus size={14} />
            Moja slika
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) setPhoto(URL.createObjectURL(file))
                event.target.value = ''
              }}
            />
          </label>
          {photo && (
            <button type="button" aria-label="Ukloni fotografiju" title="Ukloni fotografiju" onClick={() => setPhoto(null)} className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100">
              <X size={14} />
            </button>
          )}
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
            {units > 1 ? `${units} u nizu · ` : ''}
            {roofLabel} · {(width * length * units).toFixed(1).replace('.', ',')} m²
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

function FrameCamera({ width, length, height, view, offsetX = 0 }) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls)
  const current = useRef({ phi: view.phi, theta: view.theta })
  const nonce = useRef(view.nonce)

  useLayoutEffect(() => {
    if (nonce.current !== view.nonce) {
      nonce.current = view.nonce
      current.current = { phi: view.phi, theta: view.theta }
    }
    const target = new THREE.Vector3(offsetX, Math.max(1.05, height * 0.42), 0)
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
  }, [width, length, height, offsetX, camera, controls, view])

  return (
    <OrbitControls
      makeDefault
      enableDamping
      maxPolarAngle={Math.PI / 2 - 0.04}
      minDistance={3}
      maxDistance={90}
      onEnd={(event) => {
        const orbit = event.target
        const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(orbit.target))
        if (spherical.radius > 0.1) current.current = { phi: spherical.phi, theta: spherical.theta }
      }}
    />
  )
}
