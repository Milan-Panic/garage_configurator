import { useMemo } from 'react'
import * as THREE from 'three'
import { FLOOR_LEVEL, PANEL_THICKNESS } from '../config'
import { structurePosts } from '../estimate'
import { wallFrame, wallPanels } from '../layout'
import { roofGeometry } from '../roof'
import { GarageDoor } from './GarageDoor'
import { PatternMesh } from './PatternMesh'
import { Roof } from './Roof'

const WALL_IDS = ['front', 'back', 'left', 'right']
const primer = new THREE.MeshStandardMaterial({ color: '#b4532a', roughness: 0.55, metalness: 0.35 })

export function Garage({
  width,
  length,
  height,
  wallMaterial,
  roofMaterial,
  doorMaterial,
  floorMaterial,
  windows = [],
  door,
  roof,
  gutters = true,
  pedestrianDoors = [],
  xray = false,
}) {
  const dimensions = useMemo(() => ({ width, length, height }), [width, length, height])
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
          ghost={xray}
        />
      ))}
      {floorMaterial && floorMaterial.id !== 'beton' && (
        <PatternMesh
          position={[0, FLOOR_LEVEL + 0.003, 0]}
          size={[width - PANEL_THICKNESS * 2, 0.006, length - PANEL_THICKNESS * 2]}
          spec={floorMaterial}
          shadows="receive"
        />
      )}
      <Roof dimensions={dimensions} roof={roof} wallMaterial={wallMaterial} roofMaterial={roofMaterial} gutters={gutters} ghost={xray} />
      {xray && <Structure dimensions={dimensions} roof={roof} door={door} pedestrianDoors={pedestrianDoors} />}
    </group>
  )
}

function Wall({ id, dimensions, material, windows, pedestrians = [], door, doorMaterial, ghost }) {
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
  const hasDoor = door?.style !== 'none' && door.wall === id
  if (hasDoor) {
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
          ghost={ghost}
        />
      ))}
      {hasDoor && <GarageDoor door={door} material={doorMaterial} wallHeight={wall.height} />}
    </group>
  )
}

// Čelični skelet iz računice: isti stubovi koje estimate.js broji.
function Structure({ dimensions, roof, door, pedestrianDoors }) {
  const { width, length } = dimensions
  const model = useMemo(() => roofGeometry(dimensions, roof), [dimensions, roof])
  const posts = useMemo(() => structurePosts(dimensions, roof, door, pedestrianDoors), [dimensions, roof, door, pedestrianDoors])
  const inset = 0.05
  const clampX = (x) => Math.max(-width / 2 + inset, Math.min(width / 2 - inset, x))
  const clampZ = (z) => Math.max(-length / 2 + inset, Math.min(length / 2 - inset, z))
  const top = (x, z) => new THREE.Vector3(clampX(x), model.underside(clampX(x), clampZ(z)) - 0.04, clampZ(z))
  const corners = [
    [-width / 2, length / 2],
    [width / 2, length / 2],
    [width / 2, -length / 2],
    [-width / 2, -length / 2],
  ]
  const plates = corners.map(([x, z], index) => {
    const [nx, nz] = corners[(index + 1) % 4]
    return [top(x, z), top(nx, nz)]
  })
  const rafters = []
  model.planes.forEach((plane) => {
    const [c0, c1, c2, c3] = plane.corners
    const slopeAlongX = Math.abs(c0.y - c1.y) > 0.01 || (Math.abs(c0.y - c3.y) < 0.01 && Math.abs(c1.x - c0.x) <= Math.abs(c3.z - c0.z))
    const span = slopeAlongX ? Math.abs(c3.z - c0.z) : Math.abs(c1.x - c0.x)
    const count = Math.ceil((span - 0.3) / 1.2) + 1
    for (let index = 0; index < count; index += 1) {
      const t = count === 1 ? 0.5 : 0.04 + (index / (count - 1)) * 0.92
      const a = slopeAlongX ? lerp3(c0, c3, t) : lerp3(c0, c1, t)
      const b = slopeAlongX ? lerp3(c1, c2, t) : lerp3(c3, c2, t)
      rafters.push([a.setY(a.y - 0.05), b.setY(b.y - 0.05)])
    }
  })
  return (
    <group>
      {posts.map((post) => (
        <mesh
          key={`${post.x}-${post.z}`}
          position={[clampX(post.x), FLOOR_LEVEL + post.height / 2, clampZ(post.z)]}
          material={primer}
          castShadow
        >
          <boxGeometry args={[0.08, post.height, 0.08]} />
        </mesh>
      ))}
      {plates.map(([a, b], index) => (
        <Beam key={`plate-${index}`} a={a} b={b} size={[0.06, 0.06]} />
      ))}
      {rafters.map(([a, b], index) => (
        <Beam key={`rafter-${index}`} a={a} b={b} size={[0.04, 0.07]} />
      ))}
    </group>
  )
}

function Beam({ a, b, size }) {
  const direction = b.clone().sub(a)
  const length = direction.length()
  if (length < 0.05) return null
  const mid = a.clone().add(b).multiplyScalar(0.5)
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.normalize())
  return (
    <mesh position={mid} quaternion={quaternion} material={primer} castShadow>
      <boxGeometry args={[size[0], size[1], length]} />
    </mesh>
  )
}

function lerp3(a, b, t) {
  return new THREE.Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t)
}
