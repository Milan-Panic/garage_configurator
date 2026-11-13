import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { FLOOR_LEVEL } from '../config'
import { canopyShift, canopySpan } from '../buildings'
import { wallFrame } from '../layout'
import { PatternMesh } from './PatternMesh'
import { Box, paint } from './parts'

const SLOPE = 0.09
const POST = 0.08
const POST_SPACING = 3
const FRAME = { color: '#33363a', roughness: 0.5, metalness: 0.5 }

// Laka nadstrešnica uz zid: krov pada od zida, spolja je drže stubovi.
// Zatvorena varijanta dobija tri zida i vrata, pa postaje aneks.
export function Canopy({ canopy, dimensions, material, wallMaterial }) {
  const shape = useMemo(() => {
    const wall = wallFrame(canopy.wall, dimensions)
    const length = canopySpan(canopy, dimensions)
    const shift = canopyShift(canopy, dimensions)
    const outward = [-wall.normal[0], -wall.normal[2]]
    const top = dimensions.height - 0.08
    const low = top - canopy.depth * Math.tan(SLOPE)
    const bays = Math.max(1, Math.ceil(length / POST_SPACING))
    const posts = Array.from({ length: bays + 1 }, (_, index) => -length / 2 + POST / 2 + ((length - POST) * index) / bays)
    return {
      position: [
        wall.origin[0] + outward[0] * (wall.thickness / 2) + wall.axis[0] * shift,
        FLOOR_LEVEL,
        wall.origin[2] + outward[1] * (wall.thickness / 2) + wall.axis[2] * shift,
      ],
      rotation: Math.atan2(outward[0], outward[1]),
      length,
      top,
      low,
      posts,
    }
  }, [canopy, dimensions])
  const slopeLength = canopy.depth / Math.cos(SLOPE)
  // Bočni zid aneksa je trapez: viši uz objekat, niži spolja.
  const gable = useMemo(() => {
    if (!canopy.closed) return null
    const outline = new THREE.Shape()
    outline.moveTo(0, 0)
    outline.lineTo(canopy.depth - 0.02, 0)
    outline.lineTo(canopy.depth - 0.02, shape.low - 0.03)
    outline.lineTo(0, shape.top - 0.03)
    outline.closePath()
    return new THREE.ExtrudeGeometry(outline, { depth: 0.06, bevelEnabled: false })
  }, [canopy.closed, canopy.depth, shape.low, shape.top])
  useEffect(() => () => gable?.dispose(), [gable])
  const wallColor = wallMaterial?.color ?? '#3a4044'

  return (
    <group position={shape.position} rotation={[0, shape.rotation, 0]}>
      <mesh position={[0, (shape.top + shape.low) / 2, canopy.depth / 2]} rotation={[SLOPE, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[shape.length + 0.1, 0.05, slopeLength + 0.1]} />
        <meshStandardMaterial color={material?.color ?? '#3a4044'} roughness={0.45} metalness={0.55} />
      </mesh>
      <Box position={[0, shape.low - 0.08, canopy.depth - POST / 2]} size={[shape.length, 0.1, POST]} {...FRAME} />
      {shape.posts.map((x) => (
        <Box key={x} position={[x, (shape.low - 0.08) / 2, canopy.depth - POST / 2]} size={[POST, shape.low - 0.08, POST]} {...FRAME} />
      ))}
      {canopy.closed && wallMaterial && (
        <>
          <PatternMesh position={[0, (shape.low - 0.13) / 2, canopy.depth - 0.03]} size={[shape.length, shape.low - 0.13, 0.06]} spec={wallMaterial} />
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              geometry={gable}
              material={paint(wallColor, wallMaterial.roughness, wallMaterial.metalness)}
              position={[side * (shape.length / 2 - 0.03) + 0.03, 0, 0]}
              rotation={[0, -Math.PI / 2, 0]}
              castShadow
              receiveShadow
            />
          ))}
          <Box position={[Math.min(shape.length / 2 - 0.8, 0), 1.0, canopy.depth + 0.005]} size={[0.9, 2, 0.03]} color="#f1eee8" roughness={0.55} />
          <Box position={[Math.min(shape.length / 2 - 0.8, 0) + 0.34, 1.0, canopy.depth + 0.025]} size={[0.03, 0.14, 0.03]} color="#1f2428" roughness={0.35} metalness={0.6} />
        </>
      )}
    </group>
  )
}
