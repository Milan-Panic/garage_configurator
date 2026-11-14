import { useMemo } from 'react'
import * as THREE from 'three'
import { FLOOR_LEVEL } from '../config'
import { projectAlong, wallFrame } from '../layout'
import { usePlaneDrag } from './drag'

export function PedestrianDoor({ item, dimensions, selected, onSelect, onChange, onGestureEnd }) {
  const wall = wallFrame(item.wall, dimensions)
  const quaternion = useMemo(() => {
    const basis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(...wall.axis),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(...wall.normal),
    )
    return new THREE.Quaternion().setFromRotationMatrix(basis)
  }, [wall.axis, wall.normal])
  const plane = useMemo(
    () =>
      new THREE.Plane().setFromNormalAndCoplanarPoint(
        new THREE.Vector3(...wall.normal),
        new THREE.Vector3(...wall.origin),
      ),
    [wall.normal, wall.origin],
  )
  const position = [
    wall.origin[0] + wall.axis[0] * item.along,
    FLOOR_LEVEL + item.height / 2,
    wall.origin[2] + wall.axis[2] * item.along,
  ]
  const { startDrag } = usePlaneDrag((point, start, extra) => {
    onChange({ along: extra.along + (projectAlong(point, wall) - projectAlong(start, wall)) })
  }, onGestureEnd)

  return (
    <group
      position={position}
      quaternion={quaternion}
      onPointerDown={(event) => {
        event.stopPropagation()
        onSelect()
        startDrag(event, plane, { along: item.along })
      }}
    >
      <mesh position={[0, 0, -0.05]} castShadow>
        <boxGeometry args={[item.width, item.height, 0.06]} />
        <meshStandardMaterial color="#3a3f44" roughness={0.45} metalness={0.4} />
      </mesh>
      <mesh position={[0, -0.02, -0.07]} castShadow>
        <boxGeometry args={[item.width - 0.12, item.height - 0.1, 0.03]} />
        <meshStandardMaterial color="#f1eee8" roughness={0.55} metalness={0.08} />
      </mesh>
      {item.glass && (
        <mesh position={[0, item.height * 0.18, -0.09]}>
          <boxGeometry args={[item.width - 0.32, item.height * 0.42, 0.01]} />
          <meshStandardMaterial color="#9ec9df" transparent opacity={0.6} roughness={0.05} metalness={0.15} />
        </mesh>
      )}
      <mesh position={[item.width / 2 - 0.12, -0.02, -0.1]}>
        <boxGeometry args={[0.03, 0.16, 0.04]} />
        <meshStandardMaterial color="#1f2428" roughness={0.35} metalness={0.6} />
      </mesh>
      {selected && (
        <mesh position={[0, 0, -0.05]}>
          <boxGeometry args={[item.width + 0.04, item.height + 0.04, 0.1]} />
          <meshBasicMaterial color="#f5b800" wireframe />
        </mesh>
      )}
    </group>
  )
}
