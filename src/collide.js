// Sudari predmeta na podu. Sve stoji pod pravim uglom, pa je dovoljan
// pravougaonik u tlocrtu.
import { PARTITION, roomBox } from './rooms'

const GAP = 0.02
const LIFTS = new Set(['lift2', 'lift4'])
// Predmeti koji vise na zidu ili su dovoljno mali da stoje uz druge.
const SOFT = new Set(['extinguisher', 'pegboard', 'waterheater', 'ladder'])

function footprint(x, z, width, depth, rotation) {
  const turned = Math.abs(Math.sin(rotation || 0)) > 0.5
  const halfX = (turned ? depth : width) / 2
  const halfZ = (turned ? width : depth) / 2
  return { x0: x - halfX, x1: x + halfX, z0: z - halfZ, z1: z + halfZ }
}

export function furnitureRect(item) {
  return footprint(item.x, item.z, item.width, item.depth, item.rotation)
}

export function carRect(car) {
  return footprint(car.x, car.z, car.width, car.length, car.rotation)
}

function overlaps(a, b) {
  return Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > GAP && Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0) > GAP
}

// Pregrade prostorija kao tanki pravougaonici, sa prolazom na mestu vrata.
export function partitionRects(scene) {
  const rects = []
  ;(scene.rooms || []).forEach((room) => {
    const box = roomBox(room, scene.dimensions)
    const onDepth = room.doorSide !== 'side'
    const span = onDepth ? [box.x0, box.x1] : [box.z0, box.z1]
    const reach = Math.max(0, span[1] - span[0] - box.doorWidth - 0.24)
    const center = span[0] + 0.12 + box.doorWidth / 2 + reach * room.doorOffset
    const gap = [center - box.doorWidth / 2, center + box.doorWidth / 2]
    const zLine = [Math.min(box.edgeZ, box.edgeZ + box.sz * PARTITION), Math.max(box.edgeZ, box.edgeZ + box.sz * PARTITION)]
    const xLine = [Math.min(box.edgeX, box.edgeX + box.sx * PARTITION), Math.max(box.edgeX, box.edgeX + box.sx * PARTITION)]
    const pieces = (low, high, open) => (open ? [[low, gap[0]], [gap[1], high]] : [[low, high]]).filter(([a, b]) => b - a > 0.02)
    pieces(box.x0, box.x1, onDepth).forEach(([a, b]) => rects.push({ x0: a, x1: b, z0: zLine[0], z1: zLine[1], room: room.id }))
    pieces(box.z0, box.z1, !onDepth).forEach(([a, b]) => rects.push({ x0: xLine[0], x1: xLine[1], z0: a, z1: b, room: room.id }))
  })
  return rects
}

function obstaclesFor(scene, skip) {
  const list = []
  ;(scene.furniture || []).forEach((item) => {
    if (skip.kind === 'furniture' && skip.id === item.id) return
    list.push({ rect: furnitureRect(item), kind: 'furniture', id: item.id, type: item.type })
  })
  if (scene.car && skip.kind !== 'car') list.push({ rect: carRect(scene.car), kind: 'car', id: 'car' })
  partitionRects(scene).forEach((rect) => list.push({ rect, kind: 'partition', id: rect.room }))
  return list
}

function blocked(subject, rect, obstacles) {
  return obstacles.some((other) => {
    if (subject.kind === 'car' && LIFTS.has(other.type)) return false
    if (subject.kind === 'furniture' && LIFTS.has(subject.type) && other.kind === 'car') return false
    if (subject.kind === 'furniture' && SOFT.has(subject.type) && other.kind !== 'partition') return false
    if (other.kind === 'furniture' && SOFT.has(other.type)) return false
    return overlaps(rect, other.rect)
  })
}

// Novi položaj predmeta: ako bi ušao u nešto, klizi po jednoj osi ili ostaje gde je bio.
export function settleFurniture(scene, previous, next) {
  if (previous.x === next.x && previous.z === next.z && previous.rotation === next.rotation && previous.width === next.width && previous.depth === next.depth) return next
  const subject = { kind: 'furniture', id: next.id, type: next.type }
  const obstacles = obstaclesFor(scene, subject)
  if (!blocked(subject, furnitureRect(next), obstacles)) return next
  // Predmet koji je već bio u sudaru sme slobodno da se izvuče.
  if (blocked(subject, furnitureRect(previous), obstacles)) return next
  const slideX = { ...next, z: previous.z }
  if (!blocked(subject, furnitureRect(slideX), obstacles)) return slideX
  const slideZ = { ...next, x: previous.x }
  if (!blocked(subject, furnitureRect(slideZ), obstacles)) return slideZ
  return previous
}

export function settleCar(scene, previous, next) {
  if (!previous) return next
  const subject = { kind: 'car', id: 'car' }
  const obstacles = obstaclesFor(scene, subject)
  if (!blocked(subject, carRect(next), obstacles)) return next
  if (blocked(subject, carRect(previous), obstacles)) return next
  const slideX = { ...next, z: previous.z }
  if (!blocked(subject, carRect(slideX), obstacles)) return slideX
  const slideZ = { ...next, x: previous.x }
  if (!blocked(subject, carRect(slideZ), obstacles)) return slideZ
  return previous
}

// Šta je trenutno u sudaru, za crveno obeležavanje i upozorenje.
export function findCollisions(scene) {
  const hits = new Set()
  ;(scene.furniture || []).forEach((item) => {
    const subject = { kind: 'furniture', id: item.id, type: item.type }
    if (blocked(subject, furnitureRect(item), obstaclesFor(scene, subject))) hits.add(item.id)
  })
  if (scene.car && blocked({ kind: 'car', id: 'car' }, carRect(scene.car), obstaclesFor(scene, { kind: 'car' }))) hits.add('car')
  return hits
}
