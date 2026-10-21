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
        <meshStandardMaterial color={selected ? '#d6d3cd' : '#f4f1ea'} roughness={0.55} metalness={0.08} />
      </mesh>
      <mesh position={[item.width / 2 - 0.08, 0.05, -0.09]}>
        <boxGeometry args={[0.03, 0.16, 0.04]} />
        <meshStandardMaterial color="#1f2428" roughness={0.35} metalness={0.6} />
      </mesh>
    </group>
  )
}
