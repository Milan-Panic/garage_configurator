import * as THREE from 'three'
import { FLOOR_LEVEL } from '../config'
import { usePlaneDrag } from './drag'

const FLOOR_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), -FLOOR_LEVEL)

export function Car({ item, selected, onSelect, onChange, onGestureEnd }) {
  function handleDrag(point, start, extra) {
    onChange({
      x: extra.x + (point.x - start.x),
      z: extra.z + (point.z - start.z),
    })
  }

  const { startDrag } = usePlaneDrag(handleDrag, onGestureEnd)

  return (
    <group position={[item.x, FLOOR_LEVEL, item.z]} rotation={[0, item.rotation, 0]}>
      <group
        onPointerOver={(event) => {
          event.stopPropagation()
          document.body.style.cursor = 'grab'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
        onPointerDown={(event) => {
          onSelect()
          startDrag(event, FLOOR_PLANE, { x: item.x, z: item.z })
        }}
      >
        <CarModel length={item.length} width={item.width} height={item.height} />
        {selected && (
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[item.width + 0.1, 0.02, item.length + 0.1]} />
            <meshBasicMaterial color="#ea580c" wireframe />
          </mesh>
        )}
      </group>
    </group>
  )
}

function CarModel({ length, width, height }) {
  const wheelR = Math.min(0.36, Math.max(0.24, height * 0.22))
  const wheelW = Math.min(0.22, width * 0.12)
  const bodyTop = height * 0.46
  const bodyH = Math.max(0.3, bodyTop - wheelR * 0.35)
  const bodyY = wheelR * 0.55 + bodyH / 2
  const cabinH = Math.max(0.3, height - bodyTop + 0.06)
  const cabinL = length * 0.46
  const cabinW = width * 0.86
  const cabinY = bodyTop + cabinH / 2 - 0.06
  const trackX = width / 2 - wheelW / 2 - 0.02
  const axleZ = length * 0.31
  const wheels = [
    [-trackX, -axleZ],
    [trackX, -axleZ],
    [-trackX, axleZ],
    [trackX, axleZ],
  ]

  return (
    <group>
      <mesh position={[0, bodyY, 0]} castShadow receiveShadow>
        <boxGeometry args={[width * 0.96, bodyH, length]} />
        <meshStandardMaterial color="#1d4e89" roughness={0.35} metalness={0.45} />
      </mesh>
      <mesh position={[0, cabinY, -length * 0.04]} castShadow>
        <boxGeometry args={[cabinW, cabinH, cabinL]} />
        <meshStandardMaterial color="#163e6d" roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh position={[0, cabinY + cabinH * 0.08, -length * 0.04]}>
        <boxGeometry args={[cabinW * 0.92, cabinH * 0.55, cabinL * 0.92]} />
        <meshStandardMaterial color="#c5e4f5" transparent opacity={0.55} roughness={0.05} metalness={0.1} />
      </mesh>
      <mesh position={[0, bodyY + bodyH * 0.15, length / 2 + 0.01]}>
        <boxGeometry args={[width * 0.7, 0.08, 0.04]} />
        <meshStandardMaterial color="#f4e7c3" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0, bodyY + bodyH * 0.15, -length / 2 - 0.01]}>
        <boxGeometry args={[width * 0.62, 0.07, 0.03]} />
        <meshStandardMaterial color="#8f1d1d" roughness={0.4} metalness={0.15} />
      </mesh>
      {wheels.map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, wheelR, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[wheelR, wheelR, wheelW, 18]} />
          <meshStandardMaterial color="#1a1c1f" roughness={0.7} metalness={0.2} />
        </mesh>
      ))}
    </group>
  )
}
