import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { ROOF_THICKNESS } from '../config'
import { roofGeometry } from '../roof'
import { patternMaterial } from './PatternMesh'

const fascia = new THREE.MeshStandardMaterial({ color: '#2c3136', roughness: 0.45, metalness: 0.45 })
const gutterMaterial = new THREE.MeshStandardMaterial({ color: '#9aa0a4', roughness: 0.35, metalness: 0.65 })

export function Roof({ dimensions, roof, wallMaterial, roofMaterial, gutters = true }) {
  const model = useMemo(() => roofGeometry(dimensions, roof), [dimensions, roof])

  return (
    <group>
      {model.planes.map((slab) => (
        <RoofSlab key={slab.corners.map((corner) => `${corner.x}:${corner.z}`).join('|')} corners={slab.corners} spec={roofMaterial} />
      ))}
      {model.caps.map((cap) => (
        <WallCap key={cap.points.map((point) => `${point.x}:${point.y}:${point.z}`).join('|')} cap={cap} spec={wallMaterial} />
      ))}
      {model.planes.flatMap((slab) =>
        slab.drips.map((edge) => (
          <EaveBoard key={`${edge[0]}-${edge[1]}-${slab.corners[0].x}`} a={slab.corners[edge[0]]} b={slab.corners[edge[1]]} />
        )),
      )}
      {gutters &&
        model.planes.flatMap((slab) =>
          slab.drips.map((edge) => (
            <GutterRun key={`gutter-${edge[0]}-${edge[1]}-${slab.corners[0].x}`} a={slab.corners[edge[0]]} b={slab.corners[edge[1]]} />
          )),
        )}
      {roof.kind === 'duo' && <RidgeCap dimensions={dimensions} model={model} />}
    </group>
  )
}

function RoofSlab({ corners, spec }) {
  const key = JSON.stringify(corners)
  const geometry = useMemo(() => roofPrism(JSON.parse(key), ROOF_THICKNESS), [key])
  useEffect(() => () => geometry.dispose(), [geometry])
  const material = useMemo(() => {
    const next = patternMaterial(spec).clone()
    next.side = THREE.DoubleSide
    return next
  }, [spec])
  useEffect(() => () => material.dispose(), [material])
  return <mesh geometry={geometry} material={material} castShadow receiveShadow />
}

function WallCap({ cap, spec }) {
  const key = JSON.stringify(cap)
  const geometry = useMemo(() => {
    const parsed = JSON.parse(key)
    return extrudePolygon(parsed.points, parsed.inward, parsed.thickness)
  }, [key])
  useEffect(() => () => geometry.dispose(), [geometry])
  const material = useMemo(() => {
    const next = patternMaterial(spec).clone()
    next.side = THREE.DoubleSide
    return next
  }, [spec])
  useEffect(() => () => material.dispose(), [material])
  return <mesh geometry={geometry} material={material} castShadow receiveShadow />
}

function GutterRun({ a, b }) {
  const start = new THREE.Vector3(a.x, a.y, a.z)
  const end = new THREE.Vector3(b.x, b.y, b.z)
  const length = start.distanceTo(end)
  if (length < 0.05) return null
  const mid = start.clone().add(end).multiplyScalar(0.5)
  const yaw = Math.atan2(end.x - start.x, end.z - start.z)
  const outward = new THREE.Vector3(end.z - start.z, 0, start.x - end.x)
  if (outward.lengthSq() < 1e-6) return null
  outward.normalize().multiplyScalar(0.12)
  const center = mid.clone().add(outward)
  const drop = end.clone().add(outward)
  const dropHeight = Math.max(0.4, drop.y)
  return (
    <group>
      <mesh position={[center.x, center.y - 0.1, center.z]} rotation={[0, yaw, 0]} material={gutterMaterial} castShadow>
        <boxGeometry args={[0.14, 0.08, length]} />
      </mesh>
      <mesh position={[drop.x, dropHeight / 2, drop.z]} material={gutterMaterial} castShadow>
        <boxGeometry args={[0.07, dropHeight, 0.07]} />
      </mesh>
    </group>
  )
}

function EaveBoard({ a, b }) {
  const start = new THREE.Vector3(a.x, a.y, a.z)
  const end = new THREE.Vector3(b.x, b.y, b.z)
  const length = start.distanceTo(end)
  const mid = start.clone().add(end).multiplyScalar(0.5)
  const yaw = Math.atan2(end.x - start.x, end.z - start.z)
  if (length < 0.05) return null
  return (
    <mesh position={[mid.x, mid.y - 0.05, mid.z]} rotation={[0, yaw, 0]} material={fascia} castShadow>
      <boxGeometry args={[0.03, 0.1, length]} />
    </mesh>
  )
}

function RidgeCap({ dimensions, model }) {
  const along = model.roof.ridge === 'length' ? dimensions.length : dimensions.width
  const length = along + model.overhang * 2
  const y = model.underside(0, 0) + ROOF_THICKNESS * Math.cos(model.radians ?? 0) + 0.02
  const rotation = model.roof.ridge === 'length' ? 0 : Math.PI / 2
  return (
    <mesh position={[0, y, 0]} rotation={[0, rotation, 0]} material={fascia} castShadow>
      <boxGeometry args={[0.18, 0.05, length]} />
    </mesh>
  )
}

function roofPrism(corners, thickness) {
  const base = corners.map((corner) => new THREE.Vector3(corner.x, corner.y, corner.z))
  const normal = new THREE.Vector3().crossVectors(base[1].clone().sub(base[0]), base[3].clone().sub(base[0])).normalize()
  if (normal.y < 0) normal.negate()
  const top = base.map((point) => point.clone().addScaledVector(normal, thickness))
  const vertices = [...base, ...top]
  const uAxis = base[1].clone().sub(base[0])
  const uSpan = uAxis.length() || 1
  uAxis.multiplyScalar(1 / uSpan)
  const vAxis = base[3].clone().sub(base[0])
  const vSpan = vAxis.length() || 1
  vAxis.multiplyScalar(1 / vSpan)
  const positions = []
  const uvs = []
  vertices.forEach((point) => {
    positions.push(point.x, point.y, point.z)
    const delta = point.clone().sub(base[0])
    uvs.push(delta.dot(uAxis), delta.dot(vAxis))
  })
  const indices = [
    4, 5, 6, 4, 6, 7, 0, 2, 1, 0, 3, 2, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7,
  ]
  return geometryFrom(positions, uvs, indices)
}

function extrudePolygon(points, inward, depth) {
  const outer = points.map((point) => new THREE.Vector3(point.x, point.y, point.z))
  const offset = new THREE.Vector3(...inward).multiplyScalar(depth)
  const inner = outer.map((point) => point.clone().add(offset))
  const positions = []
  const uvs = []
  const origin = outer[0]
  const uAxis = outer[Math.min(1, outer.length - 1)].clone().sub(origin).normalize()
  ;[...outer, ...inner].forEach((point) => {
    positions.push(point.x, point.y, point.z)
    uvs.push(point.clone().sub(origin).dot(uAxis), point.y - origin.y)
  })
  const count = outer.length
  const indices = []
  if (count === 3) {
    indices.push(0, 1, 2, 5, 4, 3)
  } else {
    indices.push(0, 1, 2, 0, 2, 3, 6, 5, 4, 7, 6, 4)
  }
  for (let index = 0; index < count; index += 1) {
    const next = (index + 1) % count
    indices.push(index, next, count + next, index, count + next, count + index)
  }
  return geometryFrom(positions, uvs, indices)
}

function geometryFrom(positions, uvs, indices) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
