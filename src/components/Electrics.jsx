import { useMemo } from 'react'
import * as THREE from 'three'
import { wallFrame } from '../layout'
import { electricLayout, solarLayout } from '../electric'
import { Bar, Box, Cyl } from './parts'

const PLASTIC = { color: '#f5f5f4', roughness: 0.45, metalness: 0.02 }
const CONDUIT = { color: '#d6d3d1', roughness: 0.6, metalness: 0.05 }

function wallQuaternion(id, dimensions) {
  const wall = wallFrame(id, dimensions)
  const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(...wall.axis), new THREE.Vector3(0, 1, 0), new THREE.Vector3(...wall.normal))
  return new THREE.Quaternion().setFromRotationMatrix(basis)
}

// Vidljiva instalacija: svetiljke, utičnice, prekidači, tabla, punjač i kanalice.
export function Electrics({ scene, showCeiling = true }) {
  const layout = useMemo(() => electricLayout(scene), [scene])
  const turns = useMemo(
    () => Object.fromEntries(['front', 'back', 'left', 'right'].map((id) => [id, wallQuaternion(id, scene.dimensions)])),
    [scene.dimensions],
  )
  if (!scene.electric?.enabled) return null

  return (
    <group>
      {layout.conduits.map((part, index) => (
        <Bar key={index} from={part.a} to={part.b} thickness={[0.025, 0.018]} {...CONDUIT} />
      ))}
      {layout.sockets.map((item, index) => (
        <group key={index} position={item.position} quaternion={turns[item.wall]}>
          <Box position={[0, 0, 0]} size={[0.085, 0.085, 0.04]} {...PLASTIC} />
          <Cyl position={[0, 0, 0.016]} size={[0.045, 0.012]} axis="z" color="#d6d3d1" roughness={0.5} shadow={false} />
          <Box position={[-0.01, 0, 0.023]} size={[0.006, 0.006, 0.002]} color="#1c1917" shadow={false} />
          <Box position={[0.01, 0, 0.023]} size={[0.006, 0.006, 0.002]} color="#1c1917" shadow={false} />
        </group>
      ))}
      {layout.switches.map((item, index) => (
        <group key={index} position={item.position} quaternion={turns[item.wall]}>
          <Box position={[0, 0, 0]} size={[0.085, 0.085, 0.025]} {...PLASTIC} />
          <Box position={[0, 0, 0.014]} size={[0.045, 0.06, 0.008]} color="#e7e5e4" roughness={0.4} rotation={[0.12, 0, 0]} shadow={false} />
        </group>
      ))}
      {layout.board && (
        <group position={layout.board.position} quaternion={turns[layout.board.wall]}>
          <Box position={[0, 0, 0]} size={[layout.board.phase === 'three' ? 0.42 : 0.32, 0.4, 0.1]} color="#e7e5e4" roughness={0.5} metalness={0.15} />
          <Box position={[0, 0.02, 0.052]} size={[layout.board.phase === 'three' ? 0.34 : 0.24, 0.2, 0.006]} color="#44403c" roughness={0.3} metalness={0.2} extra={{ transparent: true, opacity: 0.75 }} shadow={false} />
          {Array.from({ length: layout.board.phase === 'three' ? 10 : 6 }, (_, index) => (
            <Box key={index} position={[(index - (layout.board.phase === 'three' ? 4.5 : 2.5)) * 0.03, 0.02, 0.05]} size={[0.02, 0.08, 0.01]} color={index === 0 ? '#eab308' : '#fafaf9'} shadow={false} />
          ))}
        </group>
      )}
      {layout.power && (
        <group position={layout.power.position} quaternion={turns[layout.power.wall]}>
          <Box position={[0, 0, 0]} size={[0.11, 0.13, 0.06]} color="#57534e" roughness={0.5} />
          <Cyl position={[0, -0.01, 0.045]} size={[0.075, 0.05]} axis="z" color="#dc2626" roughness={0.45} />
        </group>
      )}
      {layout.charger && (
        <group position={layout.charger.position} quaternion={turns[layout.charger.wall]}>
          {layout.charger.ready ? (
            <Box position={[0, 0, -0.03]} size={[0.16, 0.16, 0.06]} color="#a8a29e" roughness={0.5} />
          ) : (
            <>
              <Box position={[0, 0, 0]} size={[0.26, 0.4, 0.12]} color="#fafaf9" roughness={0.35} metalness={0.1} />
              <Box position={[0, 0.07, 0.062]} size={[0.16, 0.16, 0.004]} color="#111827" roughness={0.2} shadow={false} />
              <Box position={[0, 0.07, 0.066]} size={[0.1, 0.012, 0.002]} color="#22c55e" extra={{ emissive: '#22c55e', emissiveIntensity: 1.2 }} shadow={false} />
              <Cyl position={[0.07, -0.13, 0.07]} size={[0.06, 0.05]} axis="z" color="#1c1917" roughness={0.6} />
              <Bar from={[0.07, -0.15, 0.08]} to={[0.14, -0.55, 0.06]} thickness={0.022} color="#1c1917" roughness={0.7} />
              <Bar from={[0.14, -0.55, 0.06]} to={[-0.1, -0.5, 0.06]} thickness={0.022} color="#1c1917" roughness={0.7} />
              <Bar from={[-0.1, -0.5, 0.06]} to={[-0.12, -0.2, 0.07]} thickness={0.022} color="#1c1917" roughness={0.7} />
            </>
          )}
        </group>
      )}
      {layout.lights
        .filter((light) => showCeiling || light.room)
        .map((light, index) => (
          <group key={index} position={light.position}>
            <Box position={[0, 0.03, 0]} size={[0.13, 0.04, light.length + 0.06]} color="#e7e5e4" roughness={0.5} metalness={0.3} />
            <Box position={[0, 0, 0]} size={[0.1, 0.035, light.length]} color="#fffbeb" roughness={0.3} extra={{ emissive: '#fff4cf', emissiveIntensity: 1.6 }} shadow={false} />
          </group>
        ))}
    </group>
  )
}

export function SolarPanels({ dimensions, roof, kilowatts }) {
  const layout = useMemo(() => solarLayout(dimensions, roof, kilowatts), [dimensions, roof, kilowatts])
  const placed = useMemo(
    () =>
      layout.panels.map((panel) => {
        const x = new THREE.Vector3(...panel.unitU)
        const y = new THREE.Vector3(...panel.normal)
        const z = new THREE.Vector3().crossVectors(x, y)
        return { ...panel, quaternion: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)) }
      }),
    [layout],
  )
  return (
    <group>
      {placed.map((panel, index) => (
        <group key={index} position={panel.position} quaternion={panel.quaternion}>
          <Box position={[0, 0, 0]} size={[panel.size[0], 0.035, panel.size[1]]} color="#c7ccd1" roughness={0.35} metalness={0.8} />
          <Box position={[0, 0.019, 0]} size={[panel.size[0] - 0.04, 0.004, panel.size[1] - 0.04]} color="#0f1f3d" roughness={0.12} metalness={0.55} shadow={false} />
          {[-1, 1].map((side) => (
            <Box key={side} position={[0, -0.04, side * panel.size[1] * 0.3]} size={[panel.size[0], 0.045, 0.04]} color="#9ca3af" roughness={0.4} metalness={0.8} shadow={false} />
          ))}
        </group>
      ))}
    </group>
  )
}
