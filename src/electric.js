// Raspored električne instalacije. Isti raspored crta 3D prikaz i broji računica,
// pa se broj prekidača i dužina kanalica ne razilaze.
import { FLOOR_LEVEL, PANEL_THICKNESS, ROOF_THICKNESS } from './config'
import { WALL_IDS, wallFrame } from './layout'
import { roofGeometry } from './roof'
import { roomBox } from './rooms'
import { openingsByWall, wallLength } from './structure'

export const SOCKET_HEIGHT = 1.15
export const SWITCH_HEIGHT = 1.1
const BOARD_HEIGHT = 1.5
const CORNER_MARGIN = 0.35
const SOLAR_PANEL = { width: 1.13, length: 1.76, kw: 0.45 }

function wallPoint(wall, u, y, offset = 0) {
  const reach = wall.thickness / 2 + offset
  return [wall.origin[0] + wall.axis[0] * u + wall.normal[0] * reach, FLOOR_LEVEL + y, wall.origin[2] + wall.axis[2] * u + wall.normal[2] * reach]
}

// Slobodni delovi zida na datoj visini, između otvora.
function freeIntervals(span, openings, y, pad = 0.2) {
  let parts = [[-span / 2 + CORNER_MARGIN, span / 2 - CORNER_MARGIN]]
  openings
    .filter((opening) => opening.sill - 0.15 < y && opening.sill + opening.height + 0.15 > y)
    .forEach((opening) => {
      const low = opening.along - opening.width / 2 - pad
      const high = opening.along + opening.width / 2 + pad
      parts = parts.flatMap(([a, b]) => {
        if (high <= a || low >= b) return [[a, b]]
        const next = []
        if (low - a > 0.25) next.push([a, low])
        if (b - high > 0.25) next.push([high, b])
        return next
      })
    })
  return parts
}

function innerSpan(id, dimensions) {
  return wallLength(id, dimensions) - PANEL_THICKNESS * 2
}

export function electricLayout(scene) {
  const { dimensions, electric } = scene
  const empty = { lights: [], sockets: [], switches: [], board: null, power: null, charger: null, conduits: [], conduitLength: 0 }
  if (!electric?.enabled) return empty
  const geometry = roofGeometry(dimensions, scene.roof)
  const openings = openingsByWall(scene)
  const walls = Object.fromEntries(WALL_IDS.map((id) => [id, wallFrame(id, dimensions)]))
  const rooms = scene.rooms || []
  const { width, length, height } = dimensions
  const runLevel = Math.min(height - 0.18, 2.45)
  const conduits = []

  // Prekidač, tabla, trofazna utičnica i punjač stoje u nizu uz ulaz.
  const pedestrian = (scene.pedestrianDoors || [])[0]
  const doorWall = scene.door?.style !== 'none' ? scene.door.wall : null
  const anchorWall = pedestrian?.wall ?? ['left', 'right', 'back', 'front'].find((id) => id !== doorWall) ?? 'left'
  const anchorSpan = innerSpan(anchorWall, dimensions)
  const anchorFree = freeIntervals(anchorSpan, openings[anchorWall], BOARD_HEIGHT, 0.15)
  const chain = []
  if (anchorFree.length) {
    // Najbliži slobodan deo zida uz pešačka vrata; bez njih, kraj zida prema prednjoj strani.
    const frontEnd = anchorWall === 'left' ? -1 : 1
    const wanted = pedestrian ? pedestrian.along + pedestrian.width / 2 + 0.2 : frontEnd * (anchorSpan / 2 - CORNER_MARGIN)
    const distanceTo = ([low, high]) => (wanted < low ? low - wanted : wanted > high ? wanted - high : 0)
    const interval = anchorFree.reduce((best, part) => (distanceTo(part) < distanceTo(best) ? part : best))
    const start = Math.min(Math.max(wanted, interval[0]), interval[1])
    const direction = interval[1] - start >= start - interval[0] ? 1 : -1
    const room = direction === 1 ? interval[1] - start : start - interval[0]
    const step = Math.min(0.5, room / 3)
    for (let index = 0; index < 4; index += 1) chain.push(start + direction * step * index)
  }
  const wall = walls[anchorWall]
  const chainPoint = (index, y, offset) => wallPoint(wall, chain[index], y, offset)
  const switches = []
  let board = null
  let power = null
  let charger = null
  if (chain.length) {
    switches.push({ wall: anchorWall, position: chainPoint(0, SWITCH_HEIGHT, 0.012) })
    board = { wall: anchorWall, position: chainPoint(1, BOARD_HEIGHT, 0.05), phase: electric.phase }
    if (electric.phase === 'three') power = { wall: anchorWall, position: chainPoint(2, SOCKET_HEIGHT, 0.03) }
    if (electric.charger !== 'none') charger = { wall: anchorWall, position: chainPoint(3, 1.25, 0.06), ready: electric.charger === 'ready' }
    conduits.push({ a: chainPoint(1, BOARD_HEIGHT + 0.2, 0.012), b: chainPoint(1, runLevel, 0.012) })
    conduits.push({ a: chainPoint(0, SWITCH_HEIGHT + 0.05, 0.012), b: chainPoint(0, runLevel, 0.012) })
    if (power) conduits.push({ a: chainPoint(2, SOCKET_HEIGHT + 0.07, 0.012), b: chainPoint(2, runLevel, 0.012) })
    if (charger) conduits.push({ a: chainPoint(3, 1.45, 0.012), b: chainPoint(3, runLevel, 0.012) })
  }
  ;(scene.pedestrianDoors || []).slice(1).forEach((item) => {
    const span = innerSpan(item.wall, dimensions)
    const u = Math.min(span / 2 - 0.2, item.along + item.width / 2 + 0.2)
    switches.push({ wall: item.wall, position: wallPoint(walls[item.wall], u, SWITCH_HEIGHT, 0.012) })
    conduits.push({ a: wallPoint(walls[item.wall], u, SWITCH_HEIGHT + 0.05, 0.012), b: wallPoint(walls[item.wall], u, runLevel, 0.012) })
  })

  // Utičnice ravnomerno po slobodnom obimu.
  const stretches = []
  WALL_IDS.forEach((id) => {
    freeIntervals(innerSpan(id, dimensions), openings[id], SOCKET_HEIGHT).forEach(([a, b]) => {
      let parts = [[a, b]]
      if (id === anchorWall && chain.length) {
        const low = Math.min(chain[0], chain[3]) - 0.3
        const high = Math.max(chain[0], chain[3]) + 0.3
        parts = parts.flatMap(([p0, p1]) => {
          if (high <= p0 || low >= p1) return [[p0, p1]]
          const next = []
          if (low - p0 > 0.25) next.push([p0, low])
          if (p1 - high > 0.25) next.push([high, p1])
          return next
        })
      }
      parts.forEach(([p0, p1]) => stretches.push({ id, a: p0, b: p1 }))
    })
  })
  const total = stretches.reduce((sum, part) => sum + (part.b - part.a), 0)
  const sockets = []
  if (total > 0) {
    for (let index = 0; index < electric.sockets; index += 1) {
      let at = ((index + 0.5) / electric.sockets) * total
      const part = stretches.find((entry) => {
        if (at <= entry.b - entry.a) return true
        at -= entry.b - entry.a
        return false
      })
      if (!part) continue
      const u = part.a + at
      sockets.push({ wall: part.id, u, position: wallPoint(walls[part.id], u, SOCKET_HEIGHT, 0.02) })
      conduits.push({ a: wallPoint(walls[part.id], u, SOCKET_HEIGHT + 0.05, 0.012), b: wallPoint(walls[part.id], u, runLevel, 0.012) })
    }
  }

  // Vodoravna kanalica po zidu, prekinuta tamo gde je otvor viši od nje.
  WALL_IDS.forEach((id) => {
    const marks = [
      ...sockets.filter((item) => item.wall === id).map((item) => item.u),
      ...(id === anchorWall ? chain.slice(0, charger ? 4 : power ? 3 : 2) : []),
    ]
    if (marks.length < 2) return
    const low = Math.min(...marks)
    const high = Math.max(...marks)
    let parts = [[low, high]]
    openings[id]
      .filter((opening) => opening.sill < runLevel && opening.sill + opening.height > runLevel - 0.05)
      .forEach((opening) => {
        const a = opening.along - opening.width / 2 - 0.1
        const b = opening.along + opening.width / 2 + 0.1
        parts = parts.flatMap(([p0, p1]) => {
          if (b <= p0 || a >= p1) return [[p0, p1]]
          const next = []
          if (a - p0 > 0.1) next.push([p0, a])
          if (p1 - b > 0.1) next.push([b, p1])
          return next
        })
      })
    parts.forEach(([p0, p1]) => conduits.push({ a: wallPoint(walls[id], p0, runLevel, 0.012), b: wallPoint(walls[id], p1, runLevel, 0.012) }))
  })

  // Svetiljke: po jedna u svaku prostoriju, ostale u mrežu pod krovom.
  const lights = []
  const inRooms = Math.min(rooms.length, Math.max(0, electric.lights - 1))
  rooms.slice(0, inRooms).forEach((room) => {
    const box = roomBox(room, dimensions)
    lights.push({ position: [box.centerX, FLOOR_LEVEL + box.height - 0.05, box.centerZ], length: Math.min(1.2, Math.max(0.5, room.depth - 0.5)), room: true })
  })
  const open = electric.lights - inRooms
  const columns = Math.max(1, Math.min(open, Math.round(Math.sqrt((open * width) / length))))
  const rows = Math.ceil(open / columns)
  const tube = Math.min(1.2, Math.max(0.6, length / rows - 0.6))
  let placed = 0
  for (let row = 0; row < rows; row += 1) {
    const inRow = Math.min(columns, open - placed)
    const z = -length / 2 + (length * (row + 0.5)) / rows
    const xs = []
    for (let column = 0; column < inRow; column += 1) {
      const x = -width / 2 + (width * (column + 0.5)) / inRow
      xs.push(x)
      lights.push({ position: [x, geometry.underside(x, z) - 0.14, z], length: tube })
      placed += 1
    }
    if (xs.length > 1) {
      const first = xs[0]
      const last = xs[xs.length - 1]
      conduits.push({ a: [first, geometry.underside(first, z) - 0.09, z], b: [last, geometry.underside(last, z) - 0.09, z] })
    }
  }

  const conduitLength = conduits.reduce((sum, part) => sum + Math.hypot(part.b[0] - part.a[0], part.b[1] - part.a[1], part.b[2] - part.a[2]), 0)
  return { lights, sockets, switches, board, power, charger, conduits, conduitLength }
}

// Solarni paneli po krovnim ravnima. Vraća sredine panela i ose za postavljanje.
export function solarLayout(dimensions, roof, kilowatts) {
  const wanted = Math.ceil((Number(kilowatts) || 0) / SOLAR_PANEL.kw)
  if (wanted <= 0) return { panels: [], wanted: 0, size: SOLAR_PANEL }
  const geometry = roofGeometry(dimensions, roof)
  const margin = geometry.overhang + 0.3
  const gap = 0.03
  const panels = []
  geometry.planes.forEach((plane) => {
    if (panels.length >= wanted) return
    const [c0, c1, , c3] = plane.corners
    const u = [c1.x - c0.x, c1.y - c0.y, c1.z - c0.z]
    const v = [c3.x - c0.x, c3.y - c0.y, c3.z - c0.z]
    const lengthU = Math.hypot(...u)
    const lengthV = Math.hypot(...v)
    const unitU = u.map((value) => value / lengthU)
    const unitV = v.map((value) => value / lengthV)
    let normal = [unitU[1] * unitV[2] - unitU[2] * unitV[1], unitU[2] * unitV[0] - unitU[0] * unitV[2], unitU[0] * unitV[1] - unitU[1] * unitV[0]]
    if (normal[1] < 0) normal = normal.map((value) => -value)
    const fit = (alongU, alongV) => ({
      alongU,
      alongV,
      countU: Math.max(0, Math.floor((lengthU - margin * 2 + gap) / (alongU + gap))),
      countV: Math.max(0, Math.floor((lengthV - margin * 2 + gap) / (alongV + gap))),
    })
    const options = [fit(SOLAR_PANEL.width, SOLAR_PANEL.length), fit(SOLAR_PANEL.length, SOLAR_PANEL.width)]
    const best = options[0].countU * options[0].countV >= options[1].countU * options[1].countV ? options[0] : options[1]
    const startU = (lengthU - (best.countU * (best.alongU + gap) - gap)) / 2
    const startV = (lengthV - (best.countV * (best.alongV + gap) - gap)) / 2
    const raise = ROOF_THICKNESS + 0.07
    for (let row = 0; row < best.countV && panels.length < wanted; row += 1) {
      for (let column = 0; column < best.countU && panels.length < wanted; column += 1) {
        const du = startU + column * (best.alongU + gap) + best.alongU / 2
        const dv = startV + row * (best.alongV + gap) + best.alongV / 2
        panels.push({
          position: [0, 1, 2].map((axis) => [c0.x, c0.y, c0.z][axis] + unitU[axis] * du + unitV[axis] * dv + normal[axis] * raise),
          unitU,
          normal,
          size: [best.alongU, best.alongV],
        })
      }
    }
  })
  return { panels, wanted, size: SOLAR_PANEL }
}
