import { FLOOR_LEVEL } from '../config'
import { frontOpening } from '../layout'
import { PatternMesh } from './PatternMesh'

export function GarageDoor({ dimensions, material, door }) {
  if (door.style === 'none') return null
  const opening = frontOpening(dimensions)
  const leafWidth = door.style === 'double' ? opening.width / 2 - 0.012 : opening.width
  const leafHeight = Math.max(1.4, opening.height - 0.04)
  const shared = {
    height: leafHeight,
    width: leafWidth,
    open: door.open,
    z: opening.z,
    material,
  }

  if (door.style === 'double') {
    return (
      <group>
        <DoorLeaf {...shared} hinge="left" hingeX={-opening.width / 2} wicket={door.wicket} />
        <DoorLeaf {...shared} hinge="right" hingeX={opening.width / 2} wicket={false} />
      </group>
    )
  }

  return <DoorLeaf {...shared} hinge="left" hingeX={-opening.width / 2} wicket={door.wicket} />
}

function DoorLeaf({ hinge, hingeX, width, height, open, z, material, wicket }) {
  const rotation = (hinge === 'left' ? -1 : 1) * open * 1.15
  const centerX = hinge === 'left' ? width / 2 : -width / 2
  const thickness = 0.065
  const wicketWidth = Math.min(0.9, width - 0.28)
  const wicketHeight = Math.min(2.02, height - 0.16)
  const showWicket = wicket && wicketWidth >= 0.72
  const wicketCenter = hinge === 'left' ? 0.18 + wicketWidth / 2 : -(0.18 + wicketWidth / 2)

  return (
    <group position={[hingeX, FLOOR_LEVEL, z]} rotation={[0, rotation, 0]}>
      <PatternMesh
        position={[centerX, height / 2, 0]}
        size={[width, height, thickness]}
        spec={material}
      />
      <mesh
        position={[hinge === 'left' ? width - 0.07 : -width + 0.07, height * 0.48, thickness / 2 + 0.02]}
        castShadow
      >
        <boxGeometry args={[0.03, 0.28, 0.04]} />
        <meshStandardMaterial color="#2c3136" roughness={0.35} metalness={0.55} />
      </mesh>
      {showWicket && (
        <Wicket x={wicketCenter} width={wicketWidth} height={wicketHeight} depth={thickness} material={material} />
      )}
    </group>
  )
}

function Wicket({ x, width, height, depth, material }) {
  const frame = 0.045
  return (
    <group position={[x, height / 2 + 0.04, depth / 2 + 0.01]}>
      <PatternMesh position={[0, 0, 0]} size={[width, height, 0.03]} spec={material} />
      <mesh position={[0, height / 2 - 0.28, 0.02]}>
        <boxGeometry args={[width - frame * 2, 0.32, 0.012]} />
        <meshStandardMaterial color="#b7d4e4" transparent opacity={0.55} roughness={0.08} metalness={0.1} />
      </mesh>
      <mesh position={[width / 2 - 0.08, -0.05, 0.03]} castShadow>
        <boxGeometry args={[0.025, 0.16, 0.035]} />
        <meshStandardMaterial color="#1f2428" roughness={0.3} metalness={0.6} />
      </mesh>
    </group>
  )
}
