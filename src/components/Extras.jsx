import { useMemo } from 'react'
import * as THREE from 'three'
import { FLOOR_LEVEL } from '../config'
import { wallFrame } from '../layout'
import { frameColor, sceneMaterials } from '../materials'
import { skylightLayout } from '../skylights'
import { CarModel } from './Car'
import { Electrics, SolarPanels } from './Electrics'
import { FurnitureModel } from './Furniture'
import { Garage } from './Garage'
import { PedestrianDoor } from './PedestrianDoor'
import { Rooms } from './Rooms'
import { WindowModel } from './WindowUnit'
import { Box } from './parts'

const noop = () => {}

export function StaticWindow({ item, dimensions }) {
  const wall = wallFrame(item.wall, dimensions)
  const quaternion = useMemo(() => {
    const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(...wall.axis), new THREE.Vector3(0, 1, 0), new THREE.Vector3(...wall.normal))
    return new THREE.Quaternion().setFromRotationMatrix(basis)
  }, [wall.axis, wall.normal])
  const position = [wall.origin[0] + wall.axis[0] * item.along, FLOOR_LEVEL + item.sill + item.height / 2, wall.origin[2] + wall.axis[2] * item.along]
  return (
    <group position={position} quaternion={quaternion}>
      <WindowModel type={item.type} width={item.width} height={item.height} color={frameColor(item.frame)} bars={item.bars} />
    </group>
  )
}

export function Skylights({ dimensions, roof, skylights }) {
  const placed = useMemo(
    () =>
      skylightLayout(dimensions, roof, skylights).items.map((item) => {
        const x = new THREE.Vector3(...item.unitU)
        const y = new THREE.Vector3(...item.normal)
        const z = new THREE.Vector3().crossVectors(x, y)
        return { ...item, quaternion: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)) }
      }),
    [dimensions, roof, skylights],
  )
  return (
    <group>
      {placed.map((item, index) => (
        <group key={index} position={item.position} quaternion={item.quaternion}>
          <Box position={[0, 0.03, 0]} size={[item.size[0] + 0.1, 0.12, item.size[1] + 0.1]} color="#d6d3d1" roughness={0.4} metalness={0.6} />
          <Box
            position={[0, item.dome ? 0.13 : 0.1, 0]}
            size={[item.size[0], item.dome ? 0.14 : 0.03, item.size[1]]}
            color="#cfe8f5"
            roughness={0.08}
            metalness={0.2}
            extra={{ transparent: true, opacity: 0.6 }}
            shadow={false}
          />
        </group>
      ))}
    </group>
  )
}

// Ostale jedinice u nizu: iste ljuske, pomerene za širinu objekta.
export function UnitCopies({ scene, xray = false, hideRoof = false }) {
  const units = scene.units || 1
  const materials = useMemo(() => sceneMaterials(scene), [scene])
  if (units <= 1) return null
  const { width, length, height } = scene.dimensions
  return (
    <group>
      {Array.from({ length: units - 1 }, (_, index) => (
        <group key={index} position={[(index + 1) * width, 0, 0]}>
          <Garage
            width={width}
            length={length}
            height={height}
            {...materials}
            windows={scene.windows}
            door={scene.door}
            roof={scene.roof}
            gutters={scene.gutters !== false}
            pedestrianDoors={scene.pedestrianDoors || []}
            site={scene.site}
            xray={xray}
            hideRoof={hideRoof}
          />
          {(scene.pedestrianDoors || []).map((item) => (
            <PedestrianDoor key={item.id} item={item} dimensions={scene.dimensions} selected={false} onSelect={noop} onChange={noop} />
          ))}
          {scene.windows.map((item) => (
            <StaticWindow key={item.id} item={item} dimensions={scene.dimensions} />
          ))}
          {!hideRoof && scene.skylights?.count > 0 && <Skylights dimensions={scene.dimensions} roof={scene.roof} skylights={scene.skylights} />}
        </group>
      ))}
    </group>
  )
}

// Sve što nije sama ljuska objekta: struja, paneli, krovni prozori, prostorije i niz.
export function SceneExtras({ scene, openTop = false, xray = false, selectedRoomId = null, onSelectRoom, interior = false }) {
  if (!scene) return null
  const { dimensions, roof } = scene
  return (
    <group>
      <Electrics scene={scene} showCeiling={!openTop} />
      {!openTop && scene.electric?.solar > 0 && <SolarPanels dimensions={dimensions} roof={roof} kilowatts={scene.electric.solar} />}
      {!openTop && scene.skylights?.count > 0 && <Skylights dimensions={dimensions} roof={roof} skylights={scene.skylights} />}
      <Rooms rooms={scene.rooms} dimensions={dimensions} selectedId={selectedRoomId} showCeiling={!openTop} onSelect={onSelectRoom} />
      <UnitCopies scene={scene} xray={xray} hideRoof={openTop} />
      {interior && (
        <group>
          {(scene.furniture || []).map((item) => (
            <group key={item.id} position={[item.x, FLOOR_LEVEL, item.z]} rotation={[0, item.rotation, 0]}>
              <FurnitureModel type={item.type} width={item.width} depth={item.depth} height={item.height} />
            </group>
          ))}
          {scene.car && (
            <group position={[scene.car.x, FLOOR_LEVEL + (scene.car.elevation || 0), scene.car.z]} rotation={[0, scene.car.rotation, 0]}>
              <CarModel length={scene.car.length} width={scene.car.width} height={scene.car.height} kind={scene.car.kind} color={scene.car.color} />
            </group>
          )}
        </group>
      )}
    </group>
  )
}
