import { FLOOR_LEVEL, ROOF_OVERHANG } from './config'
import { wallFrame } from './layout'
import { FLOOR_FINISHES, FRAME_COLORS, ROOF_MATERIALS, WALL_MATERIALS, findMaterial } from './materials'
import { roofGeometry, roofMetrics } from './roof'

const POST_SPACING = 2
const RAFTER_SPACING = 1.2
const PURLIN_SPACING = 0.9
const SHEET_WASTE = 1.08
const HINGE_LIMIT = 2
const OSB_SHEET = 2.5 * 1.25

export function hingeCount(leafHeight) {
  return leafHeight > HINGE_LIMIT ? 3 : 2
}

export function buildEstimate(scene) {
  const { dimensions, roof, door, windows = [] } = scene
  const geometry = roofGeometry(dimensions, roof)
  const metrics = roofMetrics(dimensions, roof)
  const lines = []
  const notes = []
  const warnings = []

  const columns = columnLengths(dimensions, geometry, roof, door, scene.pedestrianDoors || [])
  const profiles = profileSet(dimensions, metrics, scene.roofMaterialId)
  const section = profiles.post
  pushCuts(lines, 'Konstrukcija', `Stubovi, ${section.name}`, columns.heights, section.priceId)
  notes.push(
    `Stubovi idu na uglove i na svakih najviše ${POST_SPACING.toFixed(1).replace('.', ',')} m. U otvor vrata ne ide međustub. Presek je uobičajen za lake montažne garaže: do 4,5 m i 2,7 m visine stub 80×80×2, preko toga 80×80×3, preko 6,5 m ili 3,2 m visine 100×100×3. Težak pokrivač (crep, zeleni krov) diže presek za jednu klasu. Ovo nije statički proračun.`,
  )

  const plates = plateLengths(dimensions, metrics)
  pushCuts(lines, 'Konstrukcija', `Venci, ${profiles.plate.name}`, plates, profiles.plate.priceId)
  const girtRows = Math.max(1, Math.ceil(dimensions.height / 1.2) - 1)
  const girts = []
  for (let row = 0; row < girtRows; row += 1) girts.push(dimensions.width, dimensions.width, dimensions.length, dimensions.length)
  pushCuts(lines, 'Konstrukcija', `Zidni pojasevi, ${profiles.girt.name}`, girts, profiles.girt.priceId)

  if (metrics.roof.kind === 'flat') {
    const span = metrics.slopes[0]
    const count = Math.ceil(span.slopeLength / RAFTER_SPACING) + 1
    pushCuts(lines, 'Konstrukcija', `Krovni nosači, ${profiles.rafter.name}`, Array.from({ length: count }, () => span.alongCover), profiles.rafter.priceId)
    notes.push('Ravan krov nosi samo nosače, bez rogova.')
  } else {
    const rafters = []
    const purlins = []
    metrics.slopes.forEach((slope) => {
      const count = Math.ceil(slope.along / RAFTER_SPACING) + 1
      for (let index = 0; index < count; index += 1) rafters.push(slope.slopeLength)
      const rows = Math.ceil(slope.slopeLength / PURLIN_SPACING) + 1
      for (let index = 0; index < rows; index += 1) purlins.push(slope.alongCover)
    })
    pushCuts(lines, 'Konstrukcija', `Rogovi, ${profiles.rafter.name}`, rafters, profiles.rafter.priceId)
    pushCuts(lines, 'Konstrukcija', `Rožnjače, ${profiles.purlin.name}`, purlins, profiles.purlin.priceId)
    notes.push('Rogovi su na najviše 1,2 m, rožnjače na najviše 0,9 m po kosini.')
  }

  const wallNet = pushWallCover(lines, notes, scene, geometry)
  pushRoofCover(lines, notes, warnings, scene, metrics)
  pushInsulation(lines, notes, scene, wallNet, metrics)
  if (scene.gutters !== false) pushDrainage(lines, dimensions, metrics)
  pushFoundation(lines, dimensions)
  pushFloor(lines, dimensions, scene.floor)
  pushDoor(lines, notes, warnings, dimensions, door)
  pushWindows(lines, windows)
  pushPedestrian(lines, scene.pedestrianDoors || [])
  pushFasteners(lines, wallNet + metrics.area, columns.heights.length)

  notes.push('Betonska ploča, oluk i vrata su posebni poslovi. Količine nisu statički proračun, a cene na strani Cene su orijentacione.')
  const tagged = lines.map((entry) => ({ ...entry, skill: entry.skill || skillFor(entry) }))
  const segments = {}
  tagged.forEach((entry) => {
    if (!segments[entry.skill]) segments[entry.skill] = []
    segments[entry.skill].push(entry)
  })
  return { lines: tagged, notes, warnings, segments }
}

function columnLengths(dimensions, geometry, roof, door, pedestrianDoors = []) {
  const { width, length } = dimensions
  const heights = []
  const posts = []
  const heightAt = (x, z) => roundCut(geometry.underside(x, z) - FLOOR_LEVEL)
  const corners = [
    [-width / 2, length / 2],
    [width / 2, length / 2],
    [-width / 2, -length / 2],
    [width / 2, -length / 2],
  ]
  corners.forEach(([x, z]) => {
    const height = heightAt(x, z)
    heights.push(height)
    posts.push({ x, z, height, role: 'ugao' })
  })

  const walls = [
    { name: 'front', a: [-width / 2, length / 2], b: [width / 2, length / 2], gable: roof.kind === 'duo' && roof.ridge === 'length' },
    { name: 'back', a: [-width / 2, -length / 2], b: [width / 2, -length / 2], gable: roof.kind === 'duo' && roof.ridge === 'length' },
    { name: 'left', a: [-width / 2, length / 2], b: [-width / 2, -length / 2], gable: roof.kind === 'duo' && roof.ridge === 'width' },
    { name: 'right', a: [width / 2, -length / 2], b: [width / 2, length / 2], gable: roof.kind === 'duo' && roof.ridge === 'width' },
  ]
  walls.forEach((wall) => {
    const span = Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1])
    const bays = Math.max(1, Math.ceil(span / POST_SPACING - 1e-9))
    const spots = []
    for (let index = 1; index < bays; index += 1) spots.push(index / bays)
    if (wall.gable && !spots.some((spot) => Math.abs(spot - 0.5) < 0.12)) spots.push(0.5)
    spots.forEach((spot) => {
      const x = wall.a[0] + (wall.b[0] - wall.a[0]) * spot
      const z = wall.a[1] + (wall.b[1] - wall.a[1]) * spot
      if (postInDoor(x, z, door, dimensions)) return
      if (pedestrianDoors.some((item) => postInOpening(x, z, item, dimensions))) return
      const height = heightAt(x, z)
      heights.push(height)
      posts.push({ x, z, height, role: 'medju' })
    })
  })
  return { heights, posts }
}

export function structurePosts(dimensions, roof, door, pedestrianDoors = []) {
  return columnLengths(dimensions, roofGeometry(dimensions, roof), roof, door, pedestrianDoors).posts
}

export function profileSet(dimensions, metrics, roofMaterialId) {
  const span = dimensions.width
  const slope = Math.max(...metrics.slopes.map((item) => item.slopeLength))
  // Težak pokrivač (crep, zeleni krov) podiže presek za jednu klasu.
  const cover = findMaterial(ROOF_MATERIALS, roofMaterialId).cover
  const load = cover?.kind === 'tile' || cover?.kind === 'green' ? 1.25 : 1
  const post =
    span * load > 6.5 || dimensions.height > 3.2
      ? { name: 'kutija 100×100×3', priceId: 'post-100x100x3' }
      : span * load > 4.5 || dimensions.height > 2.7
        ? { name: 'kutija 80×80×3', priceId: 'post-80x80x3' }
        : { name: 'kutija 80×80×2', priceId: 'post-80x80x2' }
  const rafter =
    slope * load > 6
      ? { name: 'kutija 80×40×3', priceId: 'box-80x40x3' }
      : slope * load > 4.2
        ? { name: 'kutija 80×40×2', priceId: 'box-80x40x2' }
        : { name: 'kutija 60×40×2', priceId: 'box-60x40x2' }
  const purlin = slope * load > 6 ? { name: 'kutija 60×40×2', priceId: 'box-60x40x2' } : { name: 'kutija 40×40×2', priceId: 'box-40x40x2' }
  const plate = span > 6.5 ? { name: 'kutija 80×40×2', priceId: 'box-80x40x2' } : { name: 'kutija 60×40×2', priceId: 'box-60x40x2' }
  const girt = { name: 'kutija 40×40×2', priceId: 'box-40x40x2' }
  return { post, rafter, purlin, plate, girt }
}

function postInDoor(x, z, door, dimensions) {
  if (!door || door.style === 'none' || !Number.isFinite(door.width)) return false
  return postInOpening(x, z, { ...door, wall: door.wall || 'front' }, dimensions)
}

function postInOpening(x, z, opening, dimensions) {
  if (!opening || !Number.isFinite(opening.width)) return false
  const wall = wallFrame(opening.wall || 'left', dimensions)
  const along = (x - wall.origin[0]) * wall.axis[0] + (z - wall.origin[2]) * wall.axis[2]
  const across = (x - wall.origin[0]) * wall.normal[0] + (z - wall.origin[2]) * wall.normal[2]
  if (Math.abs(across) > 0.45) return false
  return Math.abs(along - (opening.along || 0)) < opening.width / 2 + 0.08
}

function skillFor(entry) {
  if (entry.section === 'Oluk') return 'oluk'
  if (entry.section === 'Temelj' || entry.section === 'Pod') return 'temelj'
  if (entry.section === 'Krov') return 'krov'
  if (entry.section === 'Vrata' || entry.section === 'Stolarija') return 'stolarija'
  return 'konstrukcija'
}

function plateLengths(dimensions, metrics) {
  const { width, length } = dimensions
  const { roof, radians } = metrics
  const cosine = Math.cos(radians) || 1
  const horizontal = { front: width, back: width, left: length, right: length }
  if (roof.kind !== 'mono') return Object.values(horizontal).map(roundCut)
  const sloping = roof.fall === 'front' || roof.fall === 'back' ? ['left', 'right'] : ['front', 'back']
  return Object.entries(horizontal).map(([edge, span]) => roundCut(sloping.includes(edge) ? span / cosine : span))
}

function pushWallCover(lines, notes, scene, geometry) {
  const { dimensions, windows = [], door } = scene
  const areas = wallAreas(dimensions, geometry)
  if (door.style !== 'none' && areas[door.wall] != null) {
    areas[door.wall] = Math.max(0, areas[door.wall] - door.width * door.height)
  }
  ;(scene.pedestrianDoors || []).forEach((item) => {
    if (areas[item.wall] != null) areas[item.wall] = Math.max(0, areas[item.wall] - item.width * item.height)
  })
  const windowArea = windows.reduce((sum, item) => sum + item.width * item.height, 0)
  const gross = areas.left + areas.right + areas.back + areas.front
  const net = Math.max(0, gross - windowArea)
  const material = findMaterial(WALL_MATERIALS, scene.wallMaterialId)
  const cover = material.cover ?? { kind: 'sheet', width: 1.1, name: 'Zidna obloga' }
  const colorNote = scene.wallColor ? `, RAL ${scene.wallColor}` : ''
  if (cover.kind === 'masonry') {
    lines.push(line('Zidovi', `${cover.name}${colorNote}`, round1(net), 'm²', 'otvori su odbijeni', { priceId: material.priceId || 'masonry-m2' }))
    notes.push('Zidani zid je u kvadratima. Blok, malter i serklaži nisu razloženi.')
    return net
  }
  if (cover.kind === 'boards') {
    lines.push(line('Zidovi', `${cover.name}${colorNote}, sa 8% reza`, round1(net * SHEET_WASTE), 'm²', '', { priceId: material.priceId || 'wood-m2' }))
    lines.push(line('Zidovi', 'Podkonstrukcija, letva 50×30', Math.ceil(net / 0.5), 'm', 'letve na 50 cm'))
    return net
  }
  const tallest = Math.max(areas.heightLeft, areas.heightRight, areas.heightBack, areas.heightFront)
  const sheetLength = roundCut(tallest)
  const sheets = Math.max(1, Math.ceil((net * SHEET_WASTE) / (cover.width * sheetLength)))
  const trims = roundCut(tallest * 4 + (dimensions.width + dimensions.length) * 2)
  lines.push(line('Zidovi', `${cover.name}${colorNote}`, sheets, 'tabla', `korisna širina ${fmt(cover.width)} m, dužina ${fmt(sheetLength)} m`))
  lines.push(line('Zidovi', 'Zidna obloga, neto', round1(net), 'm²', 'otvori su odbijeni', { priceId: material.priceId || 'wall-m2' }))
  lines.push(line('Zidovi', 'Ugaone lajsne i sokla', trims, 'm', 'uglovi i donja ivica zida', { priceId: 'flashing-m' }))
  return net
}

function wallAreas(dimensions, geometry) {
  const { width, length } = dimensions
  const heightAt = (x, z) => geometry.underside(x, z) - FLOOR_LEVEL
  const run = (point) => {
    const samples = 8
    let area = 0
    let peak = 0
    for (let index = 0; index < samples; index += 1) {
      const a = point(index / samples)
      const b = point((index + 1) / samples)
      const hA = heightAt(a.x, a.z)
      const hB = heightAt(b.x, b.z)
      area += ((hA + hB) / 2) * Math.hypot(b.x - a.x, b.z - a.z)
      peak = Math.max(peak, hA, hB)
    }
    return { area, peak }
  }
  const left = run((t) => ({ x: -width / 2, z: -length / 2 + length * t }))
  const right = run((t) => ({ x: width / 2, z: -length / 2 + length * t }))
  const back = run((t) => ({ x: -width / 2 + width * t, z: -length / 2 }))
  const front = run((t) => ({ x: -width / 2 + width * t, z: length / 2 }))
  return {
    left: left.area,
    right: right.area,
    back: back.area,
    front: front.area,
    heightLeft: left.peak,
    heightRight: right.peak,
    heightBack: back.peak,
    heightFront: front.peak,
  }
}

function pushRoofCover(lines, notes, warnings, scene, metrics) {
  const material = findMaterial(ROOF_MATERIALS, scene.roofMaterialId)
  const cover = material.cover ?? { kind: 'sheet', useful: 1, name: material.name }
  const area = metrics.area
  const pitched = metrics.roof.kind !== 'flat'
  const pitch = pitched ? metrics.roof.pitch : 0
  const priceId = material.priceId || 'sheet-m2'
  const colorNote = scene.roofColor ? `, RAL ${scene.roofColor}` : ''

  if (cover.kind === 'tile') {
    lines.push(line('Krov', cover.name, Math.ceil(area * cover.perM2 * 1.05), 'kom', `${fmt(area)} m² + 5% loma`))
    lines.push(line('Krov', 'Površina pokrivača', round1(area), 'm²', '', { priceId }))
    lines.push(line('Krov', 'Letve 50×30 i kontraletve', Math.ceil(area / 0.33 + area / 0.9), 'm', 'letve na oko 33 cm'))
    lines.push(line('Krov', 'Paropropusna folija', round1(area * 1.1), 'm²', 'sa preklopom'))
  } else if (cover.kind === 'shingle') {
    lines.push(line('Krov', cover.name, round1(area * 1.1), 'm²', 'uračunat preklop', { priceId }))
    lines.push(line('Krov', 'OSB podloga 18 mm', Math.ceil((area * 1.05) / OSB_SHEET), 'ploča', 'ploča 2,50 × 1,25 m'))
    lines.push(line('Krov', 'Bitumenska podložna traka', round1(area * 1.1), 'm²', ''))
  } else if (cover.kind === 'membrane') {
    lines.push(line('Krov', cover.name, round1(area * (cover.waste ?? 1.15)), 'm²', cover.waste ? 'jedan komad, sa prepustom' : 'dva sloja na preklopu', { priceId }))
    lines.push(line('Krov', 'OSB podloga 18 mm', Math.ceil((area * 1.05) / OSB_SHEET), 'ploča', 'ploča 2,50 × 1,25 m'))
  } else if (cover.kind === 'green') {
    lines.push(line('Krov', 'Hidroizolacija otporna na korenje', round1(area * 1.12), 'm²', 'EPDM ili TPO'))
    lines.push(line('Krov', 'Drenažni i filterski sloj', round1(area), 'm²', ''))
    lines.push(line('Krov', 'Supstrat 8 cm', Math.round(area * 0.08 * 100) / 100, 'm³', ''))
    lines.push(line('Krov', cover.name, round1(area), 'm²', '', { priceId }))
    lines.push(line('Krov', 'OSB podloga 22 mm', Math.ceil((area * 1.05) / OSB_SHEET), 'ploča', 'ploča 2,50 × 1,25 m'))
    warnings.push('Natopljen zeleni krov teži 100–150 kg/m². Neka statičar proveri konstrukciju pre ponude.')
  } else {
    const useful = cover.useful ?? 1
    const longest = Math.max(...metrics.slopes.map((slope) => slope.slopeLength))
    let sheets
    let detail
    if (cover.fixedLength) {
      const rows = metrics.slopes.map((slope) => Math.ceil(slope.slopeLength / (cover.fixedLength - 0.2)))
      sheets = metrics.slopes.reduce((sum, slope, index) => sum + Math.ceil(slope.alongCover / useful) * rows[index], 0)
      detail = `korisna širina ${fmt(useful)} m, preklop 20 cm`
    } else {
      sheets = metrics.slopes.reduce((sum, slope) => sum + Math.ceil(slope.alongCover / useful), 0)
      detail = `korisna širina ${fmt(useful)} m, dužina ${fmt(roundCut(longest))} m`
    }
    lines.push(line('Krov', `${cover.name}${colorNote}`, sheets, cover.unit || 'tabla', detail))
    lines.push(line('Krov', 'Krovna površina', round1(area), 'm²', '', { priceId }))
    if (cover.unit === 'traka') lines.push(line('Krov', 'Separaciona strukturna membrana', round1(area * 1.1), 'm²', 'ispod falca'))
  }

  if (!pitched && cover.kind !== 'membrane' && cover.kind !== 'green') {
    warnings.push(`${material.name} na ravnom krovu zadržava vodu. Uzmi bar jednu vodu i pad od ${cover.minPitch ?? 5}°.`)
  } else if (pitched && cover.minPitch && pitch < cover.minPitch) {
    warnings.push(`${material.name} traži nagib od bar ${cover.minPitch}°. Na ${pitch}° voda može da se vraća ispod pokrivača.`)
  }
  if (cover.maxPitch && pitch > cover.maxPitch) {
    warnings.push(`${material.name} ide najviše do ${cover.maxPitch}°. Smanji nagib ili uzmi drugi pokrivač.`)
  }
  if (cover.kind === 'membrane' && pitch > 20) {
    notes.push('Membrana na kosom krovu radi, ali obično se bira lim ili šindra jer lepše izgleda.')
  }
  if (metrics.roof.kind === 'duo') {
    const ridge = (metrics.roof.ridge === 'length' ? scene.dimensions.length : scene.dimensions.width) + ROOF_OVERHANG * 2
    lines.push(line('Krov', 'Slemenska opšivka', roundCut(ridge), 'm', '', { priceId: 'ridge-m' }))
  }
  notes.push('Dužina table je kosina sa strehom, zaokružena na 5 cm naviše.')
}

function pushInsulation(lines, notes, scene, wallNet, metrics) {
  const mode = scene.insulation || 'none'
  if (mode === 'none') return
  const wall = findMaterial(WALL_MATERIALS, scene.wallMaterialId)
  const roof = findMaterial(ROOF_MATERIALS, scene.roofMaterialId)
  const ceiling = (scene.dimensions.width * scene.dimensions.length) / (Math.cos(metrics.radians) || 1)
  let area = 0
  if (wall.insulated) notes.push(`${wall.name} je već izolovan, pa zidovi ne dobijaju vunu.`)
  else area += wallNet
  if (mode === 'full') {
    if (roof.insulated) notes.push(`${roof.name} je već izolovan, pa krov ne dobija vunu.`)
    else area += ceiling
  }
  if (area <= 0) return
  lines.push(line('Izolacija', 'Mineralna vuna 10 cm', round1(area * 1.05), 'm²', mode === 'full' ? 'zidovi i krov' : 'zidovi', { priceId: 'wool-m2', skill: 'konstrukcija' }))
  lines.push(line('Izolacija', 'Parna brana', round1(area * 1.1), 'm²', 'sa preklopom 10 cm', { skill: 'konstrukcija' }))
  lines.push(line('Izolacija', 'OSB 12 mm, unutrašnja obloga', Math.ceil((area * 1.08) / OSB_SHEET), 'ploča', 'ploča 2,50 × 1,25 m', { priceId: 'osb-sheet', skill: 'konstrukcija' }))
}

function pushDrainage(lines, dimensions, metrics) {
  const drips = dripLengths(dimensions, metrics)
  drips.forEach((drip, index) => {
    const length = roundCut(drip)
    lines.push(line('Oluk', `Oluk, streha ${index + 1}`, length, 'm', 'polukružni, sa 2 čela', { priceId: 'gutter-m' }))
    const drops = drip > 10 ? 2 : 1
    lines.push(line('Oluk', `Vertikalna olučna cev, streha ${index + 1}`, drops, 'kom', 'dužina do poda, ovde nije sečena', { priceId: 'downpipe' }))
  })
}

function pushFoundation(lines, dimensions) {
  const area = dimensions.width * dimensions.length
  const volume = area * 0.15
  const bags = Math.ceil((volume * 300) / 50)
  const gravel = Math.round(volume * 0.8 * 100) / 100
  const sand = Math.round(volume * 0.45 * 100) / 100
  const rebar = Math.round(area * 8)
  lines.push(line('Temelj', 'Betonska ploča 15 cm', round1(area), 'm²', 'vidi se u prikazu, ispod poda'))
  lines.push(line('Temelj', 'Cement 50 kg', bags, 'vreća', 'oko 300 kg cementa po m³ betona', { priceId: 'cement-bag' }))
  lines.push(line('Temelj', 'Šljunak', gravel, 'm³', 'oko 0,8 m³ po m³ betona', { priceId: 'gravel-m3' }))
  lines.push(line('Temelj', 'Pesak', sand, 'm³', 'oko 0,45 m³ po m³ betona', { priceId: 'sand-m3' }))
  lines.push(line('Temelj', 'Armaturna mreža', rebar, 'kg', 'oko 8 kg/m², mreža Q188', { priceId: 'rebar-kg' }))
}

function pushFloor(lines, dimensions, floorId) {
  const finish = findMaterial(FLOOR_FINISHES, floorId)
  if (!finish.priceId) return
  const area = round1(dimensions.width * dimensions.length)
  lines.push(line('Pod', finish.name, area, 'm²', finish.detail, { priceId: finish.priceId }))
}

function pushPedestrian(lines, doors) {
  if (!doors.length) return
  const area = doors.reduce((sum, item) => sum + item.width * item.height, 0)
  const glazed = doors.filter((item) => item.glass).length
  lines.push(line('Stolarija', 'Bočna pešačka vrata', doors.length, 'kom', `ukupno ${fmt(area)} m² otvora${glazed ? `, ${glazed} sa staklom` : ''}`))
}

function dripLengths(dimensions, metrics) {
  const { width, length } = dimensions
  const { roof } = metrics
  const overhang = ROOF_OVERHANG
  if (roof.kind === 'flat') {
    const long = Math.max(width, length) + overhang * 2
    return [long, long]
  }
  if (roof.kind === 'mono') {
    return [roof.fall === 'front' || roof.fall === 'back' ? width + overhang * 2 : length + overhang * 2]
  }
  const span = roof.ridge === 'length' ? length : width
  return [span + overhang * 2, span + overhang * 2]
}

function pushDoor(lines, notes, warnings, dimensions, door) {
  if (door.style === 'none') {
    lines.push(line('Vrata', 'Otvor bez krila', 1, 'kom', 'štok ostaje u stubovima'))
    return
  }
  const wallName = wallFrame(door.wall || 'front', dimensions).label.toLowerCase()
  const size = `${fmt(door.width)} × ${fmt(door.height)} m`
  const headroom = dimensions.height - door.height

  if (door.style === 'roller') {
    const extra = { skill: 'rolo' }
    lines.push(line('Vrata', 'Rolo kutija sa osovinom', 1, 'kom', `${wallName}, širina otvora ${fmt(door.width)} m`, extra))
    lines.push(line('Vrata', 'Vođice rolo vrata', 2, 'kom', `dužina ${fmt(door.height)} m`, extra))
    lines.push(line('Vrata', 'Rolo plašt', round1(door.width * door.height), 'm²', 'lamele pune visine otvora', extra))
    lines.push(line('Vrata', 'Završna lamela sa gumom', 1, 'kom', '', extra))
    if (door.motor) lines.push(line('Vrata', 'Cevni motor sa 2 daljinska', 1, 'kom', '', { ...extra, priceId: 'motor' }))
    else notes.push('Rolo je računat na ručni pogon. Motor možeš da uključiš kod vrata.')
    if (door.width > 5 && !door.motor) warnings.push('Rolo šire od 5 m obično traži motor i jaču osovinu. Uključi motor.')
    if (headroom < 0.3) warnings.push('Rolo kutija traži oko 30 cm iznad otvora. Spusti vrata ili podigni zid.')
    return
  }

  if (door.style === 'sectional') {
    const extra = { skill: 'rolo' }
    const panels = Math.max(4, Math.ceil(door.height / 0.5))
    lines.push(line('Vrata', 'Sekcijska vrata, paneli 40 mm', 1, 'kompl', `${size}, ${panels} panela`, extra))
    lines.push(line('Vrata', 'Vertikalne vođice i torziona opruga', 1, 'kompl', `${wallName}`, extra))
    lines.push(line('Vrata', 'Horizontalne šine pod plafonom', 2, 'kom', `dužina oko ${fmt(roundCut(door.height + 0.5))} m`, extra))
    if (door.motor) lines.push(line('Vrata', 'Motor na šini sa 2 daljinska', 1, 'kom', '', { ...extra, priceId: 'motor' }))
    if (headroom < 0.2) warnings.push('Sekcijska vrata traže bar 20 cm iznad otvora za oprugu i šinu. Spusti vrata ili podigni zid.')
    if (dimensions.length < door.height + 0.6) warnings.push('Šine sekcijskih vrata idu pod plafonom dublje od visine vrata. Garaža je prekratka.')
    return
  }

  if (door.style === 'tilt') {
    lines.push(line('Vrata', 'Kipna vrata, krilo sa okvirom', 1, 'kom', size))
    lines.push(line('Vrata', 'Opružni mehanizam sa bočnim šinama', 2, 'kom', 'levo i desno'))
    lines.push(line('Vrata', 'Brava sa kvakom', 1, 'kom', ''))
    if (door.motor) lines.push(line('Vrata', 'Motor za kipna vrata sa 2 daljinska', 1, 'kom', '', { priceId: 'motor' }))
    if (door.width > 3.2) warnings.push('Kipna vrata šira od 3,2 m su teška i retka. Sekcijska su bolji izbor.')
    notes.push('Kipno krilo pri otvaranju ulazi u garažu oko 2/3 visine. Ne parkiraj auto do samih vrata.')
    return
  }

  const leafHeight = door.height
  const leaves = door.style === 'double' ? 2 : 1
  const leafWidth = door.style === 'double' ? door.width / 2 - 0.012 : door.width
  const hinges = hingeCount(leafHeight)
  lines.push(line('Vrata', door.style === 'double' ? 'Krila, limena' : 'Krilo, limeno', leaves, 'kom', `${fmt(leafWidth)} × ${fmt(leafHeight)} m`))
  lines.push(line('Vrata', 'Šarke na krilu', leaves * hinges, 'kom', hinges === 3 ? 'krilo je više od 2 m, idu 3 šarke' : 'krilo do 2 m, idu 2 šarke'))
  lines.push(line('Vrata', 'Brava sa kvakom', 1, 'kom', ''))
  if (door.style === 'double') lines.push(line('Vrata', 'Podni i gornji zasun pasivnog krila', 1, 'kom', ''))
  if (door.motor) lines.push(line('Vrata', 'Motor za krilna vrata, par ruku', 1, 'kom', 'sa 2 daljinska', { priceId: 'motor' }))
  if (leafWidth > 1.25) notes.push('Krilo šire od 1,25 m je teško za svakodnevno otvaranje. Dvokrilna ili sekcijska vrata su mirnija.')
  if (!door.wicket) return
  const wicketWidth = Math.min(0.9, leafWidth - 0.28)
  const wicketHeight = Math.min(HINGE_LIMIT, leafHeight - 0.16)
  if (wicketWidth < 0.72) return
  const wicketHinges = hingeCount(wicketHeight)
  lines.push(line('Vrata', 'Pešačka vrata na krilu', 1, 'kom', `${fmt(wicketWidth)} × ${fmt(wicketHeight)} m`))
  lines.push(line('Vrata', 'Šarke pešačkih vrata', wicketHinges, 'kom', wicketHinges === 3 ? 'preko 2 m' : 'do 2 m'))
  lines.push(line('Vrata', 'Brava pešačkih vrata', 1, 'kom', ''))
}

const WINDOW_NAMES = {
  fixed: 'Fiksni prozor',
  single: 'Jednokrilni prozor',
  double: 'Dvokrilni prozor',
  tilt: 'Ventus prozor',
  strip: 'Trakasti prozor',
  glassblock: 'Zid od staklenih prizmi',
}

function pushWindows(lines, windows) {
  if (windows.length === 0) return
  const groups = new Map()
  windows.forEach((item) => {
    const key = `${item.type}|${item.frame || 'bela'}`
    const group = groups.get(key) ?? { type: item.type, frame: item.frame || 'bela', count: 0, area: 0 }
    group.count += 1
    group.area += item.width * item.height
    groups.set(key, group)
  })
  groups.forEach((group) => {
    const frame = FRAME_COLORS.find((entry) => entry.id === group.frame)?.name ?? 'PVC bela'
    const detail = group.type === 'glassblock' ? `${fmt(group.area)} m², prizme 19×19 cm` : `${frame}, ${fmt(group.area)} m², okov i dihtung`
    lines.push(line('Stolarija', WINDOW_NAMES[group.type] ?? 'Prozor', group.count, 'kom', detail))
  })
  const barred = windows.filter((item) => item.bars)
  if (barred.length) {
    const area = barred.reduce((sum, item) => sum + item.width * item.height, 0)
    lines.push(line('Stolarija', 'Zaštitna rešetka', barred.length, 'kom', `${fmt(area)} m², kovano gvožđe`, { priceId: 'bars-m2', meters: area, priceUnit: 'm²' }))
  }
  const sills = windows.filter((item) => item.type !== 'glassblock').reduce((sum, item) => sum + item.width + 0.1, 0)
  if (sills > 0) lines.push(line('Stolarija', 'Spoljna limena solbanka', roundCut(sills), 'm', ''))
}

function pushFasteners(lines, squareMeters, postCount) {
  const screws = Math.max(100, Math.ceil((squareMeters * 8) / 100) * 100)
  lines.push(line('Spojni materijal', 'Samorezi 4,8×35 sa podloškom', screws, 'kom', 'oko 8 komada po m² lima', { priceId: 'screw' }))
  lines.push(line('Spojni materijal', 'Anker vijci za stubove', postCount * 2, 'kom', 'po 2 ankera na svaki stub', { priceId: 'anchor' }))
}

function pushCuts(lines, section, item, lengths, priceId) {
  const grouped = new Map()
  lengths.forEach((length) => {
    const cut = roundCut(length)
    grouped.set(cut, (grouped.get(cut) ?? 0) + 1)
  })
  const parts = [...grouped.entries()].sort((left, right) => right[0] - left[0])
  const count = parts.reduce((sum, [, pieces]) => sum + pieces, 0)
  const total = parts.reduce((sum, [cut, pieces]) => sum + cut * pieces, 0)
  const detail = parts.map(([cut, pieces]) => `${pieces} × ${fmt(cut)} m`).join(', ')
  lines.push(line(section, item, count, 'kom', `${detail} · ukupno ${fmt(total)} m`, { priceId, meters: total, priceUnit: 'm' }))
}

function line(section, item, quantity, unit, detail, extra = {}) {
  return { section, item, quantity, unit, detail, ...extra }
}

function roundCut(value) {
  return Math.ceil(value * 20 - 1e-9) / 20
}

function round1(value) {
  return Math.round(value * 10) / 10
}

function fmt(value) {
  return value.toFixed(2).replace('.', ',')
}
