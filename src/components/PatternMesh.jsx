import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { createTileCanvas } from '../patterns'

const materials = new Map()

export function PatternMesh({ position, size, spec, u = 0, v = 0, rotation }) {
  const [width, height, depth] = size
  const geometry = useMemo(() => meterBox(width, height, depth, u, v), [width, height, depth, u, v])
  useEffect(() => () => geometry.dispose(), [geometry])
  const material = useMemo(() => patternMaterial(spec), [spec])

  return (
    <mesh
      position={position}
      rotation={rotation}
      geometry={geometry}
      material={material}
      castShadow
      receiveShadow
    />
  )
}

export function patternMaterial(spec) {
  const cached = materials.get(spec.id)
  if (cached) return cached
  const map = new THREE.CanvasTexture(createTileCanvas(spec))
  map.wrapS = THREE.RepeatWrapping
  map.wrapT = THREE.RepeatWrapping
  map.repeat.set(1 / spec.tile[0], 1 / spec.tile[1])
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 8
  const material = new THREE.MeshStandardMaterial({
    map,
    roughness: spec.roughness,
    metalness: spec.metalness,
  })
  materials.set(spec.id, material)
  return material
}

function meterBox(width, height, depth, offsetU, offsetV) {
  const geometry = new THREE.BoxGeometry(width, height, depth)
  const uv = geometry.attributes.uv
  const perFace = uv.count / 6
  const faces = [
    [depth, height, 0, offsetV],
    [depth, height, 0, offsetV],
    [width, depth, offsetU, 0],
    [width, depth, offsetU, 0],
    [width, height, offsetU, offsetV],
    [width, height, offsetU, offsetV],
  ]
  for (let face = 0; face < faces.length; face += 1) {
    const [spanU, spanV, originU, originV] = faces[face]
    for (let vertex = 0; vertex < perFace; vertex += 1) {
      const index = face * perFace + vertex
      uv.setXY(index, uv.getX(index) * spanU + originU, uv.getY(index) * spanV + originV)
    }
  }
  uv.needsUpdate = true
  return geometry
}
