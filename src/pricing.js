// Kako se cena pokazuje kupcu: raspon umesto jednog broja i otvoren spisak
// onoga što nije uračunato. Osnovne cene su procene, pa raspon ide malo ispod
// zbira po stavkama. Procente i iznose ovde podešavamo posle kalibracije.

export const PRICE_RANGE = { low: 0.7, high: 0.9 }

export const VAT_LABEL = 'sa PDV-om'

function step(value) {
  if (value >= 1_000_000) return 10_000
  if (value >= 100_000) return 5_000
  return 1_000
}

const roundDown = (value) => Math.floor(value / step(value)) * step(value)
const roundUp = (value) => Math.ceil(value / step(value)) * step(value)

export function priceRange(total) {
  if (!(total > 0)) return { low: 0, high: 0 }
  const low = roundDown(total * PRICE_RANGE.low)
  return { low, high: Math.max(low + step(low), roundUp(total * PRICE_RANGE.high)) }
}

const thousands = (value) => Math.round(value).toLocaleString('sr-RS')

// „380.000–450.000 RSD“
export function formatRange(total) {
  const { low, high } = priceRange(total)
  if (!high) return '—'
  return `${thousands(low)}–${thousands(high)} RSD`
}

export function formatSpan([low, high]) {
  return `${thousands(roundDown(low))}–${thousands(roundUp(high))} RSD`
}

// Procene troškova koji nisu u zbiru. Iznosi su okvirni i idu u kalibraciju.
export const EXTRA_COSTS = {
  assembly: [2500, 5000], // montaža celog objekta, RSD po m² osnove
  shellAssembly: [900, 1800], // montaža lima, panela i vrata kad je konstrukcija uračunata
  slabWork: [1500, 2500], // rad na betonskoj ploči, RSD po m²
  transport: [10000, 40000],
  crane: [20000, 60000],
  permit: [40000, 150000],
  permitFees: [10000, 40000],
  ground: [500, 1500], // iskop i priprema terena, RSD po m²
}

const SKILL_LABELS = {
  konstrukcija: 'Metalna konstrukcija i spojni materijal',
  krov: 'Krovni pokrivač',
  oluk: 'Oluk',
  temelj: 'Materijal za betonsku ploču',
  rolo: 'Garažna vrata',
  stolarija: 'Prozori i pešačka vrata',
  struja: 'Materijal za struju',
  oprema: 'Ventilacija i dodaci',
}

// Šta je u zbiru, a šta kupac treba da očekuje pored njega.
export function costBreakdown(scene, quote = {}) {
  const { width, length, height } = scene.dimensions
  const area = width * length * (scene.units || 1)
  const structure = scene.structure || {}
  const included = Object.keys(quote)
    .filter((skill) => quote[skill].total > 0)
    .map((skill) => SKILL_LABELS[skill] ?? skill)
  if (structure.fabrication) included.push('Izrada i montaža konstrukcije')
  if (structure.engineering) included.push('Projekat konstrukcije sa statičkim proračunom')

  const extras = []
  const perArea = ([low, high]) => [low * area, high * area]
  extras.push(
    structure.fabrication
      ? { name: 'Montaža lima, panela i vrata', span: perArea(EXTRA_COSTS.shellAssembly) }
      : { name: 'Izrada i montaža objekta', span: perArea(EXTRA_COSTS.assembly), note: 'Ili uključi izradu u delu Objekat, pod Sistem konstrukcije.' },
  )
  if (quote.temelj) extras.push({ name: 'Rad na betonskoj ploči', span: perArea(EXTRA_COSTS.slabWork) })
  extras.push({ name: 'Iskop i priprema terena', span: perArea(EXTRA_COSTS.ground), note: 'Zavisi od terena.' })
  extras.push({ name: 'Prevoz materijala', span: EXTRA_COSTS.transport, note: 'Zavisi od udaljenosti; neke firme ga daju besplatno.' })
  if (width > 8 || height > 4.5 || structure.system === 'hala') extras.push({ name: 'Autodizalica za podizanje ramova', span: EXTRA_COSTS.crane })
  if (scene.electric?.enabled) extras.push({ name: 'Rad električara i priključak na mrežu', note: 'Priključak naplaćuje distributer po svom ceniku.' })
  extras.push(
    structure.engineering
      ? { name: 'Takse za rešenje u opštini', span: EXTRA_COSTS.permitFees, note: 'Zavisi od opštine.' }
      : { name: 'Projekat i rešenje u opštini', span: EXTRA_COSTS.permit, note: 'Za zatvoren objekat obično treba rešenje po čl. 145. Zavisi od opštine.' },
  )
  return { included, extras }
}
