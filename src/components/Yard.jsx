import { Sky } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { Box, Cyl, paint } from './parts'

const LEAF = new THREE.IcosahedronGeometry(1, 1)
const CONE = new THREE.ConeGeometry(1, 1, 9)
const HEAD = new THREE.SphereGeometry(0.5, 14, 10)

function hash(seed) {
  const value = Math.sin(seed * 127.1) * 43758.5453
  return value - Math.floor(value)
}

function Tree({ position, size = 1, pine = false, tone = 0 }) {
  const green = ['#4f7a3a', '#5d8a41', '#446b33', '#6a9648'][tone % 4]
  return (
    <group position={position} scale={size}>
      <Cyl position={[0, 1.1, 0]} size={[0.3, 2.2]} color="#6b4f35" roughness={0.9} />
      {pine ? (
        [0, 1, 2].map((tier) => (
          <mesh key={tier} geometry={CONE} material={paint(green, 0.9, 0)} position={[0, 2.4 + tier * 1.25, 0]} scale={[1.9 - tier * 0.45, 2.1, 1.9 - tier * 0.45]} castShadow />
        ))
      ) : (
        <>
          <mesh geometry={LEAF} material={paint(green, 0.95, 0)} position={[0, 3.6, 0]} scale={[1.9, 1.7, 1.9]} castShadow />
          <mesh geometry={LEAF} material={paint(green, 0.95, 0)} position={[0.9, 3, 0.4]} scale={1.2} castShadow />
          <mesh geometry={LEAF} material={paint(green, 0.95, 0)} position={[-0.8, 3.1, -0.5]} scale={1.3} castShadow />
        </>
      )}
    </group>
  )
}

// Čovek od 1,75 m, da se vidi razmera.
function Person({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-1, 1].map((side) => (
        <Cyl key={side} position={[side * 0.1, 0.42, 0]} size={[0.15, 0.84]} color="#2f3a4a" roughness={0.9} />
      ))}
      <Box position={[0, 1.14, 0]} size={[0.44, 0.6, 0.24]} color="#b9502e" roughness={0.9} />
      {[-1, 1].map((side) => (
        <Cyl key={side} position={[side * 0.27, 1.1, 0]} size={[0.11, 0.62]} color="#b9502e" roughness={0.9} />
      ))}
      <mesh geometry={HEAD} material={paint('#d9a983', 0.8, 0)} position={[0, 1.61, 0]} scale={0.25} castShadow />
    </group>
  )
}

function House({ position, rotation = 0 }) {
  const roof = useMemo(() => {
    const outline = new THREE.Shape()
    outline.moveTo(-4.6, 0)
    outline.lineTo(4.6, 0)
    outline.lineTo(0, 2.8)
    outline.closePath()
    return new THREE.ExtrudeGeometry(outline, { depth: 10.6, bevelEnabled: false })
  }, [])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box position={[0, 1.6, 0]} size={[8, 3.2, 10]} color="#e9e2d2" roughness={0.9} />
      <mesh geometry={roof} material={paint('#8b4a36', 0.85, 0)} position={[0, 3.2, -5.3]} castShadow />
      {[-3, 0, 3].map((z) => (
        <Box key={z} position={[-4.01, 1.7, z]} size={[0.04, 1.2, 1.1]} color="#33414d" roughness={0.2} metalness={0.4} />
      ))}
      <Box position={[-4.01, 1.05, -1.5]} size={[0.05, 2.1, 0.95]} color="#5b4334" roughness={0.7} />
      <Box position={[1.8, 6.2, 1]} size={[0.6, 1.4, 0.6]} color="#a3553f" roughness={0.9} />
    </group>
  )
}

// Dvorište oko objekta: nebo, travnjak, prilaz, drveće, ograda, kuća i čovek.
export function Yard({ width, length, offsetX = 0, doorWall = 'front' }) {
  const reach = Math.max(width, length)
  const side = width / 2 + 5
  const back = -length / 2 - 5
  const trees = useMemo(() => {
    const list = []
    for (let index = 0; index < 9; index += 1) {
      const angle = Math.PI * (0.55 + (index / 8) * 0.9) + (hash(index + 3) - 0.5) * 0.25
      const radius = reach * 0.85 + 7 + hash(index + 11) * 9
      list.push({ position: [offsetX + Math.cos(angle) * radius * 1.15, 0, -Math.sin(angle) * radius - 2], size: 0.9 + hash(index + 5) * 0.7, pine: index % 3 === 1, tone: index })
    }
    list.push({ position: [offsetX - side - 5, 0, length / 2 + 6], size: 1.1, pine: false, tone: 1 })
    list.push({ position: [offsetX + side + 9, 0, length / 2 + 9], size: 1.25, pine: true, tone: 2 })
    return list
  }, [reach, side, length, offsetX])
  const fence = useMemo(() => {
    const count = Math.ceil((length + 16) / 2.2)
    return Array.from({ length: count + 1 }, (_, index) => length / 2 + 9 - index * 2.2)
  }, [length])
  const drive = doorWall === 'back' ? { z: -length / 2 - 8, rotation: 0 } : { z: length / 2 + 9, rotation: 0 }
  const fenceX = offsetX - side - 2.2

  return (
    <group>
      <Sky distance={170} sunPosition={[16, 22, 10]} turbidity={5} rayleigh={0.9} mieCoefficient={0.004} mieDirectionalG={0.8} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[offsetX, -0.02, 0]} receiveShadow>
        <circleGeometry args={[84, 48]} />
        <meshStandardMaterial color="#7f9d5c" roughness={1} />
      </mesh>
      {Array.from({ length: 26 }, (_, index) => (
        <mesh key={index} rotation={[-Math.PI / 2, 0, 0]} position={[offsetX + (hash(index) - 0.5) * 70, -0.012 + (index % 5) * 0.001, (hash(index + 40) - 0.5) * 70]}>
          <circleGeometry args={[2 + hash(index + 80) * 5, 18]} />
          <meshStandardMaterial color={index % 2 ? '#76955a' : '#89a765'} roughness={1} />
        </mesh>
      ))}
      {(doorWall === 'front' || doorWall === 'back') && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[offsetX, 0.004, drive.z]} receiveShadow>
          <planeGeometry args={[Math.min(Math.max(3.2, width * 0.8), 7), 16]} />
          <meshStandardMaterial color="#b7b0a2" roughness={0.98} />
        </mesh>
      )}
      {trees.map((tree, index) => (
        <Tree key={index} {...tree} />
      ))}
      {fence.map((z) => (
        <Box key={z} position={[fenceX, 0.6, z]} size={[0.09, 1.2, 0.09]} color="#8a6a4a" roughness={0.9} />
      ))}
      {[0.4, 0.95].map((level) => (
        <Box key={level} position={[fenceX, level, (fence[0] + fence[fence.length - 1]) / 2]} size={[0.04, 0.12, fence[0] - fence[fence.length - 1]]} color="#9b7a57" roughness={0.9} />
      ))}
      <Box position={[offsetX, 0.55, back - 6]} size={[reach + 22, 1.1, 0.9]} color="#4c7339" roughness={1} />
      <House position={[offsetX + side + 13, 0, back - 2]} />
      <Person position={[offsetX + Math.min(width / 2 + 1.1, 4.5), 0, length / 2 + 2.4]} rotation={-0.5} />
    </group>
  )
}
