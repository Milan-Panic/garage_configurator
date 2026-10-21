import { FLOOR_LEVEL, ROOF_OVERHANG } from './config'
import { wallFrame } from './layout'
import { roofGeometry, roofMetrics } from './roof'

const POST_SPACING = 2
const RAFTER_SPACING = 1.2
const PURLIN_SPACING = 0.9
const SHEET_WASTE = 1.08
const HINGE_LIMIT = 2

export function hingeCount(leafHeight) {
  return leafHeight > HINGE_LIMIT ? 3 : 2
}

export function buildEstimate(scene) {
  const { dimensions, roof, door, windows } = scene
  const geometry = roofGeometry(dimensions, roof)
  const metrics = roofMetrics(dimensions, roof)
  const lines = []
  const notes = []
  const warnings = []

  const columns = columnLengths(dimensions, geometry, roof, door, scene.pedestrianDoors || [])
  const profiles = profileSet(dimensions, metrics)
  const section = profiles.post
  pushCuts(lines, 'Konstrukcija', `Stubovi, ${section.name}`, columns.heights, section.priceId)
  notes.push(
    `Stubovi idu na uglove i na svakih najviše ${POST_SPACING.toFixed(1).replace('.', ',')} m. U otvor vrata ne ide međustub. Presek je uobičajen za lake montažne garaže: do 4,5 m i 2,7 m visine stub 80×80×2, preko toga 80×80×3, preko 6,5 m ili 3,2 m visine 100×100×3. Rog prati dužinu kosine (60×40×2, pa 80×40×2, pa 80×40×3). Ovo nije statički proračun.`,
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
  if (scene.gutters !== false) pushDrainage(lines, dimensions, metrics)
  pushFoundation(lines, dimensions)
  pushDoor(lines, notes, warnings, dimensions, door)
  pushWindows(lines, windows)
  pushPedestrian(lines, scene.pedestrianDoors || [])
  pushFasteners(lines, wallNet + metrics.area, columns.heights.length)

  notes.push('Betonska ploča, oluk i rolo vrata su posebni poslovi. Količine nisu statički proračun, a cene na strani Cene su orijentacione.')
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

export function profileSet(dimensions, metrics) {
  const span = dimensions.width
  const slope = Math.max(...metrics.slopes.map((item) => item.slopeLength))
  const post =
    span > 6.5 || dimensions.height > 3.2
      ? { name: 'kutija 100×100×3', priceId: 'post-100x100x3' }
      : span > 4.5 || dimensions.height > 2.7
        ? { name: 'kutija 80×80×3', priceId: 'post-80x80x3' }
        : { name: 'kutija 80×80×2', priceId: 'post-80x80x2' }
  const rafter =
    slope > 6
      ? { name: 'kutija 80×40×3', priceId: 'box-80x40x3' }
      : slope > 4.2
        ? { name: 'kutija 80×40×2', priceId: 'box-80x40x2' }
        : { name: 'kutija 60×40×2', priceId: 'box-60x40x2' }
  const purlin = slope > 6 ? { name: 'kutija 60×40×2', priceId: 'box-60x40x2' } : { name: 'kutija 40×40×2', priceId: 'box-40x40x2' }
  const plate = span > 6.5 ? { name: 'kutija 80×40×2', priceId: 'box-80x40x2' } : { name: 'kutija 60×40×2', priceId: 'box-60x40x2' }
  const girt = { name: 'kutija 40×40×2', priceId: 'box-40x40x2' }
  return { post, rafter, purlin, plate, girt }
}

function postInDoor(x, z, door, dimensions) {
  if (!door || door.style === 'none' || !Number.isFinite(door.width)) return false
  const wall = wallFrame(door.wall || 'front', dimensions)
  const along = (x - wall.origin[0]) * wall.axis[0] + (z - wall.origin[2]) * wall.axis[2]
  const across = (x - wall.origin[0]) * wall.normal[0] + (z - wall.origin[2]) * wall.normal[2]
  if (Math.abs(across) > 0.45) return false
  return Math.abs(along - (door.along || 0)) < door.width / 2 + 0.08
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
  if (entry.section === 'Temelj') return 'temelj'
  if (entry.section === 'Krov') return 'krov'
  if (entry.section === 'Vrata' && /rolo|lamela/i.test(`${entry.item} ${entry.detail}`)) return 'rolo'
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
  const { dimensions, windows, door, wallMaterialId } = scene
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
  const cover = wallCover(wallMaterialId)
  if (cover.kind === 'masonry') {
    lines.push(line('Zidovi', cover.name, round1(net), 'm²', 'otvori su odbijeni', { priceId: 'masonry-m2' }))
    notes.push('Zidani zid je u kvadratima. Cigla, malter i serklaži nisu razloženi.')
    return net
  }
  if (cover.kind === 'boards') {
    lines.push(line('Zidovi', 'Fasadna daska, sa 8% reza', round1(net * SHEET_WASTE), 'm²', '', { priceId: 'wall-m2' }))
    return net
  }
  const tallest = Math.max(areas.heightLeft, areas.heightRight, areas.heightBack, areas.heightFront)
  const sheetLength = roundCut(tallest)
  const withWaste = net * SHEET_WASTE
  const sheets = Math.max(1, Math.ceil(withWaste / (cover.width * sheetLength)))
  lines.push(line('Zidovi', cover.name, sheets, 'tabla', `korisna širina ${fmt(cover.width)} m, dužina ${fmt(sheetLength)} m`))
  lines.push(line('Zidovi', 'Zidna obloga, neto', round1(net), 'm²', 'otvori su odbijeni', { priceId: 'wall-m2' }))
  return net
}

function wallAreas(dimensions, geometry) {
  const { width, length } = dimensions
  const heightAt = (x, z) => geometry.underside(x, z) - FLOOR_LEVEL
  const side = (x, z0, z1) => {
    const samples = 8
    let area = 0
    let peak = 0
    for (let index = 0; index < samples; index += 1) {
      const zA = z0 + ((z1 - z0) * index) / samples
      const zB = z0 + ((z1 - z0) * (index + 1)) / samples
      const hA = heightAt(x, zA)
      const hB = heightAt(x, zB)
      area += ((hA + hB) / 2) * Math.abs(zB - zA)
      peak = Math.max(peak, hA, hB)
    }
    return { area, peak }
  }
  const end = (z, x0, x1) => {
    const samples = 8
    let area = 0
    let peak = 0
    for (let index = 0; index < samples; index += 1) {
      const xA = x0 + ((x1 - x0) * index) / samples
      const xB = x0 + ((x1 - x0) * (index + 1)) / samples
      const hA = heightAt(xA, z)
      const hB = heightAt(xB, z)
      area += ((hA + hB) / 2) * Math.abs(xB - xA)
      peak = Math.max(peak, hA, hB)
    }
    return { area, peak }
  }
  const left = side(-width / 2, -length / 2, length / 2)
  const right = side(width / 2, -length / 2, length / 2)
  const back = end(-length / 2, -width / 2, width / 2)
  const front = end(length / 2, -width / 2, width / 2)
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

function roofPriceId(id) {
  if (id === 'glineni-crep' || id === 'betonski-crep' || id === 'bitumenska-sindra' || id === 'vlakno-cement' || String(id).includes('crep')) {
    return 'tile-m2'
  }
  return 'sheet-m2'
}

function wallCover(id) {
  if (id.startsWith('sendvic')) return { kind: 'panel', width: 1, name: 'Sendvič panel' }
  if (id === 'trapez-t35-braon') return { kind: 'sheet', width: 1, name: 'Trapezni lim T35' }
  if (id.startsWith('trapez')) return { kind: 'sheet', width: 1.1, name: 'Trapezni lim T18' }
  if (id === 'fasadna-cigla') return { kind: 'masonry', name: 'Fasadna cigla' }
  if (id === 'zaribani-malter') return { kind: 'masonry', name: 'Zidani zid, zaribani malter' }
  if (id === 'betonski-blok') return { kind: 'masonry', name: 'Betonski blok 39×19' }
  if (id === 'drvena-daska') return { kind: 'boards', name: 'Daska' }
  return { kind: 'sheet', width: 1.1, name: 'Zidna obloga' }
}

function pushRoofCover(lines, notes, warnings, scene, metrics) {
  const id = scene.roofMaterialId
  const area = metrics.area
  const pitched = metrics.roof.kind !== 'flat'
  if (id === 'glineni-crep' || id === 'betonski-crep') {
    const each = id === 'glineni-crep' ? 15 : 10
    lines.push(line('Krov', id === 'glineni-crep' ? 'Glineni crep' : 'Betonski crep', Math.ceil(area * each * 1.05), 'kom', `${fmt(area)} m² + 5% loma`))
    lines.push(line('Krov', 'Površina pokrivača', round1(area), 'm²', '', { priceId: 'tile-m2' }))
    if (id === 'glineni-crep' && metrics.roof.pitch < 22) warnings.push('Glineni crep traži nagib od bar 22°. Na manjem padu voda može da se vraća.')
    if (id === 'betonski-crep' && metrics.roof.pitch < 15) warnings.push('Betonski crep traži nagib od bar 15°.')
  } else if (id === 'bitumenska-sindra') {
    lines.push(line('Krov', 'Bitumenska šindra', round1(area * 1.1), 'm²', 'uračunat preklop', { priceId: 'tile-m2' }))
    if (pitched && metrics.roof.pitch < 12) warnings.push('Šindra na nagibu ispod 12° traži podlogu od dasaka ili OSB-a, ovde nije uračunata.')
  } else if (id === 'bitumenska-traka') {
    lines.push(line('Krov', 'Bitumenska traka', round1(area * 1.15), 'm²', 'dva sloja na preklopu', { priceId: 'sheet-m2' }))
  } else {
    const useful = id === 'krov-trapez-antracit' ? 1 : id === 'vlakno-cement' ? 1.05 : 1.1
    const name =
      id === 'krov-trapez-antracit'
        ? 'Trapezni lim T35'
        : id === 'vlakno-cement'
          ? 'Vlaknasto-cementna ploča'
          : id.startsWith('limeni-crep')
            ? 'Limeni crep'
            : 'Trapezni lim T18'
    const longest = Math.max(...metrics.slopes.map((slope) => slope.slopeLength))
    const sheetLength = roundCut(longest)
    const sheets = metrics.slopes.reduce(
      (sum, slope) => sum + Math.ceil(slope.alongCover / useful),
      0,
    )
    lines.push(line('Krov', name, sheets, 'tabla', `korisna širina ${fmt(useful)} m, dužina ${fmt(sheetLength)} m`))
    lines.push(line('Krov', 'Krovna površina', round1(area), 'm²', '', { priceId: roofPriceId(id) }))
    if (!pitched && (id.startsWith('krov-trapez') || id.startsWith('limeni-crep') || id === 'vlakno-cement')) {
      warnings.push('Ravan limeni krov zadržava vodu. Za lim uzmi bar jednu vodu i pad od 5°.')
    }
  }
  if (metrics.roof.kind === 'duo') {
    const ridge = (metrics.roof.ridge === 'length' ? scene.dimensions.length : scene.dimensions.width) + ROOF_OVERHANG * 2
    lines.push(line('Krov', 'Slemenska opšivka', roundCut(ridge), 'm', '', { priceId: 'ridge-m' }))
  }
  notes.push('Dužina table je kosina sa strehom, zaokružena na 5 cm naviše.')
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

function pushPedestrian(lines, doors) {
  if (!doors.length) return
  const area = doors.reduce((sum, item) => sum + item.width * item.height, 0)
  lines.push(line('Stolarija', 'Bočna pešačka vrata', doors.length, 'kom', `ukupno ${fmt(area)} m² otvora`))
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
  const leafHeight = door.height
  const wallName = wallFrame(door.wall || 'front', dimensions).label.toLowerCase()
  if (door.style === 'roller') {
    lines.push(line('Vrata', 'Rolo kutija sa osovinom', 1, 'kom', `${wallName}, širina otvora ${fmt(door.width)} m`))
    lines.push(line('Vrata', 'Vođice rolo vrata', 2, 'kom', `dužina ${fmt(door.height)} m`))
    lines.push(line('Vrata', 'Rolo plašt', round1(door.width * door.height), 'm²', 'lamele pune visine otvora'))
    lines.push(line('Vrata', 'Završna lamela', 1, 'kom', ''))
    notes.push('Rolo je računat na ručni pogon. Motor, daljinac i opruga nisu na spisku.')
    if (door.width > 5) warnings.push('Rolo šire od 5 m obično traži motor i jaču osovinu. To nije na spisku.')
    return
  }
  const leaves = door.style === 'double' ? 2 : 1
  const leafWidth = door.style === 'double' ? door.width / 2 - 0.012 : door.width
  const hinges = hingeCount(leafHeight)
  lines.push(line('Vrata', door.style === 'double' ? 'Krila, limena' : 'Krilo, limeno', leaves, 'kom', `${fmt(leafWidth)} × ${fmt(leafHeight)} m`))
  lines.push(line('Vrata', 'Šarke na krilu', leaves * hinges, 'kom', hinges === 3 ? 'krilo je više od 2 m, idu 3 šarke' : 'krilo do 2 m, idu 2 šarke'))
  lines.push(line('Vrata', 'Brava sa kvakom', 1, 'kom', ''))
  if (door.style === 'double') lines.push(line('Vrata', 'Podni i gornji zasun pasivnog krila', 1, 'kom', ''))
  if (leafWidth > 1.25) notes.push('Krilo šire od 1,25 m je teško za svakodnevno otvaranje. Dvokrilna ili rolo vrata su mirnija.')
  if (!door.wicket) return
  const wicketWidth = Math.min(0.9, leafWidth - 0.28)
  const wicketHeight = Math.min(HINGE_LIMIT, leafHeight - 0.16)
  if (wicketWidth < 0.72) return
  const wicketHinges = hingeCount(wicketHeight)
  lines.push(line('Vrata', 'Pešačka vrata na krilu', 1, 'kom', `${fmt(wicketWidth)} × ${fmt(wicketHeight)} m`))
  lines.push(line('Vrata', 'Šarke pešačkih vrata', wicketHinges, 'kom', wicketHinges === 3 ? 'preko 2 m' : 'do 2 m'))
  lines.push(line('Vrata', 'Brava pešačkih vrata', 1, 'kom', ''))
}

function pushWindows(lines, windows) {
  if (windows.length === 0) return
  const counts = new Map()
  windows.forEach((item) => counts.set(item.type, (counts.get(item.type) ?? 0) + 1))
  const names = { fixed: 'Fiksni prozor', single: 'Jednokrilni prozor', double: 'Dvokrilni prozor' }
  counts.forEach((count, type) => {
    lines.push(line('Stolarija', names[type] ?? 'Prozor', count, 'kom', 'okvir, staklo i dihtung u kompletu'))
  })
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
