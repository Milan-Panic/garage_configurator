import { useMemo } from 'react'
import * as THREE from 'three'
import { FLOOR_LEVEL } from '../config'
import { projectAlong, wallFrame } from '../layout'
import { usePlaneDrag } from './drag'

export function WindowUnit({ item, dimensions, selected, onSelect, onChange, onGestureEnd }) {
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
    FLOOR_LEVEL + item.sill + item.height / 2,
    wall.origin[2] + wall.axis[2] * item.along,
  ]

  function handleDrag(point, start, extra) {
    onChange({
      along: extra.along + (projectAlong(point, wall) - projectAlong(start, wall)),
      sill: extra.sill + (point.y - start.y),
    })
  }

  const { startDrag } = usePlaneDrag(handleDrag, onGestureEnd)

  return (
    <group
      position={position}
      quaternion={quaternion}
      onPointerOver={(event) => {
        event.stopPropagation()
        document.body.style.cursor = 'grab'
      }}
      onPointerOut={() => {
        document.body.style.cursor = ''
      }}
      onPointerDown={(event) => {
        onSelect()
        startDrag(event, plane, { along: item.along, sill: item.sill })
      }}
    >
      <WindowModel type={item.type} width={item.width} height={item.height} selected={selected} />
    </group>
  )
}

function WindowModel({ type, width, height, selected }) {
  const frame = 0.055
  const depth = 0.13
  const glassWidth = width - frame * 2
  const glassHeight = height - frame * 2

  return (
    <group>
      <FrameBar position={[0, height / 2 - frame / 2, 0]} size={[width, frame, depth]} />
      <FrameBar position={[0, -height / 2 + frame / 2, 0]} size={[width, frame, depth]} />
      <FrameBar position={[-width / 2 + frame / 2, 0, 0]} size={[frame, glassHeight, depth]} />
      <FrameBar position={[width / 2 - frame / 2, 0, 0]} size={[frame, glassHeight, depth]} />
      {type === 'double' && (
        <FrameBar position={[0, 0, 0.012]} size={[0.04, glassHeight, depth * 0.72]} />
      )}
      {type === 'single' && <Sash width={glassWidth} height={glassHeight} />}
      {type === 'double' ? (
        <>
          <Glass
            position={[-glassWidth / 4 - 0.01, 0, 0]}
            size={[glassWidth / 2 - 0.03, glassHeight - 0.02, 0.012]}
          />
          <Glass
            position={[glassWidth / 4 + 0.01, 0, 0]}
            size={[glassWidth / 2 - 0.03, glassHeight - 0.02, 0.012]}
          />
          <Handle position={[-0.07, 0, depth / 2]} />
          <Handle position={[0.07, 0, depth / 2]} />
        </>
      ) : (
        <Glass position={[0, 0, 0]} size={[glassWidth, type === 'single' ? glassHeight - 0.04 : glassHeight, 0.012]} />
      )}
      {type === 'single' && <Handle position={[glassWidth / 2 - 0.08, 0, depth / 2]} />}
      {selected && (
        <mesh>
          <boxGeometry args={[width + 0.04, height + 0.04, depth + 0.04]} />
          <meshBasicMaterial color="#ea580c" wireframe />
        </mesh>
      )}
    </group>
  )
}

function Sash({ width, height }) {
  const bar = 0.028
  return (
    <group position={[0, 0, 0.016]}>
      <FrameBar position={[0, height / 2 - bar / 2, 0]} size={[width, bar, 0.04]} />
      <FrameBar position={[0, -height / 2 + bar / 2, 0]} size={[width, bar, 0.04]} />
      <FrameBar position={[-width / 2 + bar / 2, 0, 0]} size={[bar, height - bar * 2, 0.04]} />
      <FrameBar position={[width / 2 - bar / 2, 0, 0]} size={[bar, height - bar * 2, 0.04]} />
    </group>
  )
}

function FrameBar({ position, size }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#f4f1ea" roughness={0.45} metalness={0.08} />
    </mesh>
  )
}

function Glass({ position, size }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color="#9ec9df"
        transparent
        opacity={0.45}
        roughness={0.05}
        metalness={0.15}
        depthWrite={false}
      />
    </mesh>
  )
}

function Handle({ position }) {
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={[0.025, 0.14, 0.04]} />
      <meshStandardMaterial color="#2f343a" roughness={0.35} metalness={0.6} />
    </mesh>
  )
}
