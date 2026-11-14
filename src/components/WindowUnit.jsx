import { useMemo } from 'react'
import * as THREE from 'three'
import { FLOOR_LEVEL } from '../config'
import { projectAlong, wallFrame } from '../layout'
import { frameColor } from '../materials'
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
      <WindowModel
        type={item.type}
        width={item.width}
        height={item.height}
        color={frameColor(item.frame)}
        bars={item.bars}
        selected={selected}
      />
    </group>
  )
}

// U lokalnom sistemu zida +z gleda unutra, −z napolje.
export function WindowModel({ type, width, height, color = '#f4f1ea', bars = false, selected }) {
  const frame = 0.055
  const depth = 0.13
  const glassWidth = width - frame * 2
  const glassHeight = height - frame * 2

  if (type === 'glassblock') {
    return (
      <group>
        <GlassBlocks width={width} height={height} />
        {bars && <Bars width={width} height={height} depth={depth} />}
        {selected && <Selection width={width} height={height} depth={depth} />}
      </group>
    )
  }

  const mullions = type === 'strip' ? Math.max(0, Math.round(width / 0.9) - 1) : type === 'double' ? 1 : 0

  return (
    <group>
      <FrameBar color={color} position={[0, height / 2 - frame / 2, 0]} size={[width, frame, depth]} />
      <FrameBar color={color} position={[0, -height / 2 + frame / 2, 0]} size={[width, frame, depth]} />
      <FrameBar color={color} position={[-width / 2 + frame / 2, 0, 0]} size={[frame, glassHeight, depth]} />
      <FrameBar color={color} position={[width / 2 - frame / 2, 0, 0]} size={[frame, glassHeight, depth]} />
      {Array.from({ length: mullions }, (_, index) => {
        const x = -glassWidth / 2 + (glassWidth * (index + 1)) / (mullions + 1)
        return <FrameBar key={x} color={color} position={[x, 0, 0.012]} size={[0.045, glassHeight, depth * 0.72]} />
      })}
      {(type === 'single' || type === 'tilt') && <Sash color={color} width={glassWidth} height={glassHeight} />}
      <Glass position={[0, 0, 0]} size={[glassWidth - 0.01, glassHeight - 0.02, 0.012]} />
      {type === 'double' && (
        <>
          <Handle position={[-0.07, 0, depth / 2]} />
          <Handle position={[0.07, 0, depth / 2]} />
        </>
      )}
      {type === 'single' && <Handle position={[glassWidth / 2 - 0.08, 0, depth / 2]} />}
      {type === 'tilt' && <Handle position={[0, glassHeight / 2 - 0.06, depth / 2]} horizontal />}
      <mesh position={[0, -height / 2 - 0.015, -depth / 2 - 0.04]} castShadow>
        <boxGeometry args={[width + 0.06, 0.02, 0.1]} />
        <meshStandardMaterial color="#8d9296" roughness={0.4} metalness={0.6} />
      </mesh>
      {bars && <Bars width={width} height={height} depth={depth} />}
      {selected && <Selection width={width} height={height} depth={depth} />}
    </group>
  )
}

function Selection({ width, height, depth }) {
  return (
    <mesh>
      <boxGeometry args={[width + 0.04, height + 0.04, depth + 0.04]} />
      <meshBasicMaterial color="#f5b800" wireframe />
    </mesh>
  )
}

function Bars({ width, height, depth }) {
  const count = Math.max(2, Math.round(width / 0.13))
  const z = -depth / 2 - 0.05
  return (
    <group>
      {Array.from({ length: count }, (_, index) => {
        const x = -width / 2 + 0.05 + ((width - 0.1) * index) / (count - 1)
        return (
          <mesh key={x} position={[x, 0, z]} castShadow>
            <cylinderGeometry args={[0.009, 0.009, height + 0.06, 6]} />
            <meshStandardMaterial color="#1f2224" roughness={0.5} metalness={0.6} />
          </mesh>
        )
      })}
      {[-0.35, 0.35].map((spot) => (
        <mesh key={spot} position={[0, height * spot, z]}>
          <boxGeometry args={[width, 0.03, 0.012]} />
          <meshStandardMaterial color="#1f2224" roughness={0.5} metalness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

function GlassBlocks({ width, height }) {
  const size = 0.19
  const cols = Math.max(1, Math.round(width / size))
  const rows = Math.max(1, Math.round(height / size))
  const joint = '#cfc9bd'
  return (
    <group>
      <mesh>
        <boxGeometry args={[width - 0.01, height - 0.01, 0.08]} />
        <meshStandardMaterial color="#bcd8e2" transparent opacity={0.6} roughness={0.15} metalness={0.05} />
      </mesh>
      {Array.from({ length: cols + 1 }, (_, index) => (
        <mesh key={`c${index}`} position={[-width / 2 + (width * index) / cols, 0, 0]}>
          <boxGeometry args={[0.012, height, 0.09]} />
          <meshStandardMaterial color={joint} roughness={0.9} />
        </mesh>
      ))}
      {Array.from({ length: rows + 1 }, (_, index) => (
        <mesh key={`r${index}`} position={[0, -height / 2 + (height * index) / rows, 0]}>
          <boxGeometry args={[width, 0.012, 0.09]} />
          <meshStandardMaterial color={joint} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function Sash({ width, height, color }) {
  const bar = 0.028
  return (
    <group position={[0, 0, 0.016]}>
      <FrameBar color={color} position={[0, height / 2 - bar / 2, 0]} size={[width, bar, 0.04]} />
      <FrameBar color={color} position={[0, -height / 2 + bar / 2, 0]} size={[width, bar, 0.04]} />
      <FrameBar color={color} position={[-width / 2 + bar / 2, 0, 0]} size={[bar, height - bar * 2, 0.04]} />
      <FrameBar color={color} position={[width / 2 - bar / 2, 0, 0]} size={[bar, height - bar * 2, 0.04]} />
    </group>
  )
}

function FrameBar({ position, size, color }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.45} metalness={0.08} />
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
        opacity={0.42}
        roughness={0.05}
        metalness={0.15}
        depthWrite={false}
      />
    </mesh>
  )
}

function Handle({ position, horizontal = false }) {
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={horizontal ? [0.14, 0.025, 0.04] : [0.025, 0.14, 0.04]} />
      <meshStandardMaterial color="#2f343a" roughness={0.35} metalness={0.6} />
    </mesh>
  )
}
