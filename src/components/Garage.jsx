import { useMemo } from 'react'
import * as THREE from 'three'
import { FLOOR_LEVEL, PANEL_THICKNESS, ROOF_OVERHANG, ROOF_THICKNESS } from '../config'
import { wallFrame, wallPanels } from '../layout'
import { GarageDoor } from './GarageDoor'
import { PatternMesh } from './PatternMesh'

const WALL_IDS = ['left', 'right', 'back']

export function Garage({ width, length, height, wallMaterial, roofMaterial, doorMaterial, windows = [], door }) {
  const innerWidth = width - PANEL_THICKNESS * 2
  const jamb = 0.24
  const header = 0.3
  const openingWidth = innerWidth - jamb * 2
  const frontZ = length / 2 - PANEL_THICKNESS / 2
  const wallY = FLOOR_LEVEL + height / 2

  return (
    <group>
      {WALL_IDS.map((id) => (
        <Wall
          key={id}
          id={id}
          dimensions={{ width, length, height }}
          material={wallMaterial}
          windows={windows.filter((item) => item.wall === id)}
        />
      ))}
      <PatternMesh
        position={[-innerWidth / 2 + jamb / 2, wallY, frontZ]}
        size={[jamb, height, PANEL_THICKNESS]}
        spec={wallMaterial}
      />
      <PatternMesh
        position={[innerWidth / 2 - jamb / 2, wallY, frontZ]}
        size={[jamb, height, PANEL_THICKNESS]}
        spec={wallMaterial}
      />
      <PatternMesh
        position={[0, FLOOR_LEVEL + height - header / 2, frontZ]}
        size={[openingWidth, header, PANEL_THICKNESS]}
        spec={wallMaterial}
      />
      <GarageDoor dimensions={{ width, length, height }} material={doorMaterial} door={door} />
      <PatternMesh
        position={[0, FLOOR_LEVEL + height + ROOF_THICKNESS / 2, 0]}
        size={[width + ROOF_OVERHANG * 2, ROOF_THICKNESS, length + ROOF_OVERHANG * 2]}
        spec={roofMaterial}
      />
    </group>
  )
}

function Wall({ id, dimensions, material, windows }) {
  const wall = wallFrame(id, dimensions)
  const quaternion = useMemo(() => {
    const basis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(...wall.axis),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(...wall.normal),
    )
    return new THREE.Quaternion().setFromRotationMatrix(basis)
  }, [wall.axis, wall.normal])
  const panels = wallPanels(
    wall.span,
    wall.height,
    windows.map((item) => ({
      along: item.along,
      sill: item.sill + 0.012,
      width: Math.max(0.1, item.width - 0.024),
      height: Math.max(0.1, item.height - 0.024),
    })),
  )

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
    </group>
  )
}
