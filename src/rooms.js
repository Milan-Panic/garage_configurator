// Male prostorije u uglu objekta: dva zida su spoljni, dva su pregradni panel.
import { FLOOR_LEVEL, PANEL_THICKNESS } from './config'

export const ROOM_KINDS = [
  { id: 'kancelarija', name: 'Kancelarija', detail: 'Sto, papiri, grejan kutak', width: 2.6, depth: 2.6 },
  { id: 'ostava', name: 'Ostava', detail: 'Zaključan prostor za alat i robu', width: 2, depth: 2.2 },
  { id: 'wc', name: 'WC', detail: 'Šolja i lavabo', width: 1.3, depth: 1.8, tiled: true },
  { id: 'kotlarnica', name: 'Kotlarnica', detail: 'Kotao, bojler i razvod grejanja', width: 1.8, depth: 2.2, tiled: true },
]

export const ROOM_CORNERS = [
  { id: 'back-left', name: 'Pozadi levo', sx: -1, sz: -1 },
  { id: 'back-right', name: 'Pozadi desno', sx: 1, sz: -1 },
  { id: 'front-left', name: 'Napred levo', sx: -1, sz: 1 },
  { id: 'front-right', name: 'Napred desno', sx: 1, sz: 1 },
]

export const ROOM_DOOR_SIDES = [
  { id: 'depth', name: 'Ka sredini, po dužini', detail: 'Vrata na pregradi koja gleda napred ili nazad' },
  { id: 'side', name: 'Ka sredini, bočno', detail: 'Vrata na pregradi koja gleda levo ili desno' },
]

export const ROOM_MIN = 1
export const ROOM_MAX = 6
export const ROOM_HEIGHT = 2.5
export const PARTITION = 0.06
export const ROOM_DOOR = { width: 0.8, height: 2 }
export const MAX_ROOMS = 4

export function roomKind(id) {
  return ROOM_KINDS.find((entry) => entry.id === id) ?? ROOM_KINDS[0]
}

function cornerOf(id) {
  return ROOM_CORNERS.find((entry) => entry.id === id) ?? ROOM_CORNERS[0]
}

function round(value) {
  return Math.round(value * 100) / 100
}

function innerSize(dimensions) {
  return {
    width: dimensions.width - PANEL_THICKNESS * 2,
    length: dimensions.length - PANEL_THICKNESS * 2,
  }
}

export function roomLimits(dimensions) {
  const inner = innerSize(dimensions)
  return {
    width: { min: ROOM_MIN, max: Math.max(ROOM_MIN, Math.min(ROOM_MAX, round(inner.width - 1))), step: 0.05 },
    depth: { min: ROOM_MIN, max: Math.max(ROOM_MIN, Math.min(ROOM_MAX, round(inner.length - 1))), step: 0.05 },
  }
}

// Tlocrt prostorije u koordinatama objekta, zajedno sa pregradama i vratima.
export function roomBox(room, dimensions) {
  const corner = cornerOf(room.corner)
  const inner = innerSize(dimensions)
  const wallX = corner.sx * (inner.width / 2)
  const wallZ = corner.sz * (inner.length / 2)
  const edgeX = wallX - corner.sx * room.width
  const edgeZ = wallZ - corner.sz * room.depth
  const height = Math.min(ROOM_HEIGHT, dimensions.height - 0.05)
  const doorWidth = Math.min(ROOM_DOOR.width, (room.doorSide === 'side' ? room.depth : room.width) - 0.3)
  const doorHeight = Math.min(ROOM_DOOR.height, height - 0.1)
  return {
    sx: corner.sx,
    sz: corner.sz,
    x0: Math.min(wallX, edgeX),
    x1: Math.max(wallX, edgeX),
    z0: Math.min(wallZ, edgeZ),
    z1: Math.max(wallZ, edgeZ),
    edgeX,
    edgeZ,
    centerX: (wallX + edgeX) / 2,
    centerZ: (wallZ + edgeZ) / 2,
    height,
    floor: FLOOR_LEVEL,
    doorWidth,
    doorHeight,
  }
}

function overlap(a, b) {
  return Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.02 && Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0) > 0.02
}

export function normalizeRooms(raw, dimensions) {
  const limits = roomLimits(dimensions)
  const clamp = (value, fallback, { min, max }) => {
    const number = Number(value)
    return round(Math.min(max, Math.max(min, Number.isFinite(number) ? number : fallback)))
  }
  const rooms = []
  const corners = new Set()
  ;(Array.isArray(raw) ? raw : []).forEach((item, index) => {
    if (!item || typeof item !== 'object' || rooms.length >= MAX_ROOMS) return
    const kind = roomKind(item.kind)
    const corner = cornerOf(item.corner)
    if (corners.has(corner.id)) return
    corners.add(corner.id)
    const offset = Number(item.doorOffset)
    const room = {
      id: typeof item.id === 'string' && item.id ? item.id : `room-${index + 1}`,
      kind: kind.id,
      corner: corner.id,
      width: clamp(item.width, kind.width, limits.width),
      depth: clamp(item.depth, kind.depth, limits.depth),
      doorSide: item.doorSide === 'side' ? 'side' : 'depth',
      doorOffset: Number.isFinite(offset) ? Math.min(0.85, Math.max(0.15, Math.round(offset * 100) / 100)) : 0.5,
      loft: Boolean(item.loft),
    }
    // Kasnija prostorija se skuplja dok ne prestane da ulazi u raniju.
    rooms.forEach((other) => {
      const taken = roomBox(other, dimensions)
      if (!overlap(roomBox(room, dimensions), taken)) return
      const inner = innerSize(dimensions)
      const freeWidth = Math.max(ROOM_MIN, round(inner.width - other.width - 0.1))
      const freeDepth = Math.max(ROOM_MIN, round(inner.length - other.depth - 0.1))
      const mine = cornerOf(room.corner)
      const theirs = cornerOf(other.corner)
      const shrinkWidth = mine.sz === theirs.sz || (mine.sx !== theirs.sx && room.width - freeWidth <= room.depth - freeDepth)
      if (shrinkWidth) room.width = Math.min(room.width, freeWidth)
      else room.depth = Math.min(room.depth, freeDepth)
    })
    rooms.push(room)
  })
  return rooms
}

export function freeCorner(rooms) {
  return ROOM_CORNERS.find((corner) => !rooms.some((room) => room.corner === corner.id))?.id ?? null
}

// Da li prostorija zaklanja otvor na spoljnom zidu (vrata), u metrima po osi zida.
export function roomBlocksOpening(room, dimensions, opening) {
  if (!opening || !Number.isFinite(opening.width)) return false
  const box = roomBox(room, dimensions)
  const wall = opening.wall || 'front'
  const onWall =
    (wall === 'front' && box.sz === 1) || (wall === 'back' && box.sz === -1) || (wall === 'left' && box.sx === -1) || (wall === 'right' && box.sx === 1)
  if (!onWall) return false
  const along = opening.along || 0
  // Osa zida: front ide ka −x, back ka +x, left ka −z, right ka +z.
  const center = wall === 'front' ? -along : wall === 'back' ? along : wall === 'left' ? -along : along
  const [low, high] = wall === 'front' || wall === 'back' ? [box.x0, box.x1] : [box.z0, box.z1]
  return center + opening.width / 2 > low + 0.02 && center - opening.width / 2 < high - 0.02
}
