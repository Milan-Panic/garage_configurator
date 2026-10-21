import { Grid } from '@react-three/drei'
import { FLOOR_LEVEL } from '../config'

export function Ground({ width, length, onClear }) {
  const apronFront = 2
  const apronBack = 0.7
  const apronSide = 0.7
  const padWidth = width + apronSide * 2
  const padLength = length + apronFront + apronBack
  const padZ = (apronFront - apronBack) / 2
  const yard = Math.max(width, length) + 18

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onPointerDown={(event) => {
          event.stopPropagation()
          onClear?.()
        }}
      >
        <planeGeometry args={[yard, yard]} />
        <meshStandardMaterial color="#c4bba8" roughness={1} metalness={0} />
      </mesh>
      <Grid
        position={[0, 0.004, 0]}
        args={[yard, yard]}
        cellSize={1}
        cellThickness={0.6}
        cellColor="#b3aa98"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#9c9484"
        fadeDistance={yard * 0.7}
        fadeStrength={1.4}
        infiniteGrid={false}
        raycast={() => null}
      />
      <mesh position={[0, -0.04, padZ]} receiveShadow>
        <boxGeometry args={[padWidth + 0.5, 0.16, padLength + 0.5]} />
        <meshStandardMaterial color="#8a8a86" roughness={0.96} metalness={0.02} />
      </mesh>
      <mesh
        position={[0, FLOOR_LEVEL / 2, padZ]}
        receiveShadow
        onPointerDown={(event) => {
          event.stopPropagation()
          onClear?.()
        }}
      >
        <boxGeometry args={[padWidth, FLOOR_LEVEL, padLength]} />
        <meshStandardMaterial color="#e3e0d9" roughness={0.9} metalness={0.02} />
      </mesh>
    </group>
  )
}
