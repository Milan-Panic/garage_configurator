import { DEFAULT_DIMENSIONS, clampDimension } from './config'
import { DEFAULT_MATERIALS, DOOR_MATERIALS, FLOOR_FINISHES, FRAME_COLORS, INSULATION_OPTIONS, resolveMaterials } from './materials'
import { CAR_COLORS, CAR_PRESETS, FURNITURE_TYPES, WINDOW_TYPES, WALL_IDS, clampCar, clampDoor, clampFurniture, clampPedestrian, clampWindow, defaultDoorSize } from './layout'
import { initialRoof, normalizeRoof } from './roof'
import { BUILDING_TYPES, DEFAULT_CANOPY, DEFAULT_ELECTRIC, VENTILATION_OPTIONS, normalizeCanopy, normalizeElectric } from './buildings'

const DOOR_STYLES = ['none', 'sectional', 'tilt', 'single', 'double', 'roller']

const sizedDoor = defaultDoorSize(DEFAULT_DIMENSIONS)

export const initialScene = {
  dimensions: DEFAULT_DIMENSIONS,
  wallMaterialId: DEFAULT_MATERIALS.wall,
  roofMaterialId: DEFAULT_MATERIALS.roof,
  doorMaterialId: DEFAULT_MATERIALS.door,
  wallColor: null,
  roofColor: null,
  doorColor: null,
  windows: [],
  furniture: [],
  door: { style: 'sectional', wicket: false, open: 0.35, wall: 'front', along: 0, motor: false, ...sizedDoor },
  gutters: true,
  floor: 'beton',
  insulation: 'none',
  pedestrianDoors: [],
  roof: initialRoof,
  car: null,
  buildingType: 'garaza',
  electric: DEFAULT_ELECTRIC,
  offers: {},
  ventilation: 'none',
  canopy: DEFAULT_CANOPY,
}

export function scenesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function highestSerial(scene) {
  let max = 0
  for (const item of [...scene.windows, ...scene.furniture, ...(scene.pedestrianDoors || [])]) {
    const match = /-(\d+)$/.exec(String(item.id ?? ''))
    if (match) max = Math.max(max, Number(match[1]))
  }
  return max
}

export function normalizeScene(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const dimensions = {
    width: clampDimension('width', source.dimensions?.width ?? DEFAULT_DIMENSIONS.width),
    length: clampDimension('length', source.dimensions?.length ?? DEFAULT_DIMENSIONS.length),
    height: clampDimension('height', source.dimensions?.height ?? DEFAULT_DIMENSIONS.height),
  }
  const materials = resolveMaterials(source)
  const windows = uniqueItems(Array.isArray(source.windows) ? source.windows : [], 'window').map((item) =>
    clampWindow(
      {
        id: item.id,
        type: WINDOW_TYPES.some((entry) => entry.id === item.type) ? item.type : WINDOW_TYPES[0].id,
        wall: WALL_IDS.includes(item.wall) ? item.wall : 'back',
        along: item.along,
        sill: item.sill,
        width: item.width,
        height: item.height,
        frame: FRAME_COLORS.some((entry) => entry.id === item.frame) ? item.frame : 'bela',
        bars: Boolean(item.bars),
      },
      dimensions,
    ),
  )
  const furniture = uniqueItems(Array.isArray(source.furniture) ? source.furniture : [], 'furniture').map((item) =>
    clampFurniture(
      {
        id: item.id,
        type: FURNITURE_TYPES.some((entry) => entry.id === item.type) ? item.type : FURNITURE_TYPES[0].id,
        x: item.x,
        z: item.z,
        rotation: item.rotation,
        width: item.width,
        depth: item.depth,
        height: item.height,
      },
      dimensions,
    ),
  )
  const style = DOOR_STYLES.includes(source.door?.style) ? source.door.style : initialScene.door.style
  const open = clampUnit(source.door?.open, initialScene.door.open)
  const fallback = defaultDoorSize(dimensions)
  const door = clampDoor(
    {
      style,
      wicket: Boolean(source.door?.wicket) && (style === 'single' || style === 'double'),
      open,
      wall: source.door?.wall,
      along: source.door?.along ?? 0,
      width: source.door?.width ?? fallback.width,
      height: source.door?.height ?? fallback.height,
      motor: Boolean(source.door?.motor),
    },
    dimensions,
  )
  // Materijal vrata mora da odgovara tipu (npr. rolo lamele samo na rolo vratima).
  const doorSpec = DOOR_MATERIALS.find((entry) => entry.id === materials.doorMaterialId)
  if (style !== 'none' && doorSpec && !doorSpec.styles.includes(style)) {
    materials.doorMaterialId = DOOR_MATERIALS.find((entry) => entry.styles.includes(style))?.id ?? materials.doorMaterialId
  }
  const roof = normalizeRoof(source.roof)
  const car =
    source.car && typeof source.car === 'object'
      ? clampCar(
          {
            length: source.car.length,
            width: source.car.width,
            height: source.car.height,
            x: source.car.x,
            z: source.car.z,
            rotation: source.car.rotation,
            kind: CAR_PRESETS.some((entry) => entry.id === source.car.kind) ? source.car.kind : 'sedan',
            color: CAR_COLORS.includes(source.car.color) ? source.car.color : CAR_COLORS[0],
          },
          dimensions,
        )
      : null

  const pedestrianDoors = uniqueItems(Array.isArray(source.pedestrianDoors) ? source.pedestrianDoors : [], 'pesacka').map(
    (item) =>
      clampPedestrian(
        {
          id: item.id,
          wall: item.wall,
          along: item.along,
          width: item.width ?? 0.9,
          height: item.height ?? 2.05,
          glass: Boolean(item.glass),
        },
        dimensions,
        door,
      ),
  )

  return {
    dimensions,
    ...materials,
    windows,
    furniture,
    door,
    gutters: source.gutters !== false,
    floor: FLOOR_FINISHES.some((entry) => entry.id === source.floor) ? source.floor : 'beton',
    insulation: INSULATION_OPTIONS.some((entry) => entry.id === source.insulation) ? source.insulation : 'none',
    pedestrianDoors,
    roof,
    car,
    buildingType: BUILDING_TYPES.some((entry) => entry.id === source.buildingType) ? source.buildingType : 'garaza',
    electric: normalizeElectric(source.electric),
    offers: cleanOffers(source.offers),
    ventilation: VENTILATION_OPTIONS.some((entry) => entry.id === source.ventilation) ? source.ventilation : 'none',
    canopy: normalizeCanopy(source.canopy),
  }
}

function cleanOffers(raw) {
  if (!raw || typeof raw !== 'object') return {}
  return Object.fromEntries(Object.entries(raw).filter(([, id]) => typeof id === 'string' && id))
}

function uniqueItems(items, prefix) {
  const seen = new Set()
  return items.filter((item) => item && typeof item === 'object').map((item, index) => {
    let id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `${prefix}-${index + 1}`
    while (seen.has(id)) id = `${id}-${index + 1}`
    seen.add(id)
    return { ...item, id }
  })
}

function clampUnit(value, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(1, Math.max(0, Math.round(number * 100) / 100))
}
