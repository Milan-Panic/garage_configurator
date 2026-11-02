import { hingeCount } from '../estimate'
import { PatternMesh } from './PatternMesh'

const steel = { color: '#2a2f33', roughness: 0.4, metalness: 0.6 }

export function GarageDoor({ door, material, wallHeight = door.height + 0.3 }) {
  if (door.style === 'none') return null
  if (door.style === 'roller') return <RollerDoor door={door} material={material} />
  if (door.style === 'sectional') {
    return (
      <>
        <DoorFrame door={door} />
        <SectionalDoor door={door} material={material} wallHeight={wallHeight} />
      </>
    )
  }
  if (door.style === 'tilt') {
    return (
      <>
        <DoorFrame door={door} />
        <TiltDoor door={door} material={material} />
      </>
    )
  }
  if (door.style === 'double') {
    const leafWidth = door.width / 2 - 0.012
    return (
      <group>
        <DoorFrame door={door} />
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
    <>
      <DoorFrame door={door} />
      <DoorLeaf
        hinge="left"
        hingeX={door.along - door.width / 2}
        width={door.width}
        height={door.height}
        open={door.open}
        material={material}
        wicket={door.wicket}
      />
    </>
  )
}

// Štok oko otvora, sa spoljne strane zida (−z je napolje).
function DoorFrame({ door }) {
  const bar = 0.06
  const z = -0.065
  return (
    <group>
      <mesh position={[door.along, door.height + bar / 2, z]} castShadow>
        <boxGeometry args={[door.width + bar * 2, bar, 0.03]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[door.along + side * (door.width / 2 + bar / 2), door.height / 2, z]} castShadow>
          <boxGeometry args={[bar, door.height, 0.03]} />
          <meshStandardMaterial {...steel} />
        </mesh>
      ))}
    </group>
  )
}

// Paneli idu uz vertikalnu vođicu, pa se lome i klize pod plafon (+z je unutra).
function SectionalDoor({ door, material, wallHeight }) {
  const height = door.height
  const count = Math.max(4, Math.round(height / 0.52))
  const panel = height / count
  const z0 = 0.03
  const lift = Math.min(0.12, Math.max(0.04, wallHeight - height - 0.06))
  const ceiling = height + lift
  const travel = door.open * height
  const railLength = height + 0.35
  const panels = Array.from({ length: count }, (_, index) => {
    const s = index * panel + panel / 2 + travel
    if (s <= height) return { index, position: [door.along, s, z0], rotation: [0, 0, 0] }
    return { index, position: [door.along, ceiling, z0 + (s - height)], rotation: [Math.PI / 2, 0, 0] }
  })
  return (
    <group>
      {panels.map((item) => (
        <PatternMesh
          key={item.index}
          position={item.position}
          rotation={item.rotation}
          size={[door.width - 0.02, panel - 0.008, 0.042]}
          spec={material}
          v={item.index * panel}
        />
      ))}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[door.along + side * (door.width / 2 + 0.02), height / 2, z0 + 0.05]}>
            <boxGeometry args={[0.04, height, 0.05]} />
            <meshStandardMaterial color="#9aa0a4" roughness={0.35} metalness={0.7} />
          </mesh>
          <mesh position={[door.along + side * (door.width / 2 + 0.02), ceiling + 0.03, z0 + railLength / 2]}>
            <boxGeometry args={[0.04, 0.05, railLength]} />
            <meshStandardMaterial color="#9aa0a4" roughness={0.35} metalness={0.7} />
          </mesh>
        </group>
      ))}
      <mesh position={[door.along, ceiling + 0.02, z0 + 0.09]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, door.width, 10]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      {door.motor && (
        <group>
          <mesh position={[door.along, ceiling + 0.02, z0 + railLength / 2]}>
            <boxGeometry args={[0.06, 0.04, railLength]} />
            <meshStandardMaterial color="#5c6166" roughness={0.4} metalness={0.5} />
          </mesh>
          <mesh position={[door.along, ceiling - 0.04, z0 + railLength + 0.12]} castShadow>
            <boxGeometry args={[0.3, 0.14, 0.36]} />
            <meshStandardMaterial color="#e7e5e1" roughness={0.6} metalness={0.05} />
          </mesh>
        </group>
      )}
    </group>
  )
}

// Kipno krilo: obrtna tačka na trećini visine putuje do vrha, krilo legne pod plafon.
function TiltDoor({ door, material }) {
  const height = door.height
  const pivot = height * 0.34
  const angle = door.open * (Math.PI / 2)
  const pivotY = pivot + (height - pivot) * Math.sin(angle)
  return (
    <group position={[door.along, pivotY, 0.02]} rotation={[angle, 0, 0]}>
      <PatternMesh position={[0, height / 2 - pivot, 0]} size={[door.width - 0.02, height - 0.01, 0.05]} spec={material} />
      <mesh position={[0, -pivot + 0.2, -0.04]} castShadow>
        <boxGeometry args={[0.2, 0.03, 0.04]} />
        <meshStandardMaterial {...steel} />
      </mesh>
    </group>
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
