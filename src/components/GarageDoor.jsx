import { hingeCount } from '../estimate'
import { PatternMesh } from './PatternMesh'

export function GarageDoor({ door, material }) {
  if (door.style === 'none') return null
  if (door.style === 'roller') return <RollerDoor door={door} material={material} />
  if (door.style === 'double') {
    const leafWidth = door.width / 2 - 0.012
    return (
      <group>
        <DoorLeaf
          hinge="left"
          hingeX={door.along - door.width / 2}
          width={leafWidth}
          height={door.height}
          open={door.open}
          material={material}
          wicket={door.wicket}
        />
        <DoorLeaf
          hinge="right"
          hingeX={door.along + door.width / 2}
          width={leafWidth}
          height={door.height}
          open={door.open}
          material={material}
          wicket={false}
        />
      </group>
    )
  }
  return (
    <DoorLeaf
      hinge="left"
      hingeX={door.along - door.width / 2}
      width={door.width}
      height={door.height}
      open={door.open}
      material={material}
      wicket={door.wicket}
    />
  )
}

function DoorLeaf({ hinge, hingeX, width, height, open, material, wicket }) {
  const outward = (hinge === 'left' ? 1 : -1) * open * 1.15
  const centerX = hinge === 'left' ? width / 2 : -width / 2
  const thickness = 0.065
  const wicketWidth = Math.min(0.9, width - 0.28)
  const wicketHeight = Math.min(2, height - 0.16)
  const showWicket = wicket && wicketWidth >= 0.72
  const wicketCenter = hinge === 'left' ? 0.18 + wicketWidth / 2 : -(0.18 + wicketWidth / 2)

  return (
    <group position={[hingeX, 0, 0]} rotation={[0, outward, 0]}>
      <PatternMesh position={[centerX, height / 2, -0.05]} size={[width, height, thickness]} spec={material} />
      <Hinges hinge={hinge} height={height} thickness={thickness} />
      <mesh position={[hinge === 'left' ? width - 0.07 : -width + 0.07, height * 0.48, -thickness / 2 - 0.02]} castShadow>
        <boxGeometry args={[0.03, 0.28, 0.04]} />
        <meshStandardMaterial color="#2c3136" roughness={0.35} metalness={0.55} />
      </mesh>
      {showWicket && (
        <Wicket x={wicketCenter} width={wicketWidth} height={wicketHeight} depth={thickness} material={material} />
      )}
    </group>
  )
}

function Hinges({ hinge, height, thickness }) {
  const count = hingeCount(height)
  const spots = count === 3 ? [0.12, 0.5, 0.88] : [0.16, 0.84]
  const x = hinge === 'left' ? 0.03 : -0.03
  return spots.map((spot) => (
    <mesh key={spot} position={[x, height * spot, -thickness / 2 - 0.012]} castShadow>
      <boxGeometry args={[0.05, 0.11, 0.028]} />
      <meshStandardMaterial color="#1c2124" roughness={0.35} metalness={0.65} />
    </mesh>
  ))
}

function RollerDoor({ door, material }) {
  const travel = door.height
  const visible = travel * (1 - door.open)
  const bottom = travel * door.open
  const curtainWidth = Math.max(0.4, door.width - 0.08)
  const guide = door.width / 2
  return (
    <group>
      <mesh position={[door.along, door.height + 0.02, -0.1]} castShadow>
        <boxGeometry args={[door.width + 0.16, 0.28, 0.3]} />
        <meshStandardMaterial color="#2a2f33" roughness={0.42} metalness={0.5} />
      </mesh>
      {[-guide, guide].map((offset) => (
        <mesh key={offset} position={[door.along + offset, door.height / 2, -0.06]} castShadow>
          <boxGeometry args={[0.055, door.height, 0.08]} />
          <meshStandardMaterial color="#24282b" roughness={0.4} metalness={0.55} />
        </mesh>
      ))}
      {visible > 0.04 && (
        <PatternMesh
          position={[door.along, bottom + visible / 2, -0.06]}
          size={[curtainWidth, visible, 0.045]}
          spec={material}
        />
      )}
    </group>
  )
}

function Wicket({ x, width, height, depth, material }) {
  const frame = 0.045
  return (
    <group position={[x, height / 2 + 0.04, -depth / 2 - 0.01]}>
      <PatternMesh position={[0, 0, 0]} size={[width, height, 0.03]} spec={material} />
      <mesh position={[0, height / 2 - 0.28, -0.02]}>
        <boxGeometry args={[width - frame * 2, 0.32, 0.012]} />
        <meshStandardMaterial color="#b7d4e4" transparent opacity={0.55} roughness={0.08} metalness={0.1} />
      </mesh>
      <mesh position={[width / 2 - 0.08, -0.05, -0.03]} castShadow>
        <boxGeometry args={[0.025, 0.16, 0.035]} />
        <meshStandardMaterial color="#1f2428" roughness={0.3} metalness={0.6} />
      </mesh>
    </group>
  )
}
