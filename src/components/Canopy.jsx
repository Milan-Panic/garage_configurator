import { useMemo } from 'react'
import { FLOOR_LEVEL } from '../config'
import { canopySpan } from '../buildings'
import { wallFrame } from '../layout'

const SLOPE = 0.09
const POST = 0.08
const POST_SPACING = 3

// Laka nadstrešnica uz zid: krov pada od zida, spolja je drže stubovi.
export function Canopy({ canopy, dimensions, material }) {
  const shape = useMemo(() => {
    const wall = wallFrame(canopy.wall, dimensions)
    const length = canopySpan(canopy, dimensions)
    const outward = [-wall.normal[0], -wall.normal[2]]
    const top = dimensions.height - 0.08
    const low = top - canopy.depth * Math.tan(SLOPE)
    const bays = Math.max(1, Math.ceil(length / POST_SPACING))
    const posts = Array.from({ length: bays + 1 }, (_, index) => -length / 2 + POST / 2 + ((length - POST) * index) / bays)
    return {
      position: [wall.origin[0] + outward[0] * (wall.thickness / 2), FLOOR_LEVEL, wall.origin[2] + outward[1] * (wall.thickness / 2)],
      rotation: Math.atan2(outward[0], outward[1]),
      length,
      top,
      low,
      posts,
    }
  }, [canopy, dimensions])
  const slopeLength = canopy.depth / Math.cos(SLOPE)

  return (
    <group position={shape.position} rotation={[0, shape.rotation, 0]}>
      <mesh position={[0, (shape.top + shape.low) / 2, canopy.depth / 2]} rotation={[SLOPE, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[shape.length + 0.1, 0.05, slopeLength + 0.1]} />
        <meshStandardMaterial color={material?.color ?? '#3a4044'} roughness={0.45} metalness={0.55} />
      </mesh>
      <mesh position={[0, shape.low - 0.08, canopy.depth - POST / 2]} castShadow>
        <boxGeometry args={[shape.length, 0.1, POST]} />
        <meshStandardMaterial color="#33363a" roughness={0.5} metalness={0.5} />
      </mesh>
      {shape.posts.map((x) => (
        <mesh key={x} position={[x, (shape.low - 0.08) / 2, canopy.depth - POST / 2]} castShadow>
          <boxGeometry args={[POST, shape.low - 0.08, POST]} />
          <meshStandardMaterial color="#33363a" roughness={0.5} metalness={0.5} />
        </mesh>
      ))}
    </group>
  )
}
