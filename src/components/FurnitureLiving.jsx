import { Bar, Box, Cyl } from './parts'

// Oprema za boravak, hobi i teretanu. Samo prikaz, ne ulazi u cenu.
const WOOD = { color: '#b98a5a', roughness: 0.6, metalness: 0 }
const DARK_WOOD = { color: '#6b4a2f', roughness: 0.65, metalness: 0 }
const DARK = { color: '#1f2428', roughness: 0.6, metalness: 0.4 }
const CHROME = { color: '#d4d4d8', roughness: 0.2, metalness: 0.9 }
const WHITE = { color: '#f4f4f2', roughness: 0.3, metalness: 0.05 }
const FABRIC = { color: '#5f6b73', roughness: 0.95, metalness: 0 }

function Legs({ width, depth, height, inset = 0.05, size = 0.05, material = WOOD }) {
  return [-1, 1].flatMap((sx) =>
    [-1, 1].map((sz) => (
      <Box key={`${sx}${sz}`} position={[sx * (width / 2 - inset), height / 2, sz * (depth / 2 - inset)]} size={[size, height, size]} {...material} />
    )),
  )
}

export function TableModel({ width, depth, height }) {
  return (
    <group>
      <Box position={[0, height - 0.02, 0]} size={[width, 0.04, depth]} {...WOOD} />
      <Legs width={width} depth={depth} height={height - 0.04} inset={0.07} size={0.06} material={DARK_WOOD} />
    </group>
  )
}

export function DiningChairModel({ width, depth, height }) {
  const seat = 0.46
  return (
    <group>
      <Box position={[0, seat, 0]} size={[width, 0.04, depth]} {...WOOD} />
      <Legs width={width} depth={depth} height={seat - 0.02} inset={0.04} size={0.035} material={DARK_WOOD} />
      {[-1, 1].map((side) => (
        <Box key={side} position={[side * (width / 2 - 0.04), (seat + height) / 2, -depth / 2 + 0.03]} size={[0.035, height - seat, 0.035]} {...DARK_WOOD} />
      ))}
      <Box position={[0, height - 0.12, -depth / 2 + 0.03]} size={[width - 0.04, 0.18, 0.025]} {...WOOD} />
    </group>
  )
}

export function ArmchairModel({ width, depth, height }) {
  const seat = 0.42
  const arm = 0.15
  return (
    <group>
      <Box position={[0, 0.2, 0]} size={[width, 0.3, depth]} {...FABRIC} />
      <Box position={[0, (height + 0.3) / 2, -depth / 2 + 0.1]} size={[width, height - 0.3, 0.2]} {...FABRIC} />
      {[-1, 1].map((side) => (
        <Box key={side} position={[side * (width / 2 - arm / 2), 0.2 + (seat + 0.14) / 2, 0]} size={[arm, seat + 0.14, depth]} {...FABRIC} />
      ))}
      <Box position={[0, seat, 0.06]} size={[width - arm * 2 - 0.02, 0.14, depth - 0.24]} color="#6d7a83" roughness={0.95} />
    </group>
  )
}

export function TvModel({ width, depth, height }) {
  const stand = Math.min(0.5, height * 0.4)
  const screen = Math.min(width * 0.56, height - stand - 0.05)
  return (
    <group>
      <Box position={[0, stand / 2, 0]} size={[width, stand, depth]} color="#3a3f45" roughness={0.6} metalness={0.2} />
      <Box position={[0, stand + 0.03, -depth * 0.15]} size={[0.3, 0.02, 0.2]} {...DARK} />
      <Box position={[0, stand + 0.03 + screen / 2, -depth * 0.15]} size={[width * 0.92, screen, 0.04]} color="#0b0d10" roughness={0.2} metalness={0.4} />
      <Box position={[0, stand + 0.03 + screen / 2, -depth * 0.15 + 0.021]} size={[width * 0.88, screen - 0.04, 0.002]} color="#1e3a5f" roughness={0.15} extra={{ emissive: '#1e40af', emissiveIntensity: 0.25 }} shadow={false} />
    </group>
  )
}

export function FridgeModel({ width, depth, height }) {
  const split = height * 0.62
  return (
    <group>
      <Box position={[0, height / 2, 0]} size={[width, height, depth]} {...WHITE} />
      <Box position={[0, split, depth / 2 + 0.002]} size={[width - 0.01, 0.008, 0.004]} color="#c8c8c4" roughness={0.4} />
      <Box position={[width / 2 - 0.06, split + 0.25, depth / 2 + 0.02]} size={[0.025, 0.35, 0.03]} {...CHROME} />
      <Box position={[width / 2 - 0.06, split - 0.25, depth / 2 + 0.02]} size={[0.025, 0.3, 0.03]} {...CHROME} />
    </group>
  )
}

export function TreadmillModel({ width, depth, height }) {
  return (
    <group>
      <Box position={[0, 0.1, 0.1]} size={[width, 0.16, depth - 0.2]} {...DARK} />
      <Box position={[0, 0.185, 0.12]} size={[width - 0.12, 0.01, depth - 0.35]} color="#111316" roughness={0.9} />
      {[-1, 1].map((side) => (
        <Bar key={side} from={[side * (width / 2 - 0.04), 0.15, -depth / 2 + 0.15]} to={[side * (width / 2 - 0.04), height - 0.15, -depth / 2 + 0.05]} thickness={0.05} {...DARK} />
      ))}
      <Box position={[0, height - 0.1, -depth / 2 + 0.05]} size={[width, 0.2, 0.12]} color="#2b3036" roughness={0.4} metalness={0.3} />
      <Box position={[0, height - 0.08, -depth / 2 + 0.115]} size={[width * 0.6, 0.12, 0.004]} color="#1e3a5f" roughness={0.2} extra={{ emissive: '#2563eb', emissiveIntensity: 0.3 }} shadow={false} />
    </group>
  )
}

export function WeightBenchModel({ width, depth, height }) {
  const bench = 0.45
  return (
    <group>
      <Box position={[0, bench, 0.15]} size={[0.3, 0.08, depth - 0.4]} color="#18181b" roughness={0.8} />
      <Box position={[0, bench / 2, 0.15]} size={[0.08, bench - 0.04, depth - 0.6]} {...DARK} />
      {[-1, 1].map((side) => (
        <Box key={side} position={[side * (width / 2 - 0.15), height / 2, -depth / 2 + 0.15]} size={[0.06, height, 0.06]} {...DARK} />
      ))}
      <Cyl position={[0, height - 0.25, -depth / 2 + 0.15]} size={[0.015, width]} axis="x" {...CHROME} />
      {[-1, 1].map((side) => (
        <Cyl key={side} position={[side * (width / 2 - 0.02), height - 0.25, -depth / 2 + 0.15]} size={[0.2, 0.05]} axis="x" color="#111316" roughness={0.7} />
      ))}
    </group>
  )
}

export function BilliardModel({ width, depth, height }) {
  const rail = 0.12
  return (
    <group>
      <Box position={[0, height - 0.08, 0]} size={[width, 0.16, depth]} {...DARK_WOOD} />
      <Box position={[0, height + 0.001, 0]} size={[width - rail * 2, 0.01, depth - rail * 2]} color="#166534" roughness={0.95} />
      <Legs width={width} depth={depth} height={height - 0.16} inset={0.15} size={0.14} material={DARK_WOOD} />
      {[-1, 0, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Cyl key={`${sx}${sz}`} position={[sx * (width / 2 - rail), height + 0.004, sz * (depth / 2 - rail)]} size={[0.05, 0.01]} color="#0b0b0b" roughness={0.9} shadow={false} />
        )),
      )}
    </group>
  )
}

export function PingPongModel({ width, depth, height }) {
  return (
    <group>
      <Box position={[0, height - 0.015, 0]} size={[width, 0.03, depth]} color="#1d4ed8" roughness={0.6} />
      <Box position={[0, height + 0.001, 0]} size={[0.02, 0.002, depth]} {...WHITE} shadow={false} />
      <Box position={[0, height + 0.08, 0]} size={[0.01, 0.15, depth + 0.1]} color="#e7e5e4" roughness={0.9} />
      <Legs width={width} depth={depth} height={height - 0.03} inset={0.3} size={0.05} material={DARK} />
    </group>
  )
}

export function GrillModel({ width, depth, height }) {
  const bowl = height * 0.85
  return (
    <group>
      <Box position={[0, bowl, 0]} size={[width * 0.6, 0.2, depth]} color="#111316" roughness={0.5} metalness={0.5} />
      <Box position={[0, bowl + 0.14, -0.02]} size={[width * 0.6, 0.12, depth - 0.04]} color="#18181b" roughness={0.5} metalness={0.5} />
      <Box position={[width * 0.35, bowl - 0.05, 0]} size={[width * 0.25, 0.03, depth]} {...WOOD} />
      <Legs width={width * 0.6} depth={depth} height={bowl - 0.1} inset={0.04} size={0.03} material={DARK} />
    </group>
  )
}

export function BoxesModel({ width, depth, height }) {
  const cardboard = { color: '#b08954', roughness: 0.9, metalness: 0 }
  const half = height / 2
  return (
    <group>
      <Box position={[-width * 0.2, half / 2, 0]} size={[width * 0.55, half, depth]} {...cardboard} />
      <Box position={[width * 0.27, half * 0.4, depth * 0.05]} size={[width * 0.42, half * 0.8, depth * 0.85]} color="#a07c4c" roughness={0.9} />
      <Box position={[-width * 0.15, half + half * 0.45, 0]} size={[width * 0.5, half * 0.9, depth * 0.8]} color="#bf9862" roughness={0.9} />
    </group>
  )
}
