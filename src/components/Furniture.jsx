import * as THREE from 'three'
import { FLOOR_LEVEL } from '../config'
import { usePlaneDrag } from './drag'

const FLOOR_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), -FLOOR_LEVEL)

export function FurniturePiece({ item, selected, onSelect, onChange, onGestureEnd }) {
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
          document.body.style.cursor = 'auto'
        }}
        onPointerDown={(event) => {
          onSelect()
          startDrag(event, FLOOR_PLANE, { x: item.x, z: item.z })
        }}
      >
        {item.type === 'workbench' && (
          <WorkbenchModel width={item.width} depth={item.depth} height={item.height} />
        )}
        {item.type === 'shelf' && (
          <ShelfModel width={item.width} depth={item.depth} height={item.height} />
        )}
        {item.type === 'rack' && (
          <RackModel width={item.width} depth={item.depth} height={item.height} />
        )}
        {item.type === 'cabinet' && (
          <CabinetModel width={item.width} depth={item.depth} height={item.height} />
        )}
        {selected && (
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[item.width + 0.08, 0.02, item.depth + 0.08]} />
            <meshBasicMaterial color="#ea580c" wireframe />
          </mesh>
        )}
      </group>
    </group>
  )
}

function WorkbenchModel({ width, depth, height }) {
  const top = 0.05
  const leg = 0.05
  const insetX = Math.min(0.08, width / 2 - leg)
  const insetZ = Math.min(0.08, depth / 2 - leg)
  const legs = [
    [-width / 2 + insetX, -depth / 2 + insetZ],
    [width / 2 - insetX, -depth / 2 + insetZ],
    [-width / 2 + insetX, depth / 2 - insetZ],
    [width / 2 - insetX, depth / 2 - insetZ],
  ]

  return (
    <group>
      <Box position={[0, height - top / 2, 0]} size={[width, top, depth]} color="#8a6744" roughness={0.58} />
      <Box
        position={[0, 0.22, 0]}
        size={[Math.max(0.2, width - 0.12), 0.03, Math.max(0.16, depth - 0.1)]}
        color="#6d5136"
        roughness={0.7}
      />
      {legs.map(([x, z]) => (
        <Box
          key={`${x}-${z}`}
          position={[x, (height - top) / 2, z]}
          size={[leg, height - top, leg]}
          color="#3f4650"
          metalness={0.55}
          roughness={0.38}
        />
      ))}
    </group>
  )
}

function ShelfModel({ width, depth, height }) {
  const side = 0.025
  const board = 0.02
  const count = 4
  const innerWidth = width - side * 2

  return (
    <group>
      <Box position={[-width / 2 + side / 2, height / 2, 0]} size={[side, height, depth]} color="#d7c4a3" />
      <Box position={[width / 2 - side / 2, height / 2, 0]} size={[side, height, depth]} color="#d7c4a3" />
      <Box position={[0, height / 2, -depth / 2 + 0.01]} size={[innerWidth, height, 0.015]} color="#c8b18a" />
      {Array.from({ length: count }, (_, index) => {
        const y = board / 2 + ((height - board) * index) / (count - 1)
        return (
          <Box
            key={y}
            position={[0, y, 0.01]}
            size={[innerWidth, board, depth - 0.03]}
            color="#e6d3ad"
          />
        )
      })}
    </group>
  )
}

function RackModel({ width, depth, height }) {
  const post = 0.04
  const count = 4
  const posts = [
    [-width / 2 + post / 2, -depth / 2 + post / 2],
    [width / 2 - post / 2, -depth / 2 + post / 2],
    [-width / 2 + post / 2, depth / 2 - post / 2],
    [width / 2 - post / 2, depth / 2 - post / 2],
  ]

  return (
    <group>
      {posts.map(([x, z]) => (
        <Box
          key={`${x}-${z}`}
          position={[x, height / 2, z]}
          size={[post, height, post]}
          color="#4b5563"
          metalness={0.65}
          roughness={0.32}
        />
      ))}
      {Array.from({ length: count }, (_, index) => {
        const y = 0.08 + ((height - 0.16) * index) / (count - 1)
        return (
          <Box
            key={y}
            position={[0, y, 0]}
            size={[width - post, 0.025, depth - post]}
            color="#c7ccd1"
            metalness={0.4}
            roughness={0.4}
          />
        )
      })}
    </group>
  )
}

function CabinetModel({ width, depth, height }) {
  const top = 0.035
  return (
    <group>
      <Box
        position={[0, (height - top) / 2, 0]}
        size={[width - 0.02, height - top, depth - 0.02]}
        color="#6e746c"
        roughness={0.62}
      />
      <Box position={[0, height - top / 2, 0]} size={[width, top, depth]} color="#4d534c" roughness={0.5} />
      <Box position={[0, (height - top) / 2, depth / 2 - 0.008]} size={[0.012, height - top - 0.08, 0.012]} color="#2f332e" />
      <Box position={[-width * 0.18, height * 0.48, depth / 2]} size={[0.09, 0.02, 0.03]} color="#d8d2c8" metalness={0.4} />
      <Box position={[width * 0.18, height * 0.48, depth / 2]} size={[0.09, 0.02, 0.03]} color="#d8d2c8" metalness={0.4} />
    </group>
  )
}

function Box({ position, size, color, roughness = 0.6, metalness = 0.04 }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  )
}
