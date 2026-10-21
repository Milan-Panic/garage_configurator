import { useMemo } from 'react'
import * as THREE from 'three'
import { wallFrame, wallPanels } from '../layout'
import { GarageDoor } from './GarageDoor'
import { PatternMesh } from './PatternMesh'
import { Roof } from './Roof'

const WALL_IDS = ['front', 'back', 'left', 'right']

export function Garage({ width, length, height, wallMaterial, roofMaterial, doorMaterial, windows = [], door, roof, gutters = true, pedestrianDoors = [] }) {
  const dimensions = { width, length, height }
  return (
    <group>
      {WALL_IDS.map((id) => (
        <Wall
          key={id}
          id={id}
          dimensions={dimensions}
          material={wallMaterial}
          windows={windows.filter((item) => item.wall === id)}
          pedestrians={pedestrianDoors.filter((item) => item.wall === id)}
          door={door}
          doorMaterial={doorMaterial}
        />
      ))}
      <Roof dimensions={dimensions} roof={roof} wallMaterial={wallMaterial} roofMaterial={roofMaterial} gutters={gutters} />
    </group>
  )
}

function Wall({ id, dimensions, material, windows, pedestrians = [], door, doorMaterial }) {
  const wall = wallFrame(id, dimensions)
  const quaternion = useMemo(() => {
    const basis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(...wall.axis),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(...wall.normal),
    )
    return new THREE.Quaternion().setFromRotationMatrix(basis)
  }, [wall.axis, wall.normal])
  const openings = windows.map((item) => ({
    along: item.along,
    sill: item.sill + 0.012,
    width: Math.max(0.1, item.width - 0.024),
    height: Math.max(0.1, item.height - 0.024),
  }))
  if (door?.style !== 'none' && door.wall === id) {
    openings.push({ along: door.along, sill: 0, width: door.width, height: door.height })
  }
  pedestrians.forEach((item) => {
    openings.push({ along: item.along, sill: 0, width: item.width, height: item.height })
  })
  const panels = wallPanels(wall.span, wall.height, openings)

  return (
    <group position={wall.origin} quaternion={quaternion}>
      {panels.map((panel) => (
        <PatternMesh
          key={`${panel.u0}-${panel.v0}-${panel.u1}-${panel.v1}`}
          position={[(panel.u0 + panel.u1) / 2, (panel.v0 + panel.v1) / 2, 0]}
          size={[panel.u1 - panel.u0, panel.v1 - panel.v0, wall.thickness]}
          spec={material}
          u={panel.u0}
          v={panel.v0}
        />
      ))}
      {door?.style !== 'none' && door.wall === id && <GarageDoor door={door} material={doorMaterial} />}
    </group>
  )
}
