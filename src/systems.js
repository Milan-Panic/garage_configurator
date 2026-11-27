// Sistemi konstrukcije: isti objekat može da se napravi na više načina. Sistem je
// podatak, a raspored elemenata pravi structureFrame po porodici sistema.

export const SYSTEMS = [
  {
    id: 'skelet',
    family: 'skeleton',
    name: 'Garažni skelet',
    pitch: 'Kutijasti stubovi na 2 m i nosači na 1,2 m. Najjednostavnija izrada, svaki bravar je radi.',
    best: 'garaže i šupe do 6 m raspona',
    span: { max: 8 },
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
  },
]

// Zaštita od korozije, cena po kg čelika. Farba je osnova i završna boja posle
// varenja; cink je vruće cinkovanje po SRPS EN ISO 1461; dupleks je cink i boja.
export const PROTECTIONS = [
  { id: 'paint', name: 'Farba', detail: 'Osnovna i završna boja, 2 sloja. Obnova na 5–10 godina, najviše tamo gde se lim ogrebe.', priceId: 'paint-kg', item: 'Zaštita: osnovna i završna boja, 2 sloja' },
  { id: 'hdg', name: 'Cink', detail: 'Vruće cinkovano posle varenja. Bez održavanja decenijama, ali delovi se na gradilištu spajaju zavrtnjima, ne varom.', priceId: 'hdg-kg', item: 'Zaštita: vruće cinkovanje' },
  { id: 'duplex', name: 'Cink i boja', detail: 'Vruće cinkovano pa ofarbano u RAL tonu. Najduži vek i najlepši izgled, najskuplje.', priceId: 'duplex-kg', item: 'Zaštita: vruće cinkovanje i boja (dupleks)' },
]

// Projekat konstrukcije: cena po m² osnove, ali ne manje od ovolike površine.
export const ENGINEERING_MIN_AREA = 100

export const DEFAULT_STRUCTURE = { system: 'skelet', frameSpacing: 4, protection: 'paint', engineering: false }

export function protectionOf(structure) {
  return PROTECTIONS.find((entry) => entry.id === structure?.protection) ?? PROTECTIONS[0]
}

export function systemOf(structure) {
  return SYSTEMS.find((entry) => entry.id === structure?.system) ?? SYSTEMS[0]
}

export function normalizeStructure(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const system = systemOf(source)
  const limits = SYSTEMS.find((entry) => entry.frameSpacing)?.frameSpacing
  const number = Number(source.frameSpacing)
  const frameSpacing = Number.isFinite(number)
    ? Math.min(limits.max, Math.max(limits.min, Math.round(number / limits.step) * limits.step))
    : DEFAULT_STRUCTURE.frameSpacing
  return { system: system.id, frameSpacing, protection: protectionOf(source).id, engineering: Boolean(source.engineering) }
}

// Zašto sistem ne odgovara objektu, ili null kad odgovara. `span` je kraći raspon.
export function systemMismatch(system, span) {
  if (system.span?.min && span < system.span.min) return `Za raspon ispod ${String(system.span.min).replace('.', ',')} m okviri nemaju smisla.`
  if (system.span?.max && span > system.span.max) return `Za raspon preko ${String(system.span.max).replace('.', ',')} m ovaj sistem nije predviđen.`
  return null
}

// Masa kutijastih profila po metru, za poređenje sistema po kilogramima.
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
}

export function profileKg(lines) {
  return lines.reduce((sum, line) => sum + (line.meters || 0) * (PROFILE_KG[line.priceId] || 0), 0)
}

export function steelKg(estimate) {
  return profileKg(estimate.lines.filter((line) => line.section === 'Konstrukcija' || line.section === 'Galerija'))
}

// Cena konstrukcije po ceniku: profili, zaštita i projekat, bez omotača i vrata.
export function structureCost(estimate, catalog) {
  const price = (id) => Number(catalog.find((entry) => entry.id === id)?.price) || 0
  return estimate.lines
    .filter((line) => (line.section === 'Konstrukcija' || line.section === 'Projekat') && line.priceId)
    .reduce((sum, line) => sum + (line.meters ?? line.quantity) * price(line.priceId), 0)
}
