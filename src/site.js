// Lokacija objekta: sneg po nadmorskoj visini i izloženost vetru.
// Vrednosti su okvirne i služe da presek prati lokaciju. Merodavne su
// SRPS EN 1991-1-3 i 1991-1-4 sa nacionalnim prilozima, koje čita statičar.

export const PLACES = [
  { id: 'subotica', name: 'Subotica', altitude: 114 },
  { id: 'novi-sad', name: 'Novi Sad', altitude: 80 },
  { id: 'beograd', name: 'Beograd', altitude: 117 },
  { id: 'pancevo', name: 'Pančevo', altitude: 77 },
  { id: 'sabac', name: 'Šabac', altitude: 83 },
  { id: 'kragujevac', name: 'Kragujevac', altitude: 185 },
  { id: 'cacak', name: 'Čačak', altitude: 240 },
  { id: 'kraljevo', name: 'Kraljevo', altitude: 206 },
  { id: 'nis', name: 'Niš', altitude: 195 },
  { id: 'zajecar', name: 'Zaječar', altitude: 137 },
  { id: 'leskovac', name: 'Leskovac', altitude: 228 },
  { id: 'vranje', name: 'Vranje', altitude: 487 },
  { id: 'uzice', name: 'Užice', altitude: 411 },
  { id: 'novi-pazar', name: 'Novi Pazar', altitude: 496 },
  { id: 'zlatibor', name: 'Zlatibor', altitude: 1000 },
  { id: 'sjenica', name: 'Sjenica', altitude: 1030 },
  { id: 'kopaonik', name: 'Kopaonik', altitude: 1700 },
]

export const WIND_OPTIONS = [
  { id: 'sheltered', name: 'Zaklonjeno', detail: 'Među kućama i drvećem', pressure: 0.4 },
  { id: 'open', name: 'Otvoreno', detail: 'Ravnica, ivica naselja', pressure: 0.6 },
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

// Sneg na krovu u kN/m²: 1,0 do 500 m, pa raste sa visinom.
export function snowLoad(site) {
  const altitude = site?.altitude ?? DEFAULT_SITE.altitude
  return Math.round((1 + Math.max(0, altitude - 500) / 400) * 100) / 100
}

export function windPressure(site) {
  return (WIND_OPTIONS.find((entry) => entry.id === site?.wind) ?? WIND_OPTIONS[1]).pressure
}

export function placeName(site) {
  return PLACES.find((entry) => entry.id === site?.place)?.name ?? 'Druga lokacija'
}
