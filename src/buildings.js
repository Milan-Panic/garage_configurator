// Tipovi objekata. Konstrukcija i računica su iste, razlikuju se polazne mere i oprema.

export const DEFAULT_ELECTRIC = {
  enabled: false,
  phase: 'single',
  sockets: 4,
  lights: 2,
  distance: 15,
  charger: 'none',
  solar: 0,
}

export const ELECTRIC_LIMITS = {
  sockets: { min: 1, max: 30, step: 1 },
  lights: { min: 1, max: 30, step: 1 },
  distance: { min: 1, max: 100, step: 1 },
  solar: { min: 0, max: 30, step: 0.5 },
}

export const VENTILATION_OPTIONS = [
  { id: 'none', name: 'Bez', detail: 'Bez posebne ventilacije' },
  { id: 'grilles', name: 'Rešetke', detail: 'Prirodno provetravanje kroz zidne rešetke' },
  { id: 'fan', name: 'Ventilator', detail: 'Zidni ventilator, traži struju' },
]

export const DEFAULT_CANOPY = { enabled: false, wall: 'left', depth: 2.5, length: 5 }

export const CANOPY_LIMITS = {
  depth: { min: 1, max: 6, step: 0.1 },
  length: { min: 2, max: 20, step: 0.1 },
}

// Do ove površine pravilnik nadstrešnicu izuzima od akta, uz uslove. Vidi Vodič za dozvole.
export const CANOPY_FREE_AREA = 20

export const CHARGER_OPTIONS = [
  { id: 'none', name: 'Bez punjača', detail: 'Bez posebnog voda' },
  { id: 'ready', name: 'Priprema', detail: 'Cev, kabl i osigurač za kasnije' },
  { id: 'charger', name: 'Punjač', detail: 'Zidni punjač sa ugradnjom' },
]

export const BUILDING_TYPES = [
  {
    id: 'garaza',
    name: 'Garaža',
    detail: 'Za jedno ili više vozila',
    sizes: [
      { id: 'jedno', name: 'Jedno vozilo', dimensions: { width: 3.5, length: 6, height: 2.5 } },
      { id: 'ostava', name: 'Vozilo i ostava', dimensions: { width: 4.5, length: 7, height: 2.6 } },
      { id: 'dva', name: 'Dva vozila', dimensions: { width: 6, length: 6.5, height: 2.6 } },
    ],
  },
  {
    id: 'ostava',
    name: 'Ostava',
    detail: 'Alat, bašta, zimnica',
    sizes: [
      { id: 'mala', name: 'Mala', dimensions: { width: 3, length: 4, height: 2.4 } },
      { id: 'srednja', name: 'Srednja', dimensions: { width: 4, length: 5, height: 2.4 } },
      { id: 'velika', name: 'Velika', dimensions: { width: 5, length: 6, height: 2.5 } },
    ],
  },
  {
    id: 'radionica',
    name: 'Radionica',
    detail: 'Mehaničari, bravari, hobi',
    electric: { enabled: true, phase: 'three', sockets: 8, lights: 6 },
    insulation: 'full',
    sizes: [
      { id: 'hobi', name: 'Hobi', dimensions: { width: 5, length: 7, height: 2.8 } },
      { id: 'servis', name: 'Servis, 2 mesta', dimensions: { width: 7, length: 9, height: 3.2 } },
      { id: 'veca', name: 'Veća radionica', dimensions: { width: 8, length: 12, height: 3.5 } },
    ],
  },
  {
    id: 'magacin',
    name: 'Magacin',
    detail: 'Roba i palete',
    electric: { enabled: true, sockets: 4, lights: 8 },
    sizes: [
      { id: 'mali', name: 'Mali', dimensions: { width: 6, length: 10, height: 3 } },
      { id: 'srednji', name: 'Srednji', dimensions: { width: 8, length: 12, height: 3.5 } },
      { id: 'veliki', name: 'Veliki', dimensions: { width: 10, length: 16, height: 4 } },
    ],
  },
]

export function buildingType(id) {
  return BUILDING_TYPES.find((entry) => entry.id === id) ?? BUILDING_TYPES[0]
}

// Nadstrešnica ne može da bude duža od zida uz koji stoji.
export function canopySpan(canopy, dimensions) {
  const wall = canopy.wall === 'front' || canopy.wall === 'back' ? dimensions.width : dimensions.length
  return Math.min(canopy.length, wall)
}

export function normalizeCanopy(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const limited = (key) => {
    const { min, max } = CANOPY_LIMITS[key]
    const number = Number(source[key] ?? DEFAULT_CANOPY[key])
    if (!Number.isFinite(number)) return DEFAULT_CANOPY[key]
    return Math.min(max, Math.max(min, Math.round(number * 10) / 10))
  }
  return {
    enabled: Boolean(source.enabled),
    wall: ['front', 'back', 'left', 'right'].includes(source.wall) ? source.wall : DEFAULT_CANOPY.wall,
    depth: limited('depth'),
    length: limited('length'),
  }
}

export function normalizeElectric(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const limited = (key) => {
    const { min, max, step } = ELECTRIC_LIMITS[key]
    const number = Number(source[key] ?? DEFAULT_ELECTRIC[key])
    if (!Number.isFinite(number)) return DEFAULT_ELECTRIC[key]
    return Math.min(max, Math.max(min, Math.round(number / step) * step))
  }
  return {
    enabled: Boolean(source.enabled),
    phase: source.phase === 'three' ? 'three' : 'single',
    sockets: limited('sockets'),
    lights: limited('lights'),
    distance: limited('distance'),
    charger: CHARGER_OPTIONS.some((entry) => entry.id === source.charger) ? source.charger : 'none',
    solar: limited('solar'),
  }
}
