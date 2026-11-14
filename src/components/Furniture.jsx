import * as THREE from 'three'
import { FLOOR_LEVEL } from '../config'
import { usePlaneDrag } from './drag'
import {
  BarrelsModel,
  BasinModel,
  BoilerModel,
  ChairModel,
  CompressorModel,
  DeskModel,
  DrillPressModel,
  ExtinguisherModel,
  LadderModel,
  Lift2Model,
  Lift4Model,
  PalletModel,
  PalletRackModel,
  SofaModel,
  StoveModel,
  ToiletModel,
  WaterHeaterModel,
  WelderModel,
} from './FurnitureExtra'
import { Box, Cyl } from './parts'

const FLOOR_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), -FLOOR_LEVEL)

export function FurniturePiece({ item, selected, clash = false, raise = 0, onSelect, onChange, onGestureEnd }) {
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
        <FurnitureModel type={item.type} width={item.width} depth={item.depth} height={item.height} raise={raise} />
        {(selected || clash) && (
          <mesh position={[0, item.height / 2, 0]}>
            <boxGeometry args={[item.width + 0.06, item.height + 0.04, item.depth + 0.06]} />
            <meshBasicMaterial color={clash ? '#dc2626' : '#f5b800'} wireframe />
          </mesh>
        )}
      </group>
    </group>
  )
}

const MODELS = {
  workbench: WorkbenchModel,
  shelf: ShelfModel,
  rack: RackModel,
  cabinet: CabinetModel,
  locker: LockerModel,
  toolchest: ToolChestModel,
  pegboard: PegboardModel,
  tirerack: TireRackModel,
  bike: BikeModel,
  motorbike: MotorbikeModel,
  mower: MowerModel,
  freezer: FreezerModel,
  sink: SinkModel,
  washer: WasherModel,
  firewood: FirewoodModel,
  lift2: Lift2Model,
  lift4: Lift4Model,
  compressor: CompressorModel,
  welder: WelderModel,
  drillpress: DrillPressModel,
  barrels: BarrelsModel,
  palletrack: PalletRackModel,
  pallet: PalletModel,
  ladder: LadderModel,
  extinguisher: ExtinguisherModel,
  desk: DeskModel,
  chair: ChairModel,
  sofa: SofaModel,
  toilet: ToiletModel,
  basin: BasinModel,
  waterheater: WaterHeaterModel,
  boiler: BoilerModel,
  stove: StoveModel,
}

export function FurnitureModel({ type, width, depth, height, raise = 0 }) {
  const Model = MODELS[type] ?? CabinetModel
  return <Model width={width} depth={depth} height={height} raise={raise} />
}

function LockerModel({ width, depth, height }) {
  const doors = Math.max(1, Math.round(width / 0.45))
  const doorWidth = width / doors
  return (
    <group>
      <Box position={[0, height / 2, 0]} size={[width, height, depth]} color="#7d8a95" metalness={0.45} roughness={0.42} />
      {Array.from({ length: doors }, (_, index) => {
        const x = -width / 2 + doorWidth * (index + 0.5)
        return (
          <group key={x}>
            <Box position={[x, height / 2, depth / 2 + 0.004]} size={[doorWidth - 0.015, height - 0.06, 0.01]} color="#8b98a3" metalness={0.45} roughness={0.4} />
            {[0.82, 0.86, 0.9].map((spot) => (
              <Box key={spot} position={[x, height * spot, depth / 2 + 0.011]} size={[doorWidth * 0.5, 0.01, 0.004]} color="#4b5560" />
            ))}
            <Box position={[x + doorWidth * 0.32, height * 0.52, depth / 2 + 0.02]} size={[0.02, 0.12, 0.02]} color="#1f2428" metalness={0.6} />
          </group>
        )
      })}
    </group>
  )
}

function ToolChestModel({ width, depth, height }) {
  const wheel = 0.06
  const body = height - wheel * 2
  const drawers = Math.max(3, Math.round(body / 0.14))
  return (
    <group>
      <Box position={[0, wheel * 2 + body / 2, 0]} size={[width, body, depth]} color="#b91c1c" metalness={0.4} roughness={0.38} />
      {Array.from({ length: drawers }, (_, index) => {
        const y = wheel * 2 + (body * (index + 0.5)) / drawers
        return (
          <group key={y}>
            <Box position={[0, y, depth / 2 + 0.004]} size={[width - 0.04, body / drawers - 0.012, 0.01]} color="#c92a2a" metalness={0.4} roughness={0.36} />
            <Box position={[0, y, depth / 2 + 0.016]} size={[width * 0.55, 0.012, 0.012]} color="#d4d4d8" metalness={0.8} roughness={0.25} />
          </group>
        )
      })}
      <Box position={[0, height + 0.005, 0]} size={[width + 0.01, 0.012, depth + 0.01]} color="#27272a" roughness={0.8} />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * (width / 2 - 0.06), wheel, sz * (depth / 2 - 0.06)]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[wheel, wheel, 0.04, 12]} />
            <meshStandardMaterial color="#18181b" roughness={0.8} />
          </mesh>
        )),
      )}
    </group>
  )
}

function PegboardModel({ width, depth, height }) {
  const board = Math.min(1.2, height * 0.6)
  const bottom = height - board
  const tools = [
    { x: -0.32, y: 0.62, size: [0.04, 0.32, 0.03], color: '#1d4ed8' },
    { x: -0.18, y: 0.55, size: [0.05, 0.24, 0.03], color: '#dc2626' },
    { x: 0, y: 0.6, size: [0.22, 0.04, 0.03], color: '#a1a1aa' },
    { x: 0.2, y: 0.4, size: [0.03, 0.26, 0.03], color: '#f59e0b' },
    { x: 0.34, y: 0.5, size: [0.12, 0.12, 0.05], color: '#16a34a' },
    { x: -0.05, y: 0.3, size: [0.3, 0.025, 0.03], color: '#52525b' },
  ]
  return (
    <group>
      <Box position={[0, bottom + board / 2, -depth / 2 + 0.01]} size={[width, board, 0.018]} color="#d6c3a0" roughness={0.85} />
      {tools.map((tool) => (
        <Box
          key={`${tool.x}${tool.y}`}
          position={[tool.x * width, bottom + board * tool.y, -depth / 2 + 0.04]}
          size={tool.size}
          color={tool.color}
          metalness={0.3}
          roughness={0.45}
        />
      ))}
      <Box position={[0, bottom - 0.02, -depth / 2 + 0.06]} size={[width, 0.02, 0.1]} color="#3f3f46" metalness={0.5} />
    </group>
  )
}

function TireRackModel({ width, depth, height }) {
  const levels = Math.max(2, Math.round(height / 0.6))
  const tireR = Math.min(0.32, depth * 0.75)
  const perLevel = Math.max(1, Math.floor(width / 0.24))
  return (
    <group>
      <RackModel width={width} depth={depth} height={height} />
      {Array.from({ length: levels }, (_, level) => {
        const y = 0.08 + ((height - 0.16) * level) / Math.max(1, levels - 1) + tireR + 0.015
        if (y + tireR > height) return null
        return Array.from({ length: perLevel }, (_, index) => {
          const x = -width / 2 + (width * (index + 0.5)) / perLevel
          return (
            <mesh key={`${level}-${index}`} position={[x, y, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
              <torusGeometry args={[tireR * 0.72, tireR * 0.28, 10, 22]} />
              <meshStandardMaterial color="#18181b" roughness={0.85} />
            </mesh>
          )
        })
      })}
    </group>
  )
}

function Wheel({ position, radius, width = 0.04, color = '#18181b' }) {
  return (
    <mesh position={position} rotation={[0, Math.PI / 2, 0]} castShadow>
      <torusGeometry args={[radius - width / 2, width / 2, 8, 24]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  )
}

function BikeModel({ depth, height }) {
  const r = Math.min(0.36, height * 0.34)
  const wheelbase = depth / 2 - r
  return (
    <group>
      <Wheel position={[0, r, -wheelbase]} radius={r} />
      <Wheel position={[0, r, wheelbase]} radius={r} />
      <Box position={[0, r + 0.22, 0]} size={[0.03, 0.03, wheelbase * 1.4]} color="#0f766e" metalness={0.5} roughness={0.35} />
      <Box position={[0, r + 0.08, -wheelbase * 0.35]} size={[0.03, 0.36, 0.03]} color="#0f766e" metalness={0.5} roughness={0.35} />
      <Box position={[0, height - 0.12, -wheelbase * 0.45]} size={[0.1, 0.03, 0.22]} color="#18181b" />
      <Box position={[0, height - 0.06, wheelbase * 0.82]} size={[0.5, 0.025, 0.025]} color="#27272a" metalness={0.5} />
      <Box position={[0, (r + height) / 2, wheelbase * 0.85]} size={[0.03, height - r, 0.03]} color="#0f766e" metalness={0.5} />
    </group>
  )
}

function MotorbikeModel({ width, depth, height }) {
  const r = Math.min(0.32, height * 0.27)
  const wheelbase = depth / 2 - r
  return (
    <group>
      <Wheel position={[0, r, -wheelbase]} radius={r} width={0.12} />
      <Wheel position={[0, r, wheelbase]} radius={r} width={0.1} />
      <Box position={[0, r + 0.22, -0.05]} size={[0.32, 0.36, wheelbase * 1.1]} color="#27272a" metalness={0.5} roughness={0.4} />
      <Box position={[0, r + 0.5, 0.15]} size={[0.3, 0.2, 0.5]} color="#b91c1c" metalness={0.5} roughness={0.25} />
      <Box position={[0, r + 0.48, -0.35]} size={[0.26, 0.1, 0.55]} color="#18181b" roughness={0.7} />
      <Box position={[0, height - 0.06, wheelbase * 0.72]} size={[Math.min(width, 0.75), 0.03, 0.03]} color="#a1a1aa" metalness={0.7} />
      <Box position={[0, (r + height) / 2, wheelbase * 0.8]} size={[0.05, height - r, 0.05]} color="#a1a1aa" metalness={0.7} />
    </group>
  )
}

function MowerModel({ width, depth, height }) {
  const deckDepth = Math.min(0.6, depth * 0.45)
  return (
    <group>
      <Box position={[0, 0.2, -depth / 2 + deckDepth / 2]} size={[width, 0.24, deckDepth]} color="#15803d" metalness={0.3} roughness={0.4} />
      <Box position={[0, 0.38, -depth / 2 + deckDepth / 2]} size={[width * 0.5, 0.14, deckDepth * 0.5]} color="#27272a" metalness={0.4} />
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (width / 2 - 0.04), 0.1, -depth / 2 + deckDepth * 0.5]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.05, 14]} />
          <meshStandardMaterial color="#18181b" roughness={0.8} />
        </mesh>
      ))}
      <Box position={[0, height * 0.55, -depth / 2 + deckDepth + (depth - deckDepth) / 2]} size={[0.03, 0.03, Math.hypot(depth - deckDepth, height * 0.7)]} color="#3f3f46" metalness={0.5} rotation={[Math.atan2(height * 0.7, depth - deckDepth), 0, 0]} />
      <Box position={[0, height - 0.04, depth / 2 - 0.04]} size={[width * 0.8, 0.03, 0.03]} color="#3f3f46" metalness={0.5} />
    </group>
  )
}

function FreezerModel({ width, depth, height }) {
  return (
    <group>
      <Box position={[0, height / 2, 0]} size={[width, height, depth]} color="#f4f4f5" roughness={0.35} metalness={0.1} />
      <Box position={[0, height + 0.015, 0]} size={[width + 0.01, 0.03, depth + 0.01]} color="#e4e4e7" roughness={0.35} />
      <Box position={[0, height - 0.06, depth / 2 + 0.015]} size={[width * 0.3, 0.025, 0.03]} color="#71717a" metalness={0.6} />
    </group>
  )
}

function WasherModel({ width, depth, height }) {
  return (
    <group>
      <Box position={[0, height / 2, 0]} size={[width, height, depth]} color="#f4f4f5" roughness={0.35} metalness={0.1} />
      <mesh position={[0, height * 0.46, depth / 2 + 0.01]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[width * 0.3, width * 0.3, 0.02, 28]} />
        <meshStandardMaterial color="#9ec9df" roughness={0.1} metalness={0.3} />
      </mesh>
      <Box position={[0, height - 0.07, depth / 2 + 0.004]} size={[width - 0.04, 0.1, 0.01]} color="#d4d4d8" />
    </group>
  )
}

function SinkModel({ width, depth, height }) {
  return (
    <group>
      <Box position={[0, (height - 0.05) / 2, 0]} size={[width, height - 0.05, depth]} color="#e7e5e4" roughness={0.6} />
      <Box position={[0, height - 0.025, 0]} size={[width, 0.05, depth]} color="#d4d4d8" metalness={0.8} roughness={0.2} />
      <Box position={[0, height - 0.01, 0.02]} size={[width * 0.6, 0.02, depth * 0.6]} color="#71717a" metalness={0.8} roughness={0.25} />
      <Box position={[0, height + 0.12, -depth / 2 + 0.06]} size={[0.03, 0.24, 0.03]} color="#d4d4d8" metalness={0.9} roughness={0.2} />
      <Box position={[0, height + 0.22, -depth / 2 + 0.13]} size={[0.025, 0.025, 0.15]} color="#d4d4d8" metalness={0.9} roughness={0.2} />
    </group>
  )
}

function FirewoodModel({ width, depth, height }) {
  const log = 0.11
  const cols = Math.max(1, Math.floor(width / log))
  const rows = Math.max(1, Math.floor(height / log))
  return (
    <group>
      {Array.from({ length: rows }, (_, row) =>
        Array.from({ length: cols }, (_, col) => {
          const x = -width / 2 + log / 2 + col * log + (row % 2 ? log / 4 : 0)
          if (x > width / 2 - log / 2) return null
          const tone = 0.85 + ((row * 7 + col * 13) % 10) / 40
          return (
            <Cyl
              key={`${row}-${col}`}
              position={[x, log / 2 + row * log * 0.92, 0]}
              size={[log, depth]}
              axis="z"
              color={`rgb(${Math.round(150 * tone)}, ${Math.round(104 * tone)}, ${Math.round(64 * tone)})`}
              roughness={0.95}
            />
          )
        }),
      )}
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
