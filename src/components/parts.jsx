import * as THREE from 'three'

// Svi kvadri i valjci u sceni dele po jednu geometriju, a materijali se
// keširaju po boji. Bez toga svaki deo nameštaja pravi svoj bafer na GPU.
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1)
const UNIT_CYLINDER = new THREE.CylinderGeometry(0.5, 0.5, 1, 20)
const materials = new Map()

export function paint(color, roughness = 0.6, metalness = 0.04, extra) {
  const key = `${color}|${roughness}|${metalness}|${extra ? JSON.stringify(extra) : ''}`
  let material = materials.get(key)
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra })
    materials.set(key, material)
  }
  return material
}

export function Box({ position, size, color, roughness, metalness, rotation, extra, shadow = true }) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      scale={size}
      geometry={UNIT_BOX}
      material={paint(color, roughness, metalness, extra)}
      castShadow={shadow}
      receiveShadow={shadow}
    />
  )
}

// Valjak po Y osi: size je [prečnik, visina]. axis: 'x' ili 'z' ga polaže.
export function Cyl({ position, size, color, roughness, metalness, axis = 'y', extra, shadow = true }) {
  const rotation = axis === 'x' ? [0, 0, Math.PI / 2] : axis === 'z' ? [Math.PI / 2, 0, 0] : undefined
  return (
    <mesh
      position={position}
      rotation={rotation}
      scale={[size[0], size[1], size[0]]}
      geometry={UNIT_CYLINDER}
      material={paint(color, roughness, metalness, extra)}
      castShadow={shadow}
      receiveShadow={shadow}
    />
  )
}

// Greda između dve tačke, za kose delove.
export function Bar({ from, to, thickness = 0.04, color, roughness, metalness }) {
  const a = new THREE.Vector3(...from)
  const b = new THREE.Vector3(...to)
  const direction = b.clone().sub(a)
  const length = direction.length()
  if (length < 0.01) return null
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.normalize())
  const size = Array.isArray(thickness) ? thickness : [thickness, thickness]
  return (
    <mesh
      position={a.add(b).multiplyScalar(0.5)}
      quaternion={quaternion}
      scale={[size[0], size[1], length]}
      geometry={UNIT_BOX}
      material={paint(color, roughness, metalness)}
      castShadow
    />
  )
}
