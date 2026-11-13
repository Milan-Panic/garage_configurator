// Čelični skelet na jednom mestu. Računica i 3D prikaz čitaju isti model,
// pa se broj stubova, rogova i ukrućenja ne može razići.
import { FLOOR_LEVEL } from './config'
import { wallFrame } from './layout'
import { roofGeometry } from './roof'
import { snowLoad, windPressure } from './site'

export const POST_SPACING = 2
export const RAFTER_SPACING = 1.2
export const TRUSS_SPACING = 2
export const PURLIN_SPACING = 0.9
export const GIRT_SPACING = 1.2
// Preko ovog raspona kutijasti rog više nije dovoljan.
export const RAFTER_SPAN_LIMIT = 6
export const TRUSS_SPAN_LIMIT = 12

const WALLS = ['front', 'back', 'left', 'right']
const INSET = 0.05
const JAMB = 0.05
const MERGE = 0.3
const MIN_BRACE_BAY = 0.9
const STEEL_E = 210000
const STRESS_LIMIT = 160
const DEAD_LOAD = 0.25
const SOLAR_LOAD = 0.15

// Kutijasti profili za rogove: I u cm⁴ i W u cm³ oko jače ose.
const RAFTER_PROFILES = [
  { name: 'kutija 80×40×2', priceId: 'box-80x40x2', inertia: 39, modulus: 9.7 },
  { name: 'kutija 80×40×3', priceId: 'box-80x40x3', inertia: 55.9, modulus: 14 },
  { name: 'kutija 100×50×3', priceId: 'box-100x50x3', inertia: 112, modulus: 22.4 },
  { name: 'kutija 120×60×4', priceId: 'box-120x60x4', inertia: 255, modulus: 42.5 },
  { name: 'kutija 140×80×4', priceId: 'box-140x80x4', inertia: 449, modulus: 64.2 },
]

// Pojasevi rešetke: površina preseka u cm².
const CHORD_PROFILES = [
  { name: 'kutija 60×40×2', priceId: 'box-60x40x2', area: 3.74 },
  { name: 'kutija 80×40×3', priceId: 'box-80x40x3', area: 6.61 },
  { name: 'kutija 80×80×3', priceId: 'post-80x80x3', area: 9.01 },
  { name: 'kutija 100×100×3', priceId: 'post-100x100x3', area: 11.4 },
]

export function wallLength(id, dimensions) {
  return id === 'front' || id === 'back' ? dimensions.width : dimensions.length
}

export function openingsByWall(scene) {
  const map = { front: [], back: [], left: [], right: [] }
  const door = scene.door
  if (door && door.style !== 'none' && Number.isFinite(door.width)) {
    map[WALLS.includes(door.wall) ? door.wall : 'front'].push({ along: door.along || 0, width: door.width, sill: 0, height: door.height, full: true })
  }
  ;(scene.pedestrianDoors || []).forEach((item) => {
    if (map[item.wall] && Number.isFinite(item.width)) map[item.wall].push({ along: item.along || 0, width: item.width, sill: 0, height: item.height, full: true })
  })
  ;(scene.windows || []).forEach((item) => {
    if (map[item.wall] && Number.isFinite(item.width)) map[item.wall].push({ along: item.along || 0, width: item.width, sill: item.sill, height: item.height, full: false })
  })
  return map
}

// Stubovi jednog zida po osi zida: uglovi, dovratnici uz vrata i međustubovi.
// Međustub koji bi pao u prozor pomera se uz ivicu prozora.
function wallMarks(id, dimensions, roof, openings) {
  const length = wallLength(id, dimensions)
  const end = length / 2 - INSET
  const acrossRidge = id === 'front' || id === 'back' ? roof.ridge === 'length' : roof.ridge === 'width'
  const gable = roof.kind === 'duo' && acrossRidge
  const bays = Math.max(1, Math.ceil(length / POST_SPACING - 1e-9))
  const spots = []
  for (let index = 1; index < bays; index += 1) spots.push(-length / 2 + (length * index) / bays)
  if (gable && !spots.some((spot) => Math.abs(spot) < 0.12 * length)) spots.push(0)

  const marks = []
  openings
    .filter((opening) => opening.full)
    .forEach((opening) => {
      marks.push({ u: opening.along - opening.width / 2 - JAMB, role: 'dovratnik' })
      marks.push({ u: opening.along + opening.width / 2 + JAMB, role: 'dovratnik' })
    })
  spots.forEach((spot) => {
    const hit = openings.find((opening) => !opening.full && Math.abs(spot - opening.along) < opening.width / 2 + JAMB)
    const u = hit ? hit.along + (spot < hit.along ? -1 : 1) * (hit.width / 2 + JAMB) : spot
    marks.push({ u, role: 'medju' })
  })
  const inside = (u) => openings.some((opening) => Math.abs(u - opening.along) < opening.width / 2 + JAMB - 0.001)
  const kept = [
    { u: -end, role: 'ugao' },
    { u: end, role: 'ugao' },
  ]
  marks.forEach((mark) => {
    if (Math.abs(mark.u) > end - MERGE || inside(mark.u)) return
    if (kept.some((other) => Math.abs(other.u - mark.u) < MERGE)) return
    kept.push(mark)
  })
  return kept.sort((left, right) => left.u - right.u)
}

function bracedBays(marks, openings, length, extra) {
  const free = []
  for (let index = 0; index < marks.length - 1; index += 1) {
    const a = marks[index].u
    const b = marks[index + 1].u
    if (b - a < MIN_BRACE_BAY) continue
    const blocked = openings.some((opening) => opening.along - opening.width / 2 < b - 0.01 && opening.along + opening.width / 2 > a + 0.01)
    if (!blocked) free.push({ a, b })
  }
  if (free.length === 0) return []
  const want = (length <= 6 ? 1 : length <= 12 ? 2 : 3) + extra
  const picked = [free[0]]
  if (want >= 2 && free.length > 1) picked.push(free[free.length - 1])
  if (want >= 3 && free.length > 2) picked.push(free[Math.floor(free.length / 2)])
  if (want >= 4 && free.length > 4) picked.push(free[Math.floor(free.length / 4)])
  return picked
}

function subtractIntervals(a, b, holes) {
  let parts = [[a, b]]
  holes.forEach(([h0, h1]) => {
    parts = parts.flatMap(([p0, p1]) => {
      if (h1 <= p0 || h0 >= p1) return [[p0, p1]]
      const next = []
      if (h0 - p0 > 0.05) next.push([p0, h0])
      if (p1 - h1 > 0.05) next.push([h1, p1])
      return next
    })
  })
  return parts
}

// Gruba provera roga kao proste grede: napon do 160 MPa i ugib do L/200.
function sizeRafter(span, load) {
  const moment = (load * span * span) / 8
  const checks = RAFTER_PROFILES.map((profile) => {
    const stress = (moment * 1000) / profile.modulus
    const sag = (5 * load * (span * 1000) ** 4) / (384 * STEEL_E * profile.inertia * 1e4)
    const allowed = (span * 1000) / 200
    return { profile, stress, sag, allowed, use: Math.max(stress / STRESS_LIMIT, sag / allowed) }
  })
  const fit = checks.find((entry) => entry.use <= 1) ?? checks[checks.length - 1]
  return { ...fit, moment, ok: fit.use <= 1 }
}

// Rešetka: sila u pojasu je moment podeljen visinom rešetke.
function sizeTruss(span, load, depth) {
  const moment = (load * span * span) / 8
  const force = moment / depth
  const checks = CHORD_PROFILES.map((profile) => {
    // Pritisnut pojas se izvija, pa mu se dozvoljeni napon uzima sa 60%.
    const stress = (force * 10) / profile.area
    return { profile, stress, use: stress / (STRESS_LIMIT * 0.6) }
  })
  const fit = checks.find((entry) => entry.use <= 1) ?? checks[checks.length - 1]
  return { ...fit, moment, force, depth, ok: fit.use <= 1 }
}

export function structureFrame(scene) {
  const { dimensions } = scene
  const { width, length, height } = dimensions
  const geometry = roofGeometry(dimensions, scene.roof)
  const roof = geometry.roof
  const truss = Boolean(scene.roof?.truss)
  const openings = openingsByWall(scene)
  const under = (x, z) => geometry.underside(x, z)
  const wind = windPressure(scene.site)
  const snow = snowLoad(scene.site)

  const posts = []
  const seen = new Set()
  const girts = []
  const braces = []
  const headers = []
  const unbraced = []
  const girtRows = Math.max(1, Math.ceil(height / GIRT_SPACING) - 1)

  WALLS.forEach((id) => {
    const wall = wallFrame(id, dimensions)
    const span = wallLength(id, dimensions)
    const at = (u) => [wall.origin[0] + wall.axis[0] * u, wall.origin[2] + wall.axis[2] * u]
    const topAt = (u) => {
      const [x, z] = at(u)
      return under(x, z)
    }
    const point = (u, y) => {
      const [x, z] = at(u)
      return [x, y, z]
    }
    const marks = wallMarks(id, dimensions, roof, openings[id])

    marks.forEach((mark) => {
      const [x, z] = at(mark.u)
      const key = `${x.toFixed(3)}|${z.toFixed(3)}`
      if (seen.has(key)) return
      seen.add(key)
      posts.push({ x, z, height: roundCut(under(x, z) - FLOOR_LEVEL), role: mark.role, wall: id })
    })

    for (let row = 1; row <= girtRows; row += 1) {
      const level = (height * row) / (girtRows + 1)
      const holes = openings[id]
        .filter((opening) => opening.sill < level && opening.sill + opening.height > level)
        .map((opening) => [opening.along - opening.width / 2 - JAMB, opening.along + opening.width / 2 + JAMB])
      for (let index = 0; index < marks.length - 1; index += 1) {
        subtractIntervals(marks[index].u, marks[index + 1].u, holes).forEach(([a, b]) => {
          girts.push({ a: point(a, FLOOR_LEVEL + level), b: point(b, FLOOR_LEVEL + level) })
        })
      }
    }

    openings[id]
      .filter((opening) => opening.full)
      .forEach((opening) => {
        const a = Math.max(-span / 2 + INSET, opening.along - opening.width / 2 - JAMB)
        const b = Math.min(span / 2 - INSET, opening.along + opening.width / 2 + JAMB)
        const level = Math.min(FLOOR_LEVEL + opening.height + 0.04, Math.min(topAt(a), topAt(b)) - 0.1)
        headers.push({ a: point(a, level), b: point(b, level) })
      })

    const bays = bracedBays(marks, openings[id], span, wind >= 0.9 ? 1 : 0)
    if (bays.length === 0) unbraced.push(id)
    bays.forEach((bay) => {
      const mid = (bay.a + bay.b) / 2
      const [low, high] = mid <= 0 ? [bay.a, bay.b] : [bay.b, bay.a]
      braces.push({ a: point(low, FLOOR_LEVEL + 0.06), b: point(high, topAt(high) - 0.1), kind: 'zid', wall: id })
    })
  })

  // Venci po vrhu zidova.
  const corner = (sx, sz) => {
    const x = sx * (width / 2 - INSET)
    const z = sz * (length / 2 - INSET)
    return [x, under(x, z) - 0.04, z]
  }
  const ring = [corner(-1, 1), corner(1, 1), corner(1, -1), corner(-1, -1)]
  const plates = ring.map((start, index) => ({ a: start, b: ring[(index + 1) % 4] }))

  // Rogovi ili gornji pojasevi rešetki, rožnjače i krovni spregovi.
  const rafters = []
  const purlins = []
  const ties = []
  const kings = []
  const chords = []
  const webs = []
  const pitched = roof.kind !== 'flat'
  const spacing = truss ? TRUSS_SPACING : RAFTER_SPACING
  let rafterSpan = 0
  // Zidovi na koje se oslanjaju rogovi.
  let bearing = []
  let trussDepth = 0
  geometry.planes.forEach((plane) => {
    const [c0, c1, c2, c3] = plane.corners
    const extentX = Math.abs(c1.x - c0.x)
    const extentZ = Math.abs(c3.z - c0.z)
    // Dve vode: rogovi idu niz kosinu. Ravan krov i jedna voda: nosači idu preko
    // kraćeg raspona, pa kod pada po dužini sami nose lim, bez rožnjača.
    const slopeX = Math.abs(c0.y - c1.y) > 0.01
    const alongX = roof.kind === 'duo' ? slopeX : extentX <= extentZ
    const battens = truss || (pitched && alongX === slopeX)
    bearing = alongX ? ['left', 'right'] : ['front', 'back']
    const perp = alongX ? extentZ : extentX
    const run = alongX ? extentX : extentZ
    const edge = (geometry.overhang + INSET) / perp
    const count = Math.max(2, Math.ceil((perp - geometry.overhang * 2) / spacing) + 1)
    const drop = battens ? 0.09 : 0.05
    const lines = []
    for (let index = 0; index < count; index += 1) {
      const t = edge + (index / (count - 1)) * (1 - edge * 2)
      const a = alongX ? mix(c0, c3, t) : mix(c0, c1, t)
      const b = alongX ? mix(c1, c2, t) : mix(c3, c2, t)
      a[1] -= drop
      b[1] -= drop
      lines.push({ a, b })
    }
    rafters.push(...lines)
    const clear = roof.kind === 'duo' ? run - geometry.overhang : run - geometry.overhang * 2
    rafterSpan = Math.max(rafterSpan, clear)

    if (battens) {
      const slopeLength = distance(lines[0].a, lines[0].b)
      const rows = Math.ceil(slopeLength / PURLIN_SPACING) + 1
      for (let row = 0; row < rows; row += 1) {
        const s = 0.03 + (row / (rows - 1)) * 0.94
        const a = alongX ? mix(c0, c1, s) : mix(c0, c3, s)
        const b = alongX ? mix(c3, c2, s) : mix(c1, c2, s)
        a[1] -= 0.03
        b[1] -= 0.03
        purlins.push({ a, b })
      }
    }

    // Rešetka sa paralelnim pojasevima za ravan krov i jednu vodu.
    if (truss && roof.kind !== 'duo') {
      const depth = Math.min(1, Math.max(0.4, clear / 12))
      trussDepth = depth
      const inset = (geometry.overhang + INSET + 0.04) / run
      lines.forEach((line) => {
        const start = mix(line.a, line.b, inset)
        const end = mix(line.a, line.b, 1 - inset)
        const panels = Math.max(4, Math.round(distance(start, end) / (depth * 1.3) / 2) * 2)
        const top = (index) => mix(start, end, index / panels)
        const bottom = (index) => {
          const node = top(index)
          return [node[0], node[1] - depth, node[2]]
        }
        chords.push({ a: bottom(0), b: bottom(panels) })
        webs.push({ a: top(0), b: bottom(0) }, { a: top(panels), b: bottom(panels) })
        for (let index = 0; index < panels; index += 1) {
          webs.push(index % 2 === 0 ? { a: bottom(index), b: top(index + 1) } : { a: top(index), b: bottom(index + 1) })
        }
      })
    }

    const bracePairs = lines.length >= 3 ? [[0, 1], [lines.length - 1, lines.length - 2]] : [[0, 1]]
    if ((perp > 12 || wind >= 0.9) && lines.length >= 6) {
      const middle = Math.floor(lines.length / 2)
      bracePairs.push([middle, middle + 1])
    }
    bracePairs.forEach(([from, to]) => {
      braces.push({ a: lines[from].a.slice(), b: lines[to].b.slice(), kind: 'krov' })
    })
  })

  // Dvovodni krov: zatega u visini venca pravi od para rogova vezač.
  if (roof.kind === 'duo') {
    const alongLength = roof.ridge === 'length'
    const perp = alongLength ? length : width
    const half = (alongLength ? width : length) / 2 - INSET
    const count = Math.max(2, Math.ceil(perp / spacing) + 1)
    const level = geometry.y0 - 0.1
    const peak = under(0, 0) - 0.12
    trussDepth = Math.max(0.2, peak - level)
    const place = (across, y, offset) => (alongLength ? [across, y, offset] : [offset, y, across])
    for (let index = 0; index < count; index += 1) {
      const offset = -perp / 2 + INSET + ((perp - INSET * 2) * index) / (count - 1)
      ties.push({ a: place(-half, level, offset), b: place(half, level, offset) })
      const tall = peak - level > 0.25
      if (tall && (truss || half * 2 > 4)) kings.push({ a: place(0, level, offset), b: place(0, peak, offset) })
      if (truss && tall) {
        ;[-1, 1].forEach((side) => {
          const across = (side * half) / 2
          const top = alongLength ? under(across, offset) : under(offset, across)
          webs.push({ a: place(0, level, offset), b: place(across, top - 0.12, offset) })
          webs.push({ a: place(across, level, offset), b: place(across, top - 0.12, offset) })
        })
      }
    }
  }

  // Opterećenje po dužnom metru nosača i izbor preseka.
  const area = DEAD_LOAD + snow + ((scene.electric?.solar || 0) > 0 ? SOLAR_LOAD : 0)
  const load = area * spacing
  const fullSpan = roof.kind === 'duo' ? rafterSpan * 2 : rafterSpan
  const rafter = sizeRafter(rafterSpan, load)
  const chord = truss ? sizeTruss(fullSpan, load, Math.max(0.2, trussDepth)) : null
  const sizing = {
    truss,
    snow,
    wind,
    spacing,
    load,
    areaLoad: area,
    span: truss ? fullSpan : rafterSpan,
    rafter,
    chord,
    ok: truss ? chord.ok && fullSpan <= TRUSS_SPAN_LIMIT : rafter.ok && rafterSpan <= RAFTER_SPAN_LIMIT,
  }

  return { posts, plates, rafters, purlins, girts, braces, ties, kings, chords, webs, headers, unbraced, rafterSpan, girtRows, pitched, bearing, truss, trussDepth, sizing }
}

export function structurePosts(dimensions, roof, door, pedestrianDoors = [], windows = []) {
  return structureFrame({ dimensions, roof, door, pedestrianDoors, windows }).posts
}

// Preseci su uobičajeni za lake montažne objekte i provereni samo grubo.
// Ovo nije statički proračun.
export function profileSet(dimensions, frame) {
  const span = dimensions.width
  const wind = frame.sizing.wind
  const post =
    span > 6.5 || dimensions.height > 3.2 || (wind >= 0.9 && dimensions.height > 2.7)
      ? { name: 'kutija 100×100×3', priceId: 'post-100x100x3' }
      : span > 4.5 || dimensions.height > 2.7 || wind >= 0.9
        ? { name: 'kutija 80×80×3', priceId: 'post-80x80x3' }
        : { name: 'kutija 80×80×2', priceId: 'post-80x80x2' }
  const rafter = frame.truss ? frame.sizing.chord.profile : frame.sizing.rafter.profile
  const purlin = frame.truss ? { name: 'kutija 60×40×2', priceId: 'box-60x40x2' } : { name: 'kutija 40×40×2', priceId: 'box-40x40x2' }
  const plate = span > 6.5 || frame.truss ? { name: 'kutija 80×40×2', priceId: 'box-80x40x2' } : { name: 'kutija 60×40×2', priceId: 'box-60x40x2' }
  const girt = { name: 'kutija 40×40×2', priceId: 'box-40x40x2' }
  const brace = { name: 'kutija 40×40×2', priceId: 'box-40x40x2' }
  const web = { name: 'kutija 40×40×2', priceId: 'box-40x40x2' }
  const tie = frame.truss ? frame.sizing.chord.profile : { name: 'kutija 60×40×2', priceId: 'box-60x40x2' }
  const header = span > 4.5 ? { name: 'kutija 80×40×3', priceId: 'box-80x40x3' } : { name: 'kutija 80×40×2', priceId: 'box-80x40x2' }
  return { post, rafter, purlin, plate, girt, brace, web, tie, header }
}

export function segmentLength(segment) {
  return distance(segment.a, segment.b)
}

function mix(from, to, t) {
  const a = Array.isArray(from) ? from : [from.x, from.y, from.z]
  const b = Array.isArray(to) ? to : [to.x, to.y, to.z]
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

function distance(a, b) {
  return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
}

function roundCut(value) {
  return Math.ceil(value * 20 - 1e-9) / 20
}
