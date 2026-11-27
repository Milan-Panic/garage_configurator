// Sistemi konstrukcije: isti objekat može da se napravi na više načina. Sistem je
// podatak, a raspored elemenata pravi structureFrame po porodici sistema:
// skeleton (stubovi na 2 m), frames (stub i rešetka) i portal (stub i rog kruto spojeni).
import { BEAM_PROFILES, C_FRAME_PROFILES, FRAME_SECTIONS, HEA, IPE, TUBE_PROFILES, Z_PROFILES } from './checks'

const WELDED = ['paint', 'hdg', 'duplex']

export const SYSTEMS = [
  {
    id: 'skelet',
    family: 'skeleton',
    name: 'Garažni skelet',
    pitch: 'Kutijasti stubovi na 2 m i nosači na 1,2 m. Najjednostavnija izrada, svaki bravar je radi.',
    best: 'garaže i šupe do 6 m raspona',
    span: { max: 8 },
    protections: WELDED,
    fabricationId: 'fab-skelet-kg',
    anchor: { label: 'dva hemijska ankera M12', capacity: 16 },
  },
  {
    id: 'radionica',
    family: 'frames',
    name: 'Radionica – okviri sa rešetkama',
    pitch: 'Stub i rešetka čine okvir na 3–5 m, a između njih idu jače rožnjače. Manje komada i manje čelika za veće raspone.',
    best: 'radionice i magacini od 6 do 12 m raspona',
    span: { min: 5, max: 12 },
    frameSpacing: { min: 3, max: 5, step: 0.5, default: 4 },
    // Rožnjače idu u čvorove rešetke, pa pojas ne radi na savijanje.
    purlinMax: 1.5,
    protections: WELDED,
    fabricationId: 'fab-radionica-kg',
    anchor: { label: 'dva hemijska ankera M12', capacity: 16 },
  },
  {
    id: 'cz',
    family: 'portal',
    name: 'Pocinkovani C/Z ram',
    pitch: 'Fabrički pocinkovani C profili spojeni zavrtnjima i pločama, Z rožnjače na preklop. Bez varenja i farbanja, brza montaža, lako produženje.',
    best: 'garaže, radionice i magacini od 5 do 12 m',
    span: { min: 4, max: 12 },
    frameSpacing: { min: 3, max: 6, step: 0.5, default: 4.5 },
    purlinMax: 1.2,
    catalogs: { rafter: C_FRAME_PROFILES, column: C_FRAME_PROFILES, purlin: Z_PROFILES, girt: Z_PROFILES },
    protections: ['factory'],
    fabricationId: 'fab-cz-kg',
    haunch: true,
    anchor: { label: 'četiri hemijska ankera M12 kroz stopu', capacity: 32 },
  },
  {
    id: 'hala',
    family: 'portal',
    name: 'Hala – IPE/HEA ramovi',
    pitch: 'Vruće valjani ramovi na 5–6 m bez zatega i rešetki: čist prostor do krova, a ram može da primi kran ili solarne panele.',
    best: 'radionice i magacini od 8 m naviše',
    span: { min: 8, max: 12 },
    frameSpacing: { min: 4, max: 7, step: 0.5, default: 6 },
    purlinMax: 1.5,
    catalogs: { rafter: IPE, column: [...IPE, ...HEA].sort((a, b) => a.kg - b.kg), purlin: Z_PROFILES, girt: Z_PROFILES },
    protections: WELDED,
    fabricationId: 'fab-hala-kg',
    haunch: true,
    anchor: { label: 'četiri ankera M16 kroz ploču stope', capacity: 48 },
  },
  {
    id: 'kit',
    family: 'portal',
    name: 'Ekonomik kit',
    pitch: 'Lukovi od tankih pocinkovanih cevi na zavrtnje, na 1–1,5 m. Najjeftinije i može sam da se montira, ali nosi malo snega.',
    best: 'nadstrešnice i male šupe u ravnici, do 4,5 m',
    span: { max: 4.5 },
    frameSpacing: { min: 1, max: 1.5, step: 0.25, default: 1.25 },
    purlinMax: 0.9,
    catalogs: { rafter: TUBE_PROFILES, column: TUBE_PROFILES, purlin: BEAM_PROFILES, girt: BEAM_PROFILES },
    protections: ['factory'],
    fabricationId: 'fab-kit-kg',
    anchor: { label: 'dva ankera M10', capacity: 10 },
  },
]

// Zaštita od korozije, cena po kg čelika. Farba je osnova i završna boja posle
// varenja; cink je vruće cinkovanje po SRPS EN ISO 1461; dupleks je cink i boja.
// Fabrički cink je već u ceni pocinkovanih profila, pa nema posebnu stavku.
export const PROTECTIONS = [
  { id: 'paint', name: 'Farba', detail: 'Osnovna i završna boja, 2 sloja. Obnova na 5–10 godina, najviše tamo gde se lim ogrebe.', priceId: 'paint-kg', item: 'Zaštita: osnovna i završna boja, 2 sloja' },
  { id: 'hdg', name: 'Cink', detail: 'Vruće cinkovano posle varenja. Bez održavanja decenijama, ali delovi se na gradilištu spajaju zavrtnjima, ne varom.', priceId: 'hdg-kg', item: 'Zaštita: vruće cinkovanje' },
  { id: 'duplex', name: 'Cink i boja', detail: 'Vruće cinkovano pa ofarbano u RAL tonu. Najduži vek i najlepši izgled, najskuplje.', priceId: 'duplex-kg', item: 'Zaštita: vruće cinkovanje i boja (dupleks)' },
  { id: 'factory', name: 'Fabrički cink', detail: 'Profili dolaze pocinkovani iz fabrike (Z275) i ne seku se ni vare na gradilištu. Cink je tanji od vrućeg cinkovanja, ali ga nije potrebno farbati.', priceId: null, item: null },
]

// Projekat konstrukcije: cena po m² osnove, ali ne manje od ovolike površine.
export const ENGINEERING_MIN_AREA = 100

export const DEFAULT_STRUCTURE = { system: 'skelet', frameSpacing: 4, protection: 'paint', engineering: false, fabrication: false }

export function systemOf(structure) {
  return SYSTEMS.find((entry) => entry.id === structure?.system) ?? SYSTEMS[0]
}

// Zaštita koju sistem dozvoljava; pocinkovani sistemi imaju samo fabrički cink.
export function protectionOf(structure) {
  const allowed = systemOf(structure).protections
  const wanted = allowed.includes(structure?.protection) ? structure.protection : allowed[0]
  return PROTECTIONS.find((entry) => entry.id === wanted) ?? PROTECTIONS[0]
}

export function frameSpacingOf(structure) {
  const limits = systemOf(structure).frameSpacing
  if (!limits) return null
  const number = Number(structure?.frameSpacing)
  if (!Number.isFinite(number)) return limits.default
  return Math.min(limits.max, Math.max(limits.min, Math.round(number / limits.step) * limits.step))
}

export function normalizeStructure(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const system = systemOf(source)
  return {
    system: system.id,
    frameSpacing: frameSpacingOf(source) ?? DEFAULT_STRUCTURE.frameSpacing,
    protection: protectionOf(source).id,
    engineering: Boolean(source.engineering),
    fabrication: Boolean(source.fabrication),
  }
}

// Prelazak na drugi sistem: razmak ramova se vraća na njegov podrazumevani, a zaštita
// ostaje ako je novi sistem dozvoljava.
export function switchSystem(structure, id) {
  const system = SYSTEMS.find((entry) => entry.id === id) ?? SYSTEMS[0]
  return normalizeStructure({ ...structure, system: system.id, frameSpacing: system.frameSpacing?.default })
}

const fmt = (value) => String(value).replace('.', ',')

// Zašto sistem ne odgovara objektu, ili null kad odgovara. `span` je kraći raspon.
export function systemMismatch(system, span) {
  if (system.span?.min && span < system.span.min) return `Za raspon ispod ${fmt(system.span.min)} m ovaj sistem nema smisla.`
  if (system.span?.max && span > system.span.max) return `Za raspon preko ${fmt(system.span.max)} m ovaj sistem nije predviđen.`
  return null
}

// Masa profila po metru, za zaštitu, izradu i poređenje sistema po kilogramima.
export const PROFILE_KG = {
  'box-40x40x2': 2.31,
  'box-60x40x2': 2.93,
  'box-80x40x2': 3.56,
  'box-80x40x3': 5.19,
  'box-100x50x3': 6.6,
  'box-120x60x4': 10.7,
  'box-140x80x4': 13.2,
  'post-80x80x2': 4.82,
  'post-80x80x3': 7.07,
  'post-100x100x3': 8.96,
  'post-120x120x4': 14.4,
  ...Object.fromEntries(FRAME_SECTIONS.map((section) => [section.priceId, Math.round((section.kg / (section.pieces || 1)) * 100) / 100])),
}

export function profileKg(lines) {
  return lines.reduce((sum, line) => sum + (line.meters || 0) * (PROFILE_KG[line.priceId] || 0), 0)
}

export function steelKg(estimate) {
  return profileKg(estimate.lines.filter((line) => line.section === 'Konstrukcija' || line.section === 'Galerija'))
}

// Cena konstrukcije po ceniku: profili, zaštita, izrada i projekat, bez omotača i vrata.
export function structureCost(estimate, catalog) {
  const price = (id) => Number(catalog.find((entry) => entry.id === id)?.price) || 0
  return estimate.lines
    .filter((line) => (line.section === 'Konstrukcija' || line.section === 'Projekat') && line.priceId)
    .reduce((sum, line) => sum + (line.meters ?? line.quantity) * price(line.priceId), 0)
}
