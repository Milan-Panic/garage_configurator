import { CANOPY_FREE_AREA, canopySpan } from './buildings'
import { findCollisions } from './collide'
import { electricLayout } from './electric'
import { FLOOR_LEVEL, LIGHT_STRUCTURE, ROOF_OVERHANG } from './config'
import { wallFrame } from './layout'
import { FLOOR_FINISHES, FRAME_COLORS, ROOF_MATERIALS, WALL_MATERIALS, findMaterial } from './materials'
import { roofGeometry, roofMetrics } from './roof'
import { roomBlocksOpening, roomBox, roomKind } from './rooms'
import { placeName } from './site'
import { skylightLayout } from './skylights'
import { POST_SPACING, TRUSS_SPAN_LIMIT, profileSet, segmentLength, structureFrame } from './structure'

const SHEET_WASTE = 1.08
const HINGE_LIMIT = 2
const OSB_SHEET = 2.5 * 1.25
const SOLAR_PANEL_KW = 0.45
const SOLAR_PANEL_AREA = 2
const SOLAR_FREE_KW = 10.8

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

  const frame = structureFrame(scene)
  const profiles = profileSet(dimensions, frame)
  const sizing = frame.sizing
  const lengthsOf = (segments) => segments.map(segmentLength)
  const section = profiles.post
  pushCuts(lines, 'Konstrukcija', `Stubovi, ${section.name}`, frame.posts.map((post) => post.height), section.priceId)
  notes.push(
    `Stubovi idu na uglove i na svakih najviše ${POST_SPACING.toFixed(1).replace('.', ',')} m. Uz vrata stoje dovratnici, a stub koji bi pao u prozor pomeren je uz njegovu ivicu. Presek je uobičajen za lake montažne objekte: do 4,5 m i 2,7 m visine stub 80×80×2, preko toga 80×80×3, preko 6,5 m ili 3,2 m visine 100×100×3. Ovo nije statički proračun.`,
  )

  const plates = plateLengths(dimensions, metrics)
  pushCuts(lines, 'Konstrukcija', `Venci, ${profiles.plate.name}`, plates, profiles.plate.priceId)
  const girts = []
  for (let row = 0; row < frame.girtRows; row += 1) girts.push(dimensions.width, dimensions.width, dimensions.length, dimensions.length)
  pushCuts(lines, 'Konstrukcija', `Zidni pojasevi, ${profiles.girt.name}`, girts, profiles.girt.priceId)
  if (frame.headers.length) {
    pushCuts(lines, 'Konstrukcija', `Nadvratnici, ${profiles.header.name}`, lengthsOf(frame.headers), profiles.header.priceId)
  }

  if (frame.truss) {
    const bottom = frame.chords.length ? frame.chords : frame.ties
    pushCuts(lines, 'Konstrukcija', `Rešetkasti nosači, gornji pojas, ${profiles.rafter.name}`, lengthsOf(frame.rafters), profiles.rafter.priceId)
    pushCuts(lines, 'Konstrukcija', `Rešetkasti nosači, donji pojas, ${profiles.tie.name}`, lengthsOf(bottom), profiles.tie.priceId)
    pushCuts(lines, 'Konstrukcija', `Rešetkasti nosači, ispuna, ${profiles.web.name}`, lengthsOf([...frame.webs, ...frame.kings]), profiles.web.priceId)
    pushCuts(lines, 'Konstrukcija', `Rožnjače, ${profiles.purlin.name}`, lengthsOf(frame.purlins), profiles.purlin.priceId)
    notes.push(`Rešetkasti nosači stoje na ${fmt(sizing.spacing)} m, visine ${fmt(frame.trussDepth)} m, a lim nose rožnjače. Rešetka se vari u radionici i donosi u komadu.`)
    if (roof.kind !== 'duo') notes.push(`Donji pojas rešetke je ${fmt(frame.trussDepth)} m ispod krova, pa je toliko manja slobodna visina ispod nosača.`)
  } else if (frame.purlins.length === 0) {
    pushCuts(lines, 'Konstrukcija', `Krovni nosači, ${profiles.rafter.name}`, lengthsOf(frame.rafters), profiles.rafter.priceId)
    notes.push('Krovni nosači idu preko kraćeg raspona na najviše 1,2 m i sami nose lim, bez rožnjača.')
  } else {
    pushCuts(lines, 'Konstrukcija', `Rogovi, ${profiles.rafter.name}`, lengthsOf(frame.rafters), profiles.rafter.priceId)
    pushCuts(lines, 'Konstrukcija', `Rožnjače, ${profiles.purlin.name}`, lengthsOf(frame.purlins), profiles.purlin.priceId)
    notes.push('Rogovi su na najviše 1,2 m, rožnjače na najviše 0,9 m po kosini.')
  }
  if (!frame.truss && frame.ties.length) {
    pushCuts(lines, 'Konstrukcija', `Zatege vezača, ${profiles.tie.name}`, lengthsOf([...frame.ties, ...frame.kings]), profiles.tie.priceId)
    notes.push('Kod dve vode svaki par rogova ima zategu u visini venca, da krov ne gura zidove u stranu.')
  }
  const wallBraces = frame.braces.filter((brace) => brace.kind === 'zid')
  const roofBraces = frame.braces.filter((brace) => brace.kind === 'krov')
  if (wallBraces.length) pushCuts(lines, 'Konstrukcija', `Zidna ukrućenja (dijagonale), ${profiles.brace.name}`, lengthsOf(wallBraces), profiles.brace.priceId)
  if (roofBraces.length) pushCuts(lines, 'Konstrukcija', `Krovni spregovi (dijagonale), ${profiles.brace.name}`, lengthsOf(roofBraces), profiles.brace.priceId)
  notes.push('Dijagonale idu u krajnja polja svakog zida i u krajnja polja krova. One nose vetar; bez njih se skelet ljulja i oslanja samo na lim.')
  if (frame.unbraced.length) {
    const names = frame.unbraced.map((id) => wallFrame(id, dimensions).label.toLowerCase()).join(', ')
    warnings.push(`Nema slobodnog polja za dijagonalu: ${names}. Otvori zauzimaju ceo zid, pa tu treba krut ram oko vrata ili uži otvor.`)
  }
  if (door.style !== 'none' && door.width > 3 && frame.bearing.includes(door.wall)) {
    warnings.push(`Krovni nosači naležu na zid sa vratima, pa nadvratnik od ${fmt(door.width)} m nosi i krov. Treba jači nadvratnik od onog u računici ili vrata na zabatnom zidu.`)
  }
  const used = Math.round((frame.truss ? sizing.chord.use : sizing.rafter.use) * 100)
  notes.push(
    `Opterećenje: sneg ${fmt(sizing.snow)} kN/m² (${placeName(scene.site)}, ${scene.site?.altitude ?? 117} m n.v.) i ${fmt(sizing.areaLoad - sizing.snow)} kN/m² sopstvene težine. Nosač na ${fmt(sizing.spacing)} m nosi ${fmt(sizing.load)} kN/m preko ${fmt(sizing.span)} m, pa je ${profiles.rafter.name} iskorišćen ${used}%.`,
  )
  if (!sizing.ok) {
    warnings.push(
      frame.truss
        ? `Rešetka premošćuje ${fmt(sizing.span)} m pod snegom od ${fmt(sizing.snow)} kN/m². To je preko onoga što ova računica pokriva (${TRUSS_SPAN_LIMIT} m), pa konstrukciju mora da odredi statičar.`
        : `Krovni nosač premošćuje ${fmt(sizing.span)} m pod snegom od ${fmt(sizing.snow)} kN/m², a najjači kutijasti profil je iskorišćen ${used}%. Uključi rešetkasti nosač u delu Objekat, pod Krov.`,
    )
  }
  if (sizing.wind >= 0.9) notes.push('Izložena lokacija: dodato je po jedno polje sa dijagonalom u zidovima i krovu, a stubovi su za broj jači.')

  if (dimensions.width > LIGHT_STRUCTURE.width || dimensions.length > LIGHT_STRUCTURE.length || dimensions.height > LIGHT_STRUCTURE.height) {
    warnings.push(`Preseci u računici važe do ${LIGHT_STRUCTURE.width} × ${LIGHT_STRUCTURE.length} m i visine ${String(LIGHT_STRUCTURE.height).replace('.', ',')} m. Za ove mere statičar mora da odredi konstrukciju, pa je cena konstrukcije samo gruba.`)
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
  pushSkylights(lines, notes, warnings, scene)
  pushRooms(lines, notes, warnings, scene)
  pushLofts(lines, notes, warnings, scene, geometry)
  pushFasteners(lines, wallNet + metrics.area, frame.posts.length)
  pushElectric(lines, notes, warnings, scene)
  pushSolar(lines, warnings, scene, metrics)
  pushCanopy(lines, warnings, scene)
  pushVentilation(lines, notes, warnings, scene)
  pushEquipmentNotes(notes, warnings, scene)
  const clashes = findCollisions(scene).size
  if (clashes) warnings.push(`${clashes} ${clashes === 1 ? 'predmet stoji' : 'predmeta stoje'} jedan u drugom ili u pregradi. U prikazu su crveni; razmakni ih.`)

  notes.push('Betonska ploča, oluk i vrata su posebni poslovi. Količine nisu statički proračun, a cene na strani Cene su orijentacione.')
  const tagged = applyUnits(lines, notes, scene).map((entry) => ({ ...entry, skill: entry.skill || skillFor(entry) }))
  const segments = {}
  tagged.forEach((entry) => {
    if (!segments[entry.skill]) segments[entry.skill] = []
    segments[entry.skill].push(entry)
  })
  return { lines: tagged, notes, warnings, segments, sizing, profiles }
}

function pushSkylights(lines, notes, warnings, scene) {
  const layout = skylightLayout(scene.dimensions, scene.roof, scene.skylights)
  if (layout.items.length === 0) return
  if (layout.kind === 'kupola') {
    lines.push(line('Krov', 'Svetlosna kupola 1 × 1 m', layout.items.length, 'kom', 'sa podnožjem i opšivkom', { priceId: 'skylight-dome', once: true }))
  } else {
    lines.push(line('Krov', 'Svetlosna traka', round1(layout.area), 'm²', `${layout.items.length} traka širine do 1 m, niz krov`, { priceId: 'skylight-strip-m2', once: true }))
  }
  notes.push('Krovni prozori staju između nosača. Oko svakog ide izmena u rožnjačama i opšivka, što radi limar.')
  if (scene.roof.kind === 'flat') warnings.push('Krovni prozor na ravnom krovu je najčešće mesto prokišnjavanja. Traži podignuto podnožje od bar 15 cm.')
  if ((scene.electric?.solar || 0) > 0) notes.push('Solarni paneli i krovni prozori dele isti krov. Raspored panela u prikazu ne zaobilazi prozore.')
}

// Galerija iznad prostorije: nosači na 50 cm, OSB, ograda i stepenice.
function pushLofts(lines, notes, warnings, scene, geometry) {
  const lofts = (scene.rooms || []).filter((room) => room.loft)
  if (lofts.length === 0) return
  const joists = []
  let deck = 0
  let railing = 0
  lofts.forEach((room) => {
    const box = roomBox(room, scene.dimensions)
    const count = Math.ceil(room.width / 0.5) + 1
    for (let index = 0; index < count; index += 1) joists.push(room.depth)
    deck += room.width * room.depth
    railing += room.width + room.depth
    const clear = geometry.underside(box.centerX, box.centerZ) - (box.floor + box.height + 0.15)
    if (clear < 1.2) warnings.push(`Iznad prostorije „${roomKind(room.kind).name}” ostaje samo ${fmt(Math.max(0, clear))} m do krova. Galerija tu nema smisla; podigni zidove ili izaberi krov sa nagibom.`)
    else if (clear < 1.9) notes.push(`Galerija iznad prostorije „${roomKind(room.kind).name}” ima ${fmt(clear)} m visine, pa služi za odlaganje, ne za boravak.`)
  })
  pushCuts(lines, 'Galerija', 'Nosači poda galerije, kutija 80×40×2', joists, 'box-80x40x2')
  lines.push(line('Galerija', 'OSB 22 mm, pod galerije', Math.ceil((deck * 1.08) / OSB_SHEET), 'ploča', `${fmt(deck)} m², ploča 2,50 × 1,25 m`, { priceId: 'osb22-sheet', once: true, skill: 'konstrukcija' }))
  lines.push(line('Galerija', 'Ograda galerije, visine 1,0 m', roundCut(railing), 'm', 'na otvorenim stranama', { priceId: 'railing-m', once: true, skill: 'konstrukcija' }))
  lines.push(line('Galerija', 'Stepenice za galeriju', lofts.length, 'kom', 'čelične, strme, sa rukohvatom', { priceId: 'loft-stairs', once: true, skill: 'konstrukcija' }))
  notes.push('Pod galerije je računat na oko 150 kg/m², što je odlaganje, a ne magacin. Za teret traži proračun.')
}

// Više jedinica u nizu: omotač i konstrukcija se množe, a zid između dve jedinice se oblaže jednom.
function applyUnits(lines, notes, scene) {
  const units = scene.units || 1
  if (units <= 1) return lines
  const SHELL = new Set(['Konstrukcija', 'Zidovi', 'Krov', 'Izolacija', 'Oluk', 'Temelj', 'Pod', 'Vrata', 'Stolarija', 'Spojni materijal'])
  const { width, length, height } = scene.dimensions
  const perimeter = (width + length) * 2 * height
  const wallFactor = (units * perimeter - (units - 1) * length * height) / perimeter
  notes.push(`Niz od ${units} jedinica: konstrukcija, krov, ploča i otvori su pomnoženi sa ${units}. Zid između dve jedinice oblaže se samo jednom. Struja, prostorije i dodaci važe za ceo niz.`)
  return lines.map((entry) => {
    if (!SHELL.has(entry.section) || entry.once) return entry
    const factor = entry.section === 'Zidovi' && (entry.unit === 'm²' || entry.unit === 'tabla') ? wallFactor : units
    const scale = (value) => (Number.isInteger(value) && factor === units ? value * units : Math.round(value * factor * 100) / 100)
    return {
      ...entry,
      quantity: entry.unit === 'tabla' ? Math.ceil(entry.quantity * factor) : scale(entry.quantity),
      meters: entry.meters == null ? entry.meters : Math.round(entry.meters * factor * 100) / 100,
      detail: entry.detail ? `${units} jedinice · po jedinici: ${entry.detail}` : `${units} jedinice`,
    }
  })
}

function pushRooms(lines, notes, warnings, scene) {
  const rooms = scene.rooms || []
  if (rooms.length === 0) return
  let panel = 0
  let ceiling = 0
  rooms.forEach((room) => {
    const box = roomBox(room, scene.dimensions)
    panel += (room.width + room.depth) * box.height - box.doorWidth * box.doorHeight
    ceiling += room.width * room.depth
    if (roomBlocksOpening(room, scene.dimensions, scene.door.style === 'none' ? null : scene.door)) {
      warnings.push(`${roomKind(room.kind).name} stoji ispred glavnih vrata. Pomeri prostoriju u drugi ugao ili pomeri vrata.`)
    }
    if ((scene.pedestrianDoors || []).some((item) => roomBlocksOpening(room, scene.dimensions, item))) {
      notes.push(`Bočna vrata vode pravo u prostoriju „${roomKind(room.kind).name}”.`)
    }
  })
  const names = rooms.map((room) => `${roomKind(room.kind).name.toLowerCase()} ${fmt(room.width)} × ${fmt(room.depth)} m`).join(', ')
  lines.push(line('Prostorije', 'Pregradni sendvič panel 50 mm', round1(panel * 1.05), 'm²', names, { priceId: 'partition-m2', skill: 'konstrukcija' }))
  lines.push(line('Prostorije', 'Plafon prostorije, panel 50 mm', round1(ceiling * 1.05), 'm²', 'nosi se na pregrade i spoljne zidove', { priceId: 'partition-m2', skill: 'konstrukcija' }))
  lines.push(line('Prostorije', 'Unutrašnja vrata sa štokom', rooms.length, 'kom', '0,80 × 2,00 m', { priceId: 'interior-door', skill: 'stolarija' }))
  const toilets = rooms.filter((room) => room.kind === 'wc').length
  if (toilets) {
    lines.push(line('Prostorije', 'Sanitarni komplet', toilets, 'kompl', 'šolja, vodokotlić, lavabo i slavina', { priceId: 'wc-set', skill: 'oprema' }))
    warnings.push('WC traži dovod vode i odvod u kanalizaciju ili septičku jamu. Cevi idu u ploču, pa ih treba rešiti pre betoniranja.')
  }
  if (rooms.some((room) => room.kind === 'kotlarnica')) {
    warnings.push('Kotlarnica traži dimnjak, dovod svežeg vazduha i negorivu oblogu oko kotla. Za gas i veće kotlove obavezan je projekat.')
  }
  if (rooms.some((room) => room.kind === 'kancelarija') && scene.insulation === 'none') {
    notes.push('Kancelarija u hladnom objektu se teško greje. Pregradni panel je izolovan, ali spoljna dva zida nisu.')
  }
  notes.push('Prostorije su od pregradnog panela do 2,5 m, sa svojim plafonom. Prostor iznad plafona ostaje za odlaganje.')
}

// Nameštaj je rekvizit i ne ulazi u cenu, ali neka oprema postavlja uslove objektu.
function pushEquipmentNotes(notes, warnings, scene) {
  const items = scene.furniture || []
  if (items.some((item) => item.type === 'lift2' || item.type === 'lift4')) {
    warnings.push('Dizalica se ankeriše u ploču: ispod stubova treba bar 20 cm armiranog betona C25/30, a računica broji ploču od 15 cm. Reci to zidaru pre betoniranja.')
    if (scene.dimensions.height < 3.8) {
      warnings.push(`Za pun hod dizalice treba oko 3,8 m do krova. Objekat ima ${fmt(scene.dimensions.height)} m, pa se viši auto neće moći podići do kraja.`)
    }
    if (!scene.electric?.enabled || scene.electric.phase !== 'three') notes.push('Većina dizalica ima trofazni motor. Uključi trofaznu struju u delu Dodaci.')
  }
  if (items.some((item) => item.type === 'compressor' || item.type === 'welder') && scene.electric?.enabled && scene.electric.phase !== 'three') {
    notes.push('Kompresor i aparat za varenje vuku jaku struju. Proveri da li monofazni priključak to nosi.')
  }
  if (items.some((item) => item.type === 'stove' || item.type === 'boiler')) {
    notes.push('Peć i kotao traže dimnjak kroz krov sa opšivkom i razmak od limenog zida. To nije u računici.')
  }
}

function skillFor(entry) {
  if (entry.section === 'Struja') return 'struja'
  if (entry.section === 'Oprema') return 'oprema'
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
  if (cover.kind === 'boards') {
    lines.push(line('Zidovi', `${cover.name}${colorNote}, sa 8% reza`, round1(net * SHEET_WASTE), 'm²', '', { priceId: material.priceId }))
    lines.push(line('Zidovi', cover.sub ?? 'Podkonstrukcija, letva 50×30', Math.ceil(net / 0.5), 'm', 'nosači obloge na 50 cm'))
    return net
  }
  const tallest = Math.max(areas.heightLeft, areas.heightRight, areas.heightBack, areas.heightFront)
  const sheetLength = roundCut(tallest)
  const sheets = Math.max(1, Math.ceil((net * SHEET_WASTE) / (cover.width * sheetLength)))
  const trims = roundCut(tallest * 4 + (dimensions.width + dimensions.length) * 2)
  lines.push(line('Zidovi', `${cover.name}${colorNote}`, sheets, 'tabla', `korisna širina ${fmt(cover.width)} m, dužina ${fmt(sheetLength)} m`))
  lines.push(line('Zidovi', 'Zidna obloga, neto', round1(net), 'm²', 'otvori su odbijeni', { priceId: material.priceId }))
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
  const priceId = material.priceId
  const colorNote = scene.roofColor ? `, RAL ${scene.roofColor}` : ''

  if (cover.kind === 'membrane') {
    lines.push(line('Krov', cover.name, round1(area * (cover.waste ?? 1.15)), 'm²', cover.waste ? 'jedan komad, sa prepustom' : 'dva sloja na preklopu', { priceId }))
    lines.push(line('Krov', 'OSB podloga 18 mm', Math.ceil((area * 1.05) / OSB_SHEET), 'ploča', 'ploča 2,50 × 1,25 m'))
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

  if (!pitched && cover.kind !== 'membrane') {
    warnings.push(`${material.name} na ravnom krovu zadržava vodu. Uzmi bar jednu vodu i pad od ${cover.minPitch ?? 5}°.`)
  } else if (pitched && cover.minPitch && pitch < cover.minPitch) {
    warnings.push(`${material.name} traži nagib od bar ${cover.minPitch}°. Na ${pitch}° voda može da se vraća ispod pokrivača.`)
  }
  if (cover.kind === 'membrane' && pitch > 20) {
    notes.push('Membrana na kosom krovu radi, ali obično se bira lim jer lepše izgleda.')
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
    if (dimensions.length < door.height + 0.6) warnings.push('Šine sekcijskih vrata idu pod plafonom dublje od visine vrata. Objekat je prekratak.')
    return
  }

  if (door.style === 'tilt') {
    lines.push(line('Vrata', 'Kipna vrata, krilo sa okvirom', 1, 'kom', size))
    lines.push(line('Vrata', 'Opružni mehanizam sa bočnim šinama', 2, 'kom', 'levo i desno'))
    lines.push(line('Vrata', 'Brava sa kvakom', 1, 'kom', ''))
    if (door.motor) lines.push(line('Vrata', 'Motor za kipna vrata sa 2 daljinska', 1, 'kom', '', { priceId: 'motor' }))
    if (door.width > 3.2) warnings.push('Kipna vrata šira od 3,2 m su teška i retka. Sekcijska su bolji izbor.')
    notes.push('Kipno krilo pri otvaranju ulazi u objekat oko 2/3 visine. Ne parkiraj auto do samih vrata.')
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

function pushElectric(lines, notes, warnings, scene) {
  const electric = scene.electric
  if (!electric?.enabled) return
  const three = electric.phase === 'three'
  const { width, length } = scene.dimensions
  const points = electric.sockets + electric.lights
  const cable = roundCut((width + length) * 2 * 0.75 + points * 2)
  lines.push(line('Struja', three ? 'Razvodna tabla, trofazna' : 'Razvodna tabla, monofazna', 1, 'kom', 'sa osiguračima i zaštitnom sklopkom', { priceId: three ? 'el-board-3f' : 'el-board-1f' }))
  lines.push(line('Struja', 'Napojni kabl od brojila', roundCut(electric.distance + 3), 'm', 'udaljenost od brojila i 3 m za uvod', { priceId: three ? 'el-feed-3f' : 'el-feed-1f' }))
  lines.push(line('Struja', 'Instalacioni kabl', cable, 'm', 'procena po obimu objekta i broju tačaka', { priceId: 'el-cable-m' }))
  lines.push(line('Struja', 'Utičnice', electric.sockets, 'kom', '', { priceId: 'el-socket' }))
  if (three) lines.push(line('Struja', 'Trofazna utičnica', 1, 'kom', 'za kompresor ili mašinu', { priceId: 'el-socket-3f' }))
  lines.push(line('Struja', 'LED svetiljke', electric.lights, 'kom', '', { priceId: 'el-light' }))
  const layout = electricLayout(scene)
  if (layout.switches.length) lines.push(line('Struja', 'Prekidači', layout.switches.length, 'kom', 'uz ulaz, na 1,10 m', { priceId: 'el-switch' }))
  if (layout.conduitLength > 0) lines.push(line('Struja', 'Kanalice i cevi', roundCut(layout.conduitLength), 'm', 'po rasporedu iz prikaza'))
  if (electric.charger === 'ready') {
    lines.push(line('Struja', 'Priprema za punjač', 1, 'kompl', 'cev, kabl i osigurač za kasniju ugradnju', { priceId: 'ev-ready' }))
  } else if (electric.charger === 'charger') {
    lines.push(line('Struja', three ? 'Punjač za auto 11 kW' : 'Punjač za auto 7,4 kW', 1, 'kom', 'zidni punjač sa ugradnjom', { priceId: three ? 'ev-charger-11' : 'ev-charger-7' }))
  }
  if (electric.charger !== 'none' || three) {
    warnings.push('Punjač i trofazne mašine zavise od priključne snage na lokaciji. Neka električar proveri snagu pre porudžbine.')
  }
  notes.push('Količine za struju su procena. Instalaciju izvodi i proverava električar.')
}

function pushSolar(lines, warnings, scene, metrics) {
  const solar = scene.electric?.solar || 0
  if (solar <= 0) return
  const panels = Math.ceil(solar / SOLAR_PANEL_KW)
  lines.push(line('Struja', 'Solarna elektrana', solar, 'kW', `oko ${panels} panela, invertor i nosači`, { priceId: 'pv-kw' }))
  warnings.push('Solarni paneli opterećuju krov. Proveri nosivost i uslove priključenja na mrežu pre porudžbine.')
  if (panels * SOLAR_PANEL_AREA > metrics.area) warnings.push('Ovoliko panela ne staje na krov. Smanji snagu elektrane.')
  if (solar > SOLAR_FREE_KW) warnings.push('Elektrana preko 10,8 kW traži rešenje o odobrenju. Vidi Vodič za dozvole.')
}

function pushCanopy(lines, warnings, scene) {
  const canopy = scene.canopy
  if (!canopy?.enabled) return
  const length = canopySpan(canopy, scene.dimensions)
  const area = round1(length * canopy.depth)
  lines.push(line('Nadstrešnica', canopy.closed ? 'Aneks, konstrukcija i krovni lim' : 'Nadstrešnica, stubovi i krovni lim', area, 'm²', `${fmt(canopy.depth)} × ${fmt(length)} m, uz zid`, { priceId: 'canopy-m2', skill: 'konstrukcija' }))
  if (canopy.closed) {
    const wall = findMaterial(WALL_MATERIALS, scene.wallMaterialId)
    const wallArea = round1((length + canopy.depth * 2) * (scene.dimensions.height - 0.2) - 1.9)
    lines.push(line('Nadstrešnica', `Zidovi aneksa, ${wall.name}`, wallArea, 'm²', 'tri strane, četvrta je zid objekta', { priceId: wall.priceId, skill: 'konstrukcija' }))
    lines.push(line('Nadstrešnica', 'Ulazna vrata aneksa', 1, 'kom', '0,90 × 2,00 m'))
    warnings.push('Zatvoren aneks nije nadstrešnica: ulazi u površinu objekta kod dozvole. Vidi Vodič za dozvole.')
  }
  if (!canopy.closed && area > CANOPY_FREE_AREA) {
    warnings.push(`Nadstrešnica preko ${CANOPY_FREE_AREA} m² nije među objektima bez akta. Vidi Vodič za dozvole.`)
  }
}

function pushVentilation(lines, notes, warnings, scene) {
  const area = scene.dimensions.width * scene.dimensions.length
  if (scene.ventilation === 'grilles') {
    const count = Math.max(2, Math.ceil(area / 20) * 2)
    lines.push(line('Oprema', 'Ventilacione rešetke', count, 'kom', 'pri podu i ispod krova, na naspramnim zidovima', { priceId: 'vent-grille' }))
    notes.push('Broj rešetki je procena po površini poda.')
  } else if (scene.ventilation === 'fan') {
    const count = Math.max(1, Math.ceil(area / 40))
    lines.push(line('Oprema', 'Zidni ventilatori', count, 'kom', 'sa žaluzinom', { priceId: 'vent-fan' }))
    notes.push('Broj ventilatora je procena po površini poda. Za radionicu sa isparenjima traži proračun.')
    if (!scene.electric?.enabled) warnings.push('Ventilator traži struju. Uključi struju u delu Dodaci.')
  }
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
