// Čelični skelet na jednom mestu. Računica i 3D prikaz čitaju isti model,
// pa se broj stubova, rogova i ukrućenja ne može razići.
import { FLOOR_LEVEL } from './config'
import { wallFrame } from './layout'
import { roofGeometry } from './roof'
import { snowOutOfRange } from './site'
import { columnCombinations, siteLoads } from './loads'
import { systemOf } from './systems'
import { BEAM_PROFILES, BRACE_PROFILES, POST_PROFILES, RAFTER_PROFILES, checkBeam, checkBeamMoment, checkChord, checkColumn, checkTie, from } from './checks'

export const POST_SPACING = 2
export const RAFTER_SPACING = 1.2
export const TRUSS_SPACING = 2
export const PURLIN_SPACING = 0.9
export const GIRT_SPACING = 1.2
// Preko ovog raspona kutijasti rog više nije dovoljan.
export const RAFTER_SPAN_LIMIT = 6
export const TRUSS_SPAN_LIMIT = 12

// Dva hemijska ankera M12 u betonu C25/30, okvirna nosivost na čupanje sa faktorima.
const ANCHOR_CAPACITY = 16

const WALLS = ['front', 'back', 'left', 'right']
const INSET = 0.05
const JAMB = 0.05
const MERGE = 0.3
const MIN_BRACE_BAY = 0.9

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
function wallMarks(id, dimensions, roof, openings, spacing = POST_SPACING) {
  const length = wallLength(id, dimensions)
  const end = length / 2 - INSET
  const acrossRidge = id === 'front' || id === 'back' ? roof.ridge === 'length' : roof.ridge === 'width'
  const gable = roof.kind === 'duo' && acrossRidge
  const bays = Math.max(1, Math.ceil(length / spacing - 1e-9))
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

// Zidovi na koje naležu krovni nosači, isto pravilo kao u rasporedu krova ispod:
// dve vode naležu na zidove uz sleme, ostali krovovi preko kraćeg raspona.
function bearingWalls(geometry) {
  const plane = geometry.planes[0]
  if (!plane) return ['left', 'right']
  const [c0, c1, , c3] = plane.corners
  const slopeX = Math.abs(c0.y - c1.y) > 0.01
  const alongX = geometry.roof.kind === 'duo' ? slopeX : Math.abs(c1.x - c0.x) <= Math.abs(c3.z - c0.z)
  return alongX ? ['left', 'right'] : ['front', 'back']
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

// Najveći moment u vencu jednog zida. Nosači naležu na venac tamo gde im je kraj uz
// zid; nosač iznad stuba ne savija venac. Vraća najgore polje i njegov moment.
function plateBending(wall, length, marks, rafters, overhang, line, spacing) {
  const hits = []
  rafters.forEach((rafter) => {
    ;[rafter.a, rafter.b].forEach((point) => {
      const dx = point[0] - wall.origin[0]
      const dz = point[2] - wall.origin[2]
      const u = dx * wall.axis[0] + dz * wall.axis[2]
      const off = Math.abs(dx * wall.axis[2] - dz * wall.axis[0])
      if (off < overhang + 0.3 && Math.abs(u) <= length / 2 + 0.01 && !hits.some((other) => Math.abs(other - u) < 0.05)) hits.push(u)
    })
  })
  hits.sort((left, right) => left - right)
  const gap = hits.length > 1 ? (hits[hits.length - 1] - hits[0]) / (hits.length - 1) : spacing
  const force = line * gap
  let worst = { moment: 0, span: POST_SPACING }
  for (let index = 0; index < marks.length - 1; index += 1) {
    const a = marks[index].u
    const span = marks[index + 1].u - a
    const loads = hits.filter((u) => u > a + 0.1 && u < a + span - 0.1).map((u) => u - a)
    const left = loads.reduce((sum, x) => sum + (force * (span - x)) / span, 0)
    loads.forEach((x) => {
      const moment = left * x - loads.filter((other) => other < x).reduce((sum, other) => sum + force * (x - other), 0)
      if (moment > worst.moment) worst = { moment, span }
    })
  }
  return worst
}

// Rešetka. Kod paralelnih pojaseva sila je moment podeljen visinom. Kod dve vode
// najveća sila je uz oslonac: reakcija podeljena sinusom nagiba.
function sizeTruss({ span, load, depth, duo, panel, brace, bending = load }) {
  const moment = (load * span * span) / 8
  const reaction = (load * span) / 2
  const slope = Math.hypot(span / 2, depth)
  const force = duo ? Math.max(moment / depth, reaction / (depth / slope)) : moment / depth
  const chord = checkChord(force, panel, bending, brace)
  return { ...chord, bendingMoment: chord.moment, moment, force, depth, reaction }
}

export function structureFrame(scene) {
  const { dimensions } = scene
  const { width, length, height } = dimensions
  const geometry = roofGeometry(dimensions, scene.roof)
  const roof = geometry.roof
  // Sistem: garažni skelet ima stubove na 2 m, a okviri stub i rešetku na 3–5 m.
  const system = systemOf(scene.structure)
  const framed = system.family === 'frames'
  const frameSpacing = framed ? (scene.structure?.frameSpacing ?? system.frameSpacing.default) : TRUSS_SPACING
  const truss = framed || Boolean(scene.roof?.truss)
  const purlinMax = framed ? system.purlinMax : PURLIN_SPACING
  const loadBearing = bearingWalls(geometry)
  const openings = openingsByWall(scene)
  const under = (x, z) => geometry.underside(x, z)
  const loads = siteLoads(scene)
  const wind = loads.wind
  const snow = loads.snow

  const posts = []
  const seen = new Set()
  const girts = []
  const braces = []
  const headers = []
  const unbraced = []
  const girtRows = Math.max(1, Math.ceil(height / GIRT_SPACING) - 1)
  const marksByWall = {}

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
    const marks = wallMarks(id, dimensions, roof, openings[id], framed && loadBearing.includes(id) ? frameSpacing : POST_SPACING)
    marksByWall[id] = marks

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
  const spacing = framed ? frameSpacing : truss ? TRUSS_SPACING : RAFTER_SPACING
  // Okviri kod dve vode: rožnjače idu u čvorove rešetke, `nodes` polja po vodi.
  let nodes = 0
  let rafterSpan = 0
  // Zidovi na koje se oslanjaju rogovi.
  let bearing = []
  let trussDepth = 0
  // Najveći razmak rožnjača po kosini i najduže polje gornjeg pojasa rešetke.
  let purlinGap = 0
  let trussPanel = 0
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

    if (battens && framed && roof.kind === 'duo') {
      // Rožnjače u čvorovima: od zida do slemena na jednakim poljima, mereno od strehe.
      const slopeLength = distance(lines[0].a, lines[0].b)
      const clearRun = run - geometry.overhang
      nodes = Math.max(2, Math.ceil((slopeLength * clearRun) / run / purlinMax))
      purlinGap = Math.max(purlinGap, (slopeLength * clearRun) / run / nodes)
      const eaveFirst = alongX ? c0.y < c1.y : c0.y < c3.y
      for (let row = 0; row <= nodes; row += 1) {
        const fromEave = (geometry.overhang + (row / nodes) * clearRun) / run
        const s = Math.min(0.995, eaveFirst ? fromEave : 1 - fromEave)
        const a = alongX ? mix(c0, c1, s) : mix(c0, c3, s)
        const b = alongX ? mix(c3, c2, s) : mix(c1, c2, s)
        a[1] -= 0.03
        b[1] -= 0.03
        purlins.push({ a, b })
      }
    } else if (battens) {
      const slopeLength = distance(lines[0].a, lines[0].b)
      const rows = Math.ceil(slopeLength / purlinMax) + 1
      purlinGap = Math.max(purlinGap, (slopeLength * 0.94) / (rows - 1))
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
        trussPanel = Math.max(trussPanel, distance(start, end) / panels)
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
    // Ispuna ide u četvrtine raspona, pa pojas ima dva polja po vodi; bez ispune jedno.
    // Okviri imaju čvor ispod svake rožnjače.
    const slopeHalf = Math.hypot(half, peak - level)
    const panelsPerSide = framed && nodes ? nodes : 2
    trussPanel = peak - level > 0.25 ? slopeHalf / panelsPerSide : slopeHalf
    const place = (across, y, offset) => (alongLength ? [across, y, offset] : [offset, y, across])
    for (let index = 0; index < count; index += 1) {
      const offset = -perp / 2 + INSET + ((perp - INSET * 2) * index) / (count - 1)
      ties.push({ a: place(-half, level, offset), b: place(half, level, offset) })
      const tall = peak - level > 0.25
      if (tall && (truss || half * 2 > 4)) kings.push({ a: place(0, level, offset), b: place(0, peak, offset) })
      if (truss && tall && framed && nodes) {
        // Pratt ispuna: uspravnica ispod svakog čvora i dijagonala ka sredini.
        ;[-1, 1].forEach((side) => {
          const acrossAt = (k) => side * half * (1 - k / nodes)
          const topAt = (k) => (alongLength ? under(acrossAt(k), offset) : under(offset, acrossAt(k))) - 0.12
          for (let k = 1; k < nodes; k += 1) webs.push({ a: place(acrossAt(k), level, offset), b: place(acrossAt(k), topAt(k), offset) })
          for (let k = 0; k < nodes; k += 1) webs.push({ a: place(acrossAt(k), topAt(k), offset), b: place(acrossAt(k + 1), level, offset) })
        })
      } else if (truss && tall) {
        ;[-1, 1].forEach((side) => {
          const across = (side * half) / 2
          const top = alongLength ? under(across, offset) : under(offset, across)
          webs.push({ a: place(0, level, offset), b: place(across, top - 0.12, offset) })
          webs.push({ a: place(across, level, offset), b: place(across, top - 0.12, offset) })
        })
      }
    }
  }

  // Opterećenje po dužnom metru nosača i izbor preseka. `load` je bez faktora (za
  // prikaz i ugib), `designLoad` sa faktorima 1,35 i 1,5 (za napon).
  const load = loads.roofService * spacing
  const designLoad = loads.roofDesign * spacing
  const fullSpan = roof.kind === 'duo' ? rafterSpan * 2 : rafterSpan
  const rafter = checkBeam(rafterSpan, designLoad, load, RAFTER_PROFILES)
  const chord = truss
    ? sizeTruss({ span: fullSpan, load: designLoad, depth: Math.max(0.2, trussDepth), duo: roof.kind === 'duo', panel: Math.max(trussPanel, 0.3), brace: purlinGap || PURLIN_SPACING, bending: framed && nodes ? 0 : designLoad })
    : null

  // Venac na zidu na koji naležu nosači je greda između stubova. Svaki nosač koji
  // ne stoji iznad stuba savija venac silom koju donosi sa svog dela krova.
  const across = fullSpan / 2 + geometry.overhang
  const plateDemand = bearing.reduce((worst, id) => {
    const bay = plateBending(wallFrame(id, dimensions), wallLength(id, dimensions), marksByWall[id] || [], rafters, geometry.overhang, across, spacing)
    return bay.moment > worst.moment ? bay : worst
  }, { moment: 0, span: POST_SPACING })
  const plate = checkBeamMoment(plateDemand.span, plateDemand.moment * loads.roofDesign, plateDemand.moment * loads.roofService, from(BEAM_PROFILES, width > 6.5 || truss ? 'kutija 80×40×2' : 'kutija 60×40×2'))

  // Rožnjača je greda preko razmaka nosača i nosi traku krova širine razmaka rožnjača.
  // Odozgo je pritiska sneg, odozdo je diže vetar; kutija nosi isto u oba smera.
  const gap = purlinGap || PURLIN_SPACING
  const purlin = purlins.length
    ? {
        // Kod okvira rožnjača ide u komadu preko bar dva polja, pa radi kao kontinualna greda.
        ...checkBeam(spacing, Math.max(loads.roofDesign, loads.upliftDesign) * gap, loads.roofService * gap, from(BEAM_PROFILES, truss ? 'kutija 60×40×2' : 'kutija 40×40×2'), {
          continuous: framed && rafters.length / Math.max(1, geometry.planes.length) >= 3,
        }),
        uplift: loads.upliftDesign > loads.roofDesign,
      }
    : null

  // Stubovi: svaki nosi svoj deo krova (samo na zidovima na koje naležu nosači) i
  // vetar sa svog dela zida. Merodavan je najgori stub.
  const combos = columnCombinations(loads)
  const columns = WALLS.flatMap((id) => {
    const marks = marksByWall[id] || []
    const wall = wallFrame(id, dimensions)
    const roofWidth = bearing.includes(id) ? across : 0
    return marks.map((mark, index) => {
      const before = index > 0 ? mark.u - marks[index - 1].u : 0
      const after = index < marks.length - 1 ? marks[index + 1].u - mark.u : 0
      const along = (before + after) / 2
      const x = wall.origin[0] + wall.axis[0] * mark.u
      const z = wall.origin[2] + wall.axis[2] * mark.u
      const tall = under(x, z) - FLOOR_LEVEL
      return checkColumn(tall, combos.map((combo) => ({ label: combo.label, force: combo.roof * along * roofWidth, wall: combo.wall * along })))
    })
  })
  // Svi stubovi dobijaju isti presek, pa se uzima najjači koji je bilo kom stubu trebao.
  const rank = (entry) => POST_PROFILES.indexOf(entry.profile) + Math.min(entry.use, 2) / 10
  const strongest = columns.reduce((worst, entry) => (rank(entry) > rank(worst) ? entry : worst))

  // Rigle nose vetar između stubova, svaka svoju traku zida.
  const girtBand = height / (girtRows + 1)
  const girtSpan = girts.reduce((widest, girt) => Math.max(widest, distance(girt.a, girt.b)), 0)
  const girt = checkBeam(Math.max(girtSpan, 0.5), loads.wallDesign * girtBand, loads.wallService * girtBand, BEAM_PROFILES)

  // Dijagonale u zidu primaju vetar sa zabata: polovina sile na svaki od dva zida
  // paralelna vetru, podeljena na dijagonale tog zida.
  const wallBraces = braces.filter((brace) => brace.kind === 'zid')
  const endArea = (id) => {
    const wall = wallFrame(id, dimensions)
    const span = wallLength(id, dimensions)
    let sum = 0
    for (let step = 0; step <= 8; step += 1) {
      const u = -span / 2 + (span * step) / 8
      sum += under(wall.origin[0] + wall.axis[0] * u, wall.origin[2] + wall.axis[2] * u) - FLOOR_LEVEL
    }
    return (sum / 9) * span
  }
  const braceForce = wallBraces.reduce((worst, brace) => {
    const facing = brace.wall === 'left' || brace.wall === 'right' ? 'front' : 'left'
    const count = wallBraces.filter((other) => other.wall === brace.wall).length
    const horizontal = (loads.bracingDesign * endArea(facing)) / 2 / count
    const run = Math.hypot(brace.b[0] - brace.a[0], brace.b[2] - brace.a[2])
    const force = horizontal / Math.max(0.2, run / distance(brace.a, brace.b))
    return Math.max(worst, force)
  }, 0)
  const brace = checkTie(braceForce, BRACE_PROFILES)

  // Ankeri: vetar diže krov, a sopstvena težina ga drži. Sila po stubu, sa faktorima.
  const footprint = (width + geometry.overhang * 2) * (length + geometry.overhang * 2)
  const anchor = { force: (loads.anchorUplift * footprint) / Math.max(1, posts.length), capacity: ANCHOR_CAPACITY }
  anchor.ok = anchor.force <= anchor.capacity
  anchor.use = anchor.force / anchor.capacity

  const outOfRange = snowOutOfRange(scene.site)
  const main = truss ? chord.ok && fullSpan <= TRUSS_SPAN_LIMIT : rafter.ok && rafterSpan <= RAFTER_SPAN_LIMIT
  const members = [
    { id: 'main', name: truss ? 'Pojas rešetke' : 'Krovni nosač', check: truss ? chord : rafter },
    { id: 'plate', name: 'Venac', check: plate },
    ...(purlin ? [{ id: 'purlin', name: 'Rožnjače', check: purlin }] : []),
    { id: 'post', name: 'Stubovi', check: strongest },
    { id: 'girt', name: 'Rigle', check: girt },
    ...(wallBraces.length ? [{ id: 'brace', name: 'Dijagonale', check: brace }] : []),
    { id: 'anchor', name: 'Ankeri', check: anchor },
  ]
  const sizing = {
    system: system.id,
    framed,
    frameSpacing: framed ? frameSpacing : null,
    truss,
    snow,
    wind,
    loads,
    spacing,
    load,
    designLoad,
    areaLoad: loads.roofService,
    span: truss ? fullSpan : rafterSpan,
    rafter,
    chord,
    plate,
    purlin,
    post: strongest,
    girt,
    brace: wallBraces.length ? brace : null,
    anchor,
    members,
    outOfRange,
    mainOk: main,
    ok: main && members.every((member) => member.check.ok) && !outOfRange,
  }

  return { posts, plates, rafters, purlins, girts, braces, ties, kings, chords, webs, headers, unbraced, rafterSpan, girtRows, pitched, bearing, truss, trussDepth, sizing }
}

export function structurePosts(dimensions, roof, door, pedestrianDoors = [], windows = []) {
  return structureFrame({ dimensions, roof, door, pedestrianDoors, windows }).posts
}

// Preseci iz grube provere u structureFrame. Ovo nije statički proračun.
export function profileSet(dimensions, frame) {
  const span = dimensions.width
  const post = frame.sizing.post.profile
  const rafter = frame.truss ? frame.sizing.chord.profile : frame.sizing.rafter.profile
  const purlin = frame.sizing.purlin?.profile ?? (frame.truss ? { name: 'kutija 60×40×2', priceId: 'box-60x40x2' } : { name: 'kutija 40×40×2', priceId: 'box-40x40x2' })
  const plate = frame.sizing.plate.profile
  const girt = frame.sizing.girt.profile
  const brace = frame.sizing.brace?.profile ?? { name: 'kutija 40×40×2', priceId: 'box-40x40x2' }
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
