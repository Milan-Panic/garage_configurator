import { useMemo } from 'react'
import * as THREE from 'three'
import { FLOOR_LEVEL, PANEL_THICKNESS } from '../config'
import { wallFrame, wallPanels } from '../layout'
import { structureFrame } from '../structure'
import { Canopy } from './Canopy'
import { GarageDoor } from './GarageDoor'
import { PatternMesh } from './PatternMesh'
import { Bar, Box } from './parts'
import { Roof } from './Roof'

const WALL_IDS = ['front', 'back', 'left', 'right']
const STEEL = { color: '#b4532a', roughness: 0.55, metalness: 0.35 }
// Ukrućenja su druge boje da se u skeletu odmah vide.
const BRACE = { color: '#eab308', roughness: 0.5, metalness: 0.35 }

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
  canopy = null,
  site = null,
  xray = false,
  hideRoof = false,
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
      {!hideRoof && <Roof dimensions={dimensions} roof={roof} wallMaterial={wallMaterial} roofMaterial={roofMaterial} gutters={gutters} ghost={xray} />}
      {canopy?.enabled && <Canopy canopy={canopy} dimensions={dimensions} material={roofMaterial} wallMaterial={wallMaterial} />}
      {xray && <Structure dimensions={dimensions} roof={roof} door={door} pedestrianDoors={pedestrianDoors} windows={windows} site={site} />}
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

// Čelični skelet iz računice: isti model koji estimate.js broji.
function Structure({ dimensions, roof, door, pedestrianDoors, windows, site }) {
  const frame = useMemo(
    () => structureFrame({ dimensions, roof, door, pedestrianDoors, windows, site }),
    [dimensions, roof, door, pedestrianDoors, windows, site],
  )
  const lines = (segments, thickness, tone = STEEL) =>
    segments.map((segment, index) => <Bar key={index} from={segment.a} to={segment.b} thickness={thickness} {...tone} />)
  return (
    <group>
      {frame.posts.map((post) => (
        <Box key={`${post.x}-${post.z}`} position={[post.x, FLOOR_LEVEL + post.height / 2, post.z]} size={[0.08, post.height, 0.08]} {...STEEL} />
      ))}
      <group>{lines(frame.plates, [0.06, 0.06])}</group>
      <group>{lines(frame.girts, [0.04, 0.04])}</group>
      <group>{lines(frame.headers, [0.05, 0.08])}</group>
      <group>{lines(frame.rafters, [0.04, 0.08])}</group>
      <group>{lines(frame.purlins, [0.04, 0.04])}</group>
      <group>{lines(frame.ties, [0.04, 0.06])}</group>
      <group>{lines(frame.kings, [0.04, 0.04])}</group>
      <group>{lines(frame.chords, [0.04, 0.08])}</group>
      <group>{lines(frame.webs, [0.03, 0.03])}</group>
      <group>{lines(frame.braces, [0.04, 0.04], BRACE)}</group>
    </group>
  )
}
