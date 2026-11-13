import { Bar, Box, Cyl } from './parts'

const STEEL = { color: '#2f6fb3', roughness: 0.42, metalness: 0.45 }
const DARK = { color: '#1f2428', roughness: 0.6, metalness: 0.4 }
const CHROME = { color: '#d4d4d8', roughness: 0.2, metalness: 0.9 }
const WHITE = { color: '#f4f4f2', roughness: 0.25, metalness: 0.05 }

// Dvostubna dizalica. `raise` je visina na koju je auto podignut.
export function Lift2Model({ width, depth, height, raise = 0 }) {
  const postX = width / 2 - 0.14
  const armY = Math.max(0.1, raise + 0.15)
  const reach = Math.min(1.25, depth / 2 + 0.45)
  const padX = Math.min(0.72, postX - 0.55)
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box position={[side * postX, 0.012, 0]} size={[0.5, 0.024, 0.62]} {...DARK} />
          <Box position={[side * postX, height / 2, 0]} size={[0.26, height, 0.3]} {...STEEL} />
          <Box position={[side * (postX - 0.15), armY + 0.06, 0]} size={[0.12, 0.34, 0.36]} {...DARK} />
          {[-1, 1].map((end) => (
            <group key={end}>
              <Bar from={[side * (postX - 0.18), armY, end * 0.1]} to={[side * padX, armY, end * reach]} thickness={[0.11, 0.07]} {...DARK} />
              <Cyl position={[side * padX, armY + 0.05, end * reach]} size={[0.14, 0.04]} color="#111316" roughness={0.9} />
            </group>
          ))}
        </group>
      ))}
      {height >= 3.3 ? (
        <Box position={[0, height - 0.08, 0]} size={[width - 0.02, 0.14, 0.2]} {...STEEL} />
      ) : (
        <Box position={[0, 0.02, 0]} size={[postX * 2, 0.04, 0.34]} {...DARK} />
      )}
      <Box position={[postX + 0.02, 1.25, 0.21]} size={[0.2, 0.3, 0.14]} color="#e7e5e4" roughness={0.5} metalness={0.2} />
      <Cyl position={[postX + 0.02, 1.62, 0.21]} size={[0.14, 0.26]} {...DARK} />
    </group>
  )
}

// Četvorostubna dizalica sa stazama. `raise` je visina staza.
export function Lift4Model({ width, depth, height, raise = 0 }) {
  const postX = width / 2 - 0.09
  const postZ = depth / 2 - 0.09
  const deck = Math.min(height - 0.25, Math.max(0.14, raise))
  const trackX = Math.min(0.78, postX - 0.42)
  const runway = depth - 0.5
  return (
    <group>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <group key={`${sx}${sz}`}>
            <Box position={[sx * postX, 0.012, sz * postZ]} size={[0.3, 0.024, 0.3]} {...DARK} />
            <Box position={[sx * postX, height / 2, sz * postZ]} size={[0.16, height, 0.16]} {...STEEL} />
          </group>
        )),
      )}
      {[-1, 1].map((sz) => (
        <Box key={sz} position={[0, deck - 0.1, sz * postZ]} size={[postX * 2, 0.14, 0.12]} {...STEEL} />
      ))}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <Box position={[sx * trackX, deck - 0.05, 0]} size={[0.52, 0.1, runway]} color="#3a3f45" roughness={0.75} metalness={0.4} />
          <Box position={[sx * (trackX + 0.25), deck + 0.02, 0]} size={[0.03, 0.05, runway]} {...DARK} />
          {deck < 0.3 && (
            <Bar from={[sx * trackX, deck - 0.03, runway / 2]} to={[sx * trackX, 0.02, runway / 2 + 0.7]} thickness={[0.5, 0.04]} color="#3a3f45" roughness={0.75} metalness={0.4} />
          )}
        </group>
      ))}
      <Box position={[postX + 0.02, 1.1, postZ - 0.22]} size={[0.2, 0.3, 0.16]} color="#e7e5e4" roughness={0.5} metalness={0.2} />
    </group>
  )
}

export function CompressorModel({ width, depth, height }) {
  const radius = Math.min(width / 2, height * 0.3)
  const tankY = radius + 0.12
  return (
    <group>
      <Cyl position={[0, tankY, 0]} size={[radius * 2, depth * 0.86]} axis="z" color="#c2410c" roughness={0.4} metalness={0.45} />
      {[-1, 1].map((end) => (
        <Cyl key={end} position={[0, tankY, end * depth * 0.43]} size={[radius * 1.7, 0.08]} axis="z" color="#9a3412" roughness={0.4} metalness={0.45} />
      ))}
      <Box position={[0, 0.06, depth * 0.3]} size={[width * 0.8, 0.12, 0.06]} {...DARK} />
      {[-1, 1].map((side) => (
        <Cyl key={side} position={[side * (width / 2 - 0.03), 0.1, -depth * 0.3]} size={[0.2, 0.05]} axis="x" color="#18181b" roughness={0.85} />
      ))}
      <Box position={[0, tankY + radius + 0.04, 0]} size={[width * 0.7, 0.04, depth * 0.6]} {...DARK} />
      <Cyl position={[0, Math.min(height - 0.1, tankY + radius + 0.17), -depth * 0.14]} size={[Math.min(0.24, width * 0.5), depth * 0.3]} axis="z" color="#3f3f46" roughness={0.5} metalness={0.5} />
      <Box position={[0, Math.min(height - 0.1, tankY + radius + 0.17), depth * 0.17]} size={[width * 0.5, 0.2, depth * 0.2]} color="#52525b" roughness={0.5} metalness={0.5} />
      <Cyl position={[width * 0.2, tankY + radius * 0.5, depth * 0.44]} size={[0.07, 0.03]} axis="z" {...WHITE} />
    </group>
  )
}

export function WelderModel({ width, depth, height }) {
  const body = height * 0.5
  return (
    <group>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Cyl key={`${sx}${sz}`} position={[sx * (width / 2 - 0.03), 0.07, sz * depth * 0.32]} size={[0.14, 0.04]} axis="x" color="#18181b" roughness={0.85} />
        )),
      )}
      <Box position={[0, 0.14, 0]} size={[width - 0.08, 0.03, depth]} {...DARK} />
      <Box position={[0, 0.16 + body / 2, depth * 0.14]} size={[width - 0.12, body, depth * 0.62]} color="#1d4ed8" roughness={0.45} metalness={0.3} />
      <Box position={[0, 0.16 + body * 0.62, depth * 0.455]} size={[width * 0.5, body * 0.4, 0.01]} color="#0f172a" roughness={0.4} />
      <Cyl position={[-width * 0.14, 0.16 + body * 0.26, depth * 0.46]} size={[0.05, 0.02]} axis="z" {...CHROME} />
      <Cyl position={[width * 0.14, 0.16 + body * 0.26, depth * 0.46]} size={[0.05, 0.02]} axis="z" color="#dc2626" roughness={0.4} />
      <Cyl position={[0, 0.16 + (height - 0.26) / 2, -depth * 0.34]} size={[Math.min(0.22, width * 0.5), height - 0.26]} color="#71717a" roughness={0.35} metalness={0.6} />
      <Cyl position={[0, height - 0.06, -depth * 0.34]} size={[0.07, 0.1]} {...DARK} />
      <Box position={[0, 0.16 + body + 0.05, depth * 0.14]} size={[width * 0.6, 0.03, 0.03]} {...DARK} />
    </group>
  )
}

export function DrillPressModel({ width, depth, height }) {
  const table = height * 0.52
  return (
    <group>
      <Box position={[0, 0.03, 0]} size={[width, 0.06, depth]} color="#365314" roughness={0.5} metalness={0.4} />
      <Cyl position={[0, height * 0.46, -depth * 0.25]} size={[0.08, height * 0.92]} {...CHROME} />
      <Box position={[0, table, 0.02]} size={[width * 0.7, 0.04, depth * 0.55]} color="#52525b" roughness={0.4} metalness={0.6} />
      <Box position={[0, height - 0.17, -depth * 0.05]} size={[width * 0.55, 0.3, depth * 0.85]} color="#3f6212" roughness={0.5} metalness={0.4} />
      <Cyl position={[0, height - 0.12, -depth * 0.38]} size={[0.16, 0.26]} {...DARK} />
      <Cyl position={[0, height - 0.4, depth * 0.2]} size={[0.05, 0.16]} {...CHROME} />
      <Cyl position={[0, height - 0.52, depth * 0.2]} size={[0.012, 0.12]} {...DARK} />
      <Bar from={[width * 0.28, height - 0.2, depth * 0.1]} to={[width * 0.5, height - 0.36, depth * 0.3]} thickness={0.02} {...DARK} />
    </group>
  )
}

export function BarrelsModel({ width, height }) {
  const count = Math.max(1, Math.round(width / 0.62))
  const colors = ['#1d4ed8', '#b91c1c', '#15803d', '#1d4ed8']
  return (
    <group>
      {Array.from({ length: count }, (_, index) => {
        const x = -width / 2 + (width * (index + 0.5)) / count
        const color = colors[index % colors.length]
        return (
          <group key={index}>
            <Cyl position={[x, height / 2, 0]} size={[0.57, height]} color={color} roughness={0.45} metalness={0.4} />
            {[0.02, 0.36, 0.66, 0.98].map((spot) => (
              <Cyl key={spot} position={[x, height * spot, 0]} size={[0.6, 0.025]} color={color} roughness={0.4} metalness={0.5} />
            ))}
            <Cyl position={[x + 0.14, height + 0.012, 0.1]} size={[0.07, 0.02]} {...DARK} />
          </group>
        )
      })}
    </group>
  )
}

export function PalletRackModel({ width, depth, height }) {
  const bays = width > 3.3 ? 2 : 1
  const frames = Array.from({ length: bays + 1 }, (_, index) => -width / 2 + 0.05 + ((width - 0.1) * index) / bays)
  const levels = Math.max(1, Math.floor((height - 0.3) / 1.3))
  const bay = (width - 0.1) / bays
  return (
    <group>
      {frames.map((x) => (
        <group key={x}>
          {[-1, 1].map((sz) => (
            <Box key={sz} position={[x, height / 2, sz * (depth / 2 - 0.04)]} size={[0.09, height, 0.07]} {...STEEL} />
          ))}
          {Array.from({ length: Math.max(2, Math.floor(height / 0.7)) }, (_, index) => {
            const y0 = 0.15 + index * 0.7
            if (y0 + 0.55 > height) return null
            return <Bar key={index} from={[x, y0, (index % 2 ? 1 : -1) * (depth / 2 - 0.06)]} to={[x, y0 + 0.55, (index % 2 ? -1 : 1) * (depth / 2 - 0.06)]} thickness={0.03} {...STEEL} />
          })}
        </group>
      ))}
      {Array.from({ length: levels }, (_, level) => {
        const y = 1.3 * (level + 1)
        if (y > height - 0.2) return null
        return (
          <group key={level}>
            {[-1, 1].map((sz) => (
              <Box key={sz} position={[0, y, sz * (depth / 2 - 0.04)]} size={[width - 0.1, 0.11, 0.05]} color="#ea580c" roughness={0.45} metalness={0.4} />
            ))}
            {Array.from({ length: bays }, (_, index) => {
              const x = -width / 2 + 0.05 + bay * (index + 0.5)
              const load = 0.45 + (((level * 3 + index * 5) % 4) / 4) * 0.5
              if (y + 0.2 + load > height + 0.4) return null
              return <PalletModel key={index} position={[x, y + 0.055, 0]} width={Math.min(1.2, bay - 0.25)} depth={Math.min(0.8, depth - 0.2)} height={0.15 + load} />
            })}
          </group>
        )
      })}
      {Array.from({ length: bays }, (_, index) => (
        <PalletModel key={index} position={[-width / 2 + 0.05 + bay * (index + 0.5), 0, 0]} width={Math.min(1.2, bay - 0.25)} depth={Math.min(0.8, depth - 0.2)} height={0.95} />
      ))}
    </group>
  )
}

export function PalletModel({ width, depth, height, position }) {
  const load = Math.max(0, height - 0.15)
  const rows = Math.max(1, Math.round(load / 0.34))
  return (
    <group position={position}>
      {[-1, 0, 1].map((spot) => (
        <Box key={spot} position={[spot * (width / 2 - 0.05), 0.05, 0]} size={[0.1, 0.1, depth]} color="#b08a5a" roughness={0.9} />
      ))}
      {[-2, -1, 0, 1, 2].map((spot) => (
        <Box key={spot} position={[0, 0.125, spot * (depth / 2 - 0.05) * 0.5]} size={[width, 0.022, 0.1]} color="#c39b68" roughness={0.9} />
      ))}
      {load > 0.1 &&
        Array.from({ length: rows }, (_, row) => (
          <group key={row}>
            {[-1, 1].map((side) => (
              <Box
                key={side}
                position={[side * (width / 4 - 0.01), 0.14 + (load * (row + 0.5)) / rows, 0]}
                size={[width / 2 - 0.05, load / rows - 0.015, depth - 0.06 - (row % 2) * 0.04]}
                color={row % 2 ? '#b98a56' : '#c79a64'}
                roughness={0.88}
              />
            ))}
            <Box position={[0, 0.14 + (load * (row + 0.5)) / rows, 0]} size={[width - 0.03, 0.04, depth - 0.02]} color="#e7dcc8" roughness={0.7} />
          </group>
        ))}
    </group>
  )
}

export function LadderModel({ width, depth, height }) {
  const foot = depth / 2 - 0.03
  const rungs = Math.max(4, Math.round(height / 0.28))
  const at = (t) => [0.02 + (height - 0.04) * t, foot - (depth - 0.06) * t]
  return (
    <group>
      {[-1, 1].map((side) => (
        <Bar key={side} from={[side * (width / 2 - 0.02), 0.02, foot]} to={[side * (width / 2 - 0.02), height - 0.02, -foot]} thickness={[0.03, 0.06]} color="#a8adb3" roughness={0.35} metalness={0.75} />
      ))}
      {Array.from({ length: rungs }, (_, index) => {
        const [y, z] = at((index + 0.6) / rungs)
        return <Cyl key={index} position={[0, y, z]} size={[0.028, width - 0.05]} axis="x" color="#c3c7cc" roughness={0.35} metalness={0.75} />
      })}
    </group>
  )
}

export function ExtinguisherModel({ height }) {
  return (
    <group>
      <Cyl position={[0, (height - 0.12) / 2, 0]} size={[0.15, height - 0.12]} color="#c81e1e" roughness={0.35} metalness={0.3} />
      <Cyl position={[0, height - 0.09, 0]} size={[0.05, 0.08]} {...DARK} />
      <Box position={[0.03, height - 0.03, 0]} size={[0.13, 0.025, 0.03]} {...DARK} />
      <Bar from={[-0.03, height - 0.07, 0]} to={[-0.09, height * 0.45, 0.02]} thickness={0.018} {...DARK} />
      <Box position={[0, height * 0.5, 0.076]} size={[0.09, 0.12, 0.004]} {...WHITE} />
    </group>
  )
}

export function DeskModel({ width, depth, height }) {
  const side = 0.025
  return (
    <group>
      <Box position={[0, height - 0.015, 0]} size={[width, 0.03, depth]} color="#c9a877" roughness={0.55} />
      <Box position={[-width / 2 + side / 2 + 0.02, (height - 0.03) / 2, 0]} size={[side, height - 0.03, depth - 0.06]} color="#3f4650" roughness={0.5} metalness={0.3} />
      <Box position={[width / 2 - 0.22, (height - 0.03) / 2 + 0.03, 0]} size={[0.4, height - 0.09, depth - 0.08]} color="#e5e2dc" roughness={0.6} />
      {[0.25, 0.5, 0.75].map((spot) => (
        <Box key={spot} position={[width / 2 - 0.22, height * spot, depth / 2 - 0.035]} size={[0.14, 0.015, 0.015]} {...DARK} />
      ))}
      <Box position={[0, height * 0.6, -depth / 2 + 0.03]} size={[width - 0.5, height * 0.45, 0.018]} color="#3f4650" roughness={0.5} metalness={0.3} />
      <Box position={[-width * 0.12, height + 0.01, -depth * 0.2]} size={[0.22, 0.02, 0.16]} {...DARK} />
      <Box position={[-width * 0.12, height + 0.07, -depth * 0.22]} size={[0.04, 0.12, 0.03]} {...DARK} />
      <Box position={[-width * 0.12, height + 0.28, -depth * 0.2]} size={[0.56, 0.33, 0.025]} color="#111827" roughness={0.25} metalness={0.3} />
      <Box position={[-width * 0.12, height + 0.28, -depth * 0.2 + 0.014]} size={[0.52, 0.29, 0.002]} color="#60a5fa" roughness={0.2} extra={{ emissive: '#1d4ed8', emissiveIntensity: 0.35 }} shadow={false} />
      <Box position={[-width * 0.12, height + 0.012, depth * 0.12]} size={[0.42, 0.018, 0.14]} color="#27272a" roughness={0.6} />
    </group>
  )
}

export function ChairModel({ width, depth, height }) {
  const seat = Math.min(0.48, height * 0.5)
  return (
    <group>
      {[0, 1, 2, 3, 4].map((index) => {
        const angle = (index / 5) * Math.PI * 2
        const reach = Math.min(width, depth) / 2 - 0.03
        return (
          <group key={index}>
            <Bar from={[0, 0.07, 0]} to={[Math.sin(angle) * reach, 0.05, Math.cos(angle) * reach]} thickness={[0.04, 0.025]} {...DARK} />
            <Cyl position={[Math.sin(angle) * reach, 0.025, Math.cos(angle) * reach]} size={[0.05, 0.035]} axis="x" color="#111316" roughness={0.8} />
          </group>
        )
      })}
      <Cyl position={[0, seat / 2 + 0.02, 0]} size={[0.05, seat - 0.1]} {...CHROME} />
      <Box position={[0, seat, 0.02]} size={[width - 0.08, 0.07, depth - 0.1]} color="#27272a" roughness={0.9} />
      <Box position={[0, (seat + height) / 2 + 0.06, -depth / 2 + 0.07]} size={[width - 0.12, height - seat - 0.12, 0.06]} color="#27272a" roughness={0.9} />
      <Box position={[0, seat + 0.08, -depth / 2 + 0.09]} size={[0.05, 0.16, 0.03]} {...DARK} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box position={[side * (width / 2 - 0.03), seat + 0.2, 0]} size={[0.045, 0.03, depth * 0.5]} {...DARK} />
          <Box position={[side * (width / 2 - 0.03), seat + 0.1, -0.02]} size={[0.025, 0.2, 0.025]} {...DARK} />
        </group>
      ))}
    </group>
  )
}

export function SofaModel({ width, depth, height }) {
  const seat = 0.42
  const arm = 0.16
  const fabric = { color: '#57534e', roughness: 0.95, metalness: 0 }
  const cushions = width > 1.8 ? 3 : 2
  const inner = width - arm * 2
  return (
    <group>
      <Box position={[0, 0.2, 0]} size={[width, 0.3, depth]} {...fabric} />
      <Box position={[0, (height + 0.3) / 2, -depth / 2 + 0.1]} size={[width, height - 0.3, 0.2]} {...fabric} />
      {[-1, 1].map((side) => (
        <Box key={side} position={[side * (width / 2 - arm / 2), 0.2 + (seat + 0.16) / 2, 0]} size={[arm, seat + 0.16, depth]} {...fabric} />
      ))}
      {Array.from({ length: cushions }, (_, index) => {
        const x = -inner / 2 + (inner * (index + 0.5)) / cushions
        return (
          <group key={index}>
            <Box position={[x, seat, 0.08]} size={[inner / cushions - 0.02, 0.14, depth - 0.24]} color="#6b6660" roughness={0.95} />
            <Box position={[x, seat + 0.26, -depth / 2 + 0.24]} size={[inner / cushions - 0.03, 0.36, 0.14]} color="#6b6660" roughness={0.95} rotation={[-0.14, 0, 0]} />
          </group>
        )
      })}
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Box key={`${sx}${sz}`} position={[sx * (width / 2 - 0.08), 0.025, sz * (depth / 2 - 0.08)]} size={[0.05, 0.05, 0.05]} {...DARK} />))}
    </group>
  )
}

export function ToiletModel({ width, depth, height }) {
  const bowl = 0.4
  return (
    <group>
      <Box position={[0, bowl / 2, -depth * 0.12]} size={[width * 0.55, bowl, depth * 0.42]} {...WHITE} />
      <Cyl position={[0, bowl * 0.62, depth * 0.14]} size={[width * 0.92, bowl * 0.76]} {...WHITE} />
      <Cyl position={[0, bowl + 0.012, depth * 0.14]} size={[width * 0.96, 0.03]} color="#fafaf9" roughness={0.3} />
      <Cyl position={[0, bowl + 0.03, depth * 0.14]} size={[width * 0.6, 0.006]} color="#d6d3d1" roughness={0.3} />
      <Box position={[0, (bowl + height) / 2 + 0.03, -depth / 2 + 0.1]} size={[width * 0.95, height - bowl - 0.06, 0.19]} {...WHITE} />
      <Box position={[0, height - 0.02, -depth / 2 + 0.1]} size={[width, 0.03, 0.21]} color="#fafaf9" roughness={0.3} />
      <Cyl position={[0, height, -depth / 2 + 0.1]} size={[0.045, 0.012]} {...CHROME} />
    </group>
  )
}

export function BasinModel({ width, depth, height }) {
  return (
    <group>
      <Box position={[0, (height - 0.16) / 2, -depth * 0.12]} size={[0.16, height - 0.16, 0.18]} {...WHITE} />
      <Box position={[0, height - 0.08, 0]} size={[width, 0.16, depth]} {...WHITE} />
      <Box position={[0, height - 0.005, 0.03]} size={[width - 0.1, 0.012, depth - 0.14]} color="#d9dde0" roughness={0.15} metalness={0.1} />
      <Cyl position={[0, height + 0.06, -depth / 2 + 0.06]} size={[0.03, 0.12]} {...CHROME} />
      <Box position={[0, height + 0.11, -depth / 2 + 0.11]} size={[0.025, 0.02, 0.12]} {...CHROME} />
      <Box position={[0, height + 0.62, -depth / 2 + 0.012]} size={[width * 0.9, 0.6, 0.015]} color="#c7dbe6" roughness={0.05} metalness={0.6} />
    </group>
  )
}

// Zidni bojler: visi leđima uz zid, cevi silaze ka podu.
export function WaterHeaterModel({ width, depth, height }) {
  const tank = Math.min(1, height * 0.55)
  const centerY = height - tank / 2
  return (
    <group>
      <Cyl position={[0, centerY, 0]} size={[Math.min(width, depth), tank]} {...WHITE} />
      <Cyl position={[0, height - tank - 0.01, 0]} size={[Math.min(width, depth) * 0.96, 0.03]} color="#d6d3d1" roughness={0.4} />
      <Box position={[0, centerY - tank * 0.2, depth / 2 - 0.015]} size={[0.12, 0.07, 0.03]} color="#27272a" roughness={0.4} />
      <Cyl position={[0.04, centerY - tank * 0.2, depth / 2 + 0.004]} size={[0.02, 0.008]} axis="z" color="#f97316" roughness={0.3} extra={{ emissive: '#f97316', emissiveIntensity: 0.8 }} shadow={false} />
      <Cyl position={[-0.08, (height - tank) / 2 + 0.25, -0.05]} size={[0.022, height - tank - 0.5]} color="#2563eb" roughness={0.3} metalness={0.5} />
      <Cyl position={[0.08, (height - tank) / 2 + 0.25, -0.05]} size={[0.022, height - tank - 0.5]} color="#dc2626" roughness={0.3} metalness={0.5} />
    </group>
  )
}

export function BoilerModel({ width, depth, height }) {
  return (
    <group>
      <Box position={[0, 0.04, 0]} size={[width, 0.08, depth]} {...DARK} />
      <Box position={[0, 0.08 + (height - 0.08) / 2, 0]} size={[width - 0.03, height - 0.08, depth - 0.03]} color="#8b1c1c" roughness={0.5} metalness={0.3} />
      <Box position={[0, height * 0.62, depth / 2 - 0.008]} size={[width * 0.62, height * 0.3, 0.02]} color="#27272a" roughness={0.5} metalness={0.4} />
      <Box position={[0, height * 0.28, depth / 2 - 0.008]} size={[width * 0.62, height * 0.2, 0.02]} color="#27272a" roughness={0.5} metalness={0.4} />
      <Box position={[width * 0.24, height * 0.62, depth / 2 + 0.01]} size={[0.025, 0.12, 0.03]} {...CHROME} />
      <Box position={[0, height - 0.08, depth / 2 - 0.006]} size={[width * 0.5, 0.08, 0.02]} color="#111827" roughness={0.3} />
      <Cyl position={[width * 0.12, height - 0.08, depth / 2 + 0.006]} size={[0.04, 0.01]} axis="z" {...WHITE} />
      <Cyl position={[0, height + 0.4, -depth * 0.22]} size={[0.16, 0.8]} color="#9ca3af" roughness={0.3} metalness={0.8} />
      <Cyl position={[-width * 0.3, height + 0.2, depth * 0.2]} size={[0.03, 0.4]} color="#b45309" roughness={0.3} metalness={0.7} />
      <Cyl position={[width * 0.3, height + 0.2, depth * 0.2]} size={[0.03, 0.4]} color="#b45309" roughness={0.3} metalness={0.7} />
    </group>
  )
}

export function StoveModel({ width, depth, height }) {
  const legs = 0.14
  const body = height - legs
  return (
    <group>
      <Box position={[0, 0.006, 0.08]} size={[width + 0.3, 0.012, depth + 0.45]} color="#6b7280" roughness={0.4} metalness={0.7} />
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Box key={`${sx}${sz}`} position={[sx * (width / 2 - 0.05), legs / 2, sz * (depth / 2 - 0.05)]} size={[0.05, legs, 0.05]} color="#111316" roughness={0.6} metalness={0.5} />))}
      <Box position={[0, legs + body / 2, 0]} size={[width, body, depth]} color="#1c1c1e" roughness={0.7} metalness={0.5} />
      <Box position={[0, height + 0.01, 0]} size={[width + 0.04, 0.03, depth + 0.04]} color="#111316" roughness={0.6} metalness={0.5} />
      <Box position={[0, legs + body * 0.58, depth / 2 + 0.006]} size={[width * 0.7, body * 0.5, 0.02]} color="#111316" roughness={0.5} metalness={0.5} />
      <Box position={[0, legs + body * 0.58, depth / 2 + 0.018]} size={[width * 0.52, body * 0.34, 0.004]} color="#fb923c" roughness={0.2} extra={{ emissive: '#ea580c', emissiveIntensity: 1.1 }} shadow={false} />
      <Box position={[width * 0.3, legs + body * 0.58, depth / 2 + 0.03]} size={[0.02, 0.1, 0.03]} {...CHROME} />
      <Box position={[0, legs + body * 0.14, depth / 2 + 0.008]} size={[width * 0.5, body * 0.1, 0.016]} color="#27272a" roughness={0.5} metalness={0.5} />
      <Cyl position={[0, height + 0.6, -depth * 0.2]} size={[0.13, 1.2]} color="#3f3f46" roughness={0.45} metalness={0.7} />
    </group>
  )
}
