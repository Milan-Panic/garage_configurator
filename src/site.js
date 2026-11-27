// Lokacija objekta: sneg po nadmorskoj visini i izloženost vetru.
// Vrednosti su okvirne i služe da presek prati lokaciju. Merodavne su
// SRPS EN 1991-1-3 i 1991-1-4 sa nacionalnim prilozima, koje čita statičar.

// `sk` je karakteristični sneg na tlu iz nacionalnog priloga SRPS EN 1991-1-3/NA:2017,
// prema Goleš i Nađ, Zbornik GF Subotica 38 (2020). Gde ga nema, važi formula po visini.
export const PLACES = [
  { id: 'subotica', name: 'Subotica', altitude: 114 },
  { id: 'novi-sad', name: 'Novi Sad', altitude: 80, sk: 1 },
  { id: 'beograd', name: 'Beograd', altitude: 117, sk: 1 },
  { id: 'pancevo', name: 'Pančevo', altitude: 77 },
  { id: 'sabac', name: 'Šabac', altitude: 83 },
  { id: 'kragujevac', name: 'Kragujevac', altitude: 185 },
  { id: 'cacak', name: 'Čačak', altitude: 240 },
  { id: 'kraljevo', name: 'Kraljevo', altitude: 206 },
  { id: 'cuprija', name: 'Ćuprija', altitude: 123, sk: 1.5 },
  { id: 'nis', name: 'Niš', altitude: 195, sk: 1 },
  { id: 'zajecar', name: 'Zaječar', altitude: 137, sk: 1.5 },
  { id: 'negotin', name: 'Negotin', altitude: 42, sk: 1.5 },
  { id: 'kladovo', name: 'Kladovo', altitude: 45, sk: 1.5 },
  { id: 'bor', name: 'Bor', altitude: 381, sk: 2 },
  { id: 'sokobanja', name: 'Sokobanja', altitude: 400, sk: 1.5 },
  { id: 'leskovac', name: 'Leskovac', altitude: 228 },
  { id: 'vranje', name: 'Vranje', altitude: 487 },
  { id: 'bosilegrad', name: 'Bosilegrad', altitude: 696, sk: 2.5 },
  { id: 'uzice', name: 'Užice', altitude: 411 },
  { id: 'novi-pazar', name: 'Novi Pazar', altitude: 496 },
  { id: 'zlatibor', name: 'Zlatibor', altitude: 1000, sk: 2.5 },
  { id: 'sjenica', name: 'Sjenica', altitude: 1030, sk: 2 },
  { id: 'kopaonik', name: 'Kopaonik', altitude: 1700, sk: 8 },
]

// Sneg na krovu nagiba do 30° je 0,8 · sk. Preko ove granice laki objekat iz
// računice ne važi, pa konstrukciju određuje statičar.
const ROOF_SHAPE = 0.8
export const SNOW_LIMIT = 2.5

// Računica razlikuje samo uobičajenu i izloženu lokaciju; ranije „zaklonjeno” čita se kao uobičajeno.
export const WIND_OPTIONS = [
  { id: 'open', name: 'Uobičajeno', detail: 'Naselje, ravnica, ivica sela', pressure: 0.6 },
  { id: 'exposed', name: 'Izloženo', detail: 'Brdo, greben, košavsko područje', pressure: 0.9 },
]

export const ALTITUDE_LIMITS = { min: 50, max: 1800, step: 10 }
export const DEFAULT_SITE = { place: 'beograd', altitude: 117, wind: 'open' }

export function normalizeSite(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const place = PLACES.find((entry) => entry.id === source.place)
  const number = Number(source.altitude)
  const altitude = Number.isFinite(number)
    ? Math.min(ALTITUDE_LIMITS.max, Math.max(ALTITUDE_LIMITS.min, Math.round(number / 10) * 10))
    : (place?.altitude ?? DEFAULT_SITE.altitude)
  return {
    place: place ? place.id : source.place === 'custom' ? 'custom' : DEFAULT_SITE.place,
    altitude,
    wind: WIND_OPTIONS.some((entry) => entry.id === source.wind) ? source.wind : DEFAULT_SITE.wind,
  }
}

// Sneg na krovu u kN/m². Formula po visini (1,0 do 500 m, pa raste) ostaje donja
// granica, a mesto iz nacionalnog priloga je diže gde je propis stroži.
export function snowLoad(site) {
  const altitude = site?.altitude ?? DEFAULT_SITE.altitude
  const byAltitude = 1 + Math.max(0, altitude - 500) / 400
  const sk = PLACES.find((entry) => entry.id === site?.place)?.sk
  const byAnnex = sk ? ROOF_SHAPE * sk : 0
  return Math.round(Math.max(byAltitude, byAnnex) * 100) / 100
}

export function snowSource(site) {
  const place = PLACES.find((entry) => entry.id === site?.place)
  if (place?.sk && ROOF_SHAPE * place.sk > snowLoad({ altitude: site?.altitude })) {
    return `SRPS EN 1991-1-3/NA, sk ${String(place.sk).replace('.', ',')} kN/m² za ${place.name}`
  }
  return 'po nadmorskoj visini'
}

export function snowOutOfRange(site) {
  return snowLoad(site) > SNOW_LIMIT
}

export function windPressure(site) {
  return (WIND_OPTIONS.find((entry) => entry.id === site?.wind) ?? WIND_OPTIONS[0]).pressure
}

export function placeName(site) {
  return PLACES.find((entry) => entry.id === site?.place)?.name ?? 'Druga lokacija'
}
