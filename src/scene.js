import { DEFAULT_DIMENSIONS, clampDimension } from './config'
import { DEFAULT_MATERIALS, resolveMaterials } from './materials'
import { FURNITURE_TYPES, WINDOW_TYPES, clampCar, clampFurniture, clampWindow } from './layout'

const DOOR_STYLES = ['none', 'single', 'double']
const WALLS = ['back', 'left', 'right']

export const initialScene = {
  dimensions: DEFAULT_DIMENSIONS,
  wallMaterialId: DEFAULT_MATERIALS.wall,
  roofMaterialId: DEFAULT_MATERIALS.roof,
  doorMaterialId: DEFAULT_MATERIALS.door,
  windows: [],
  furniture: [],
  door: { style: 'single', wicket: false, open: 0.55 },
  car: null,
}

export function scenesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function highestSerial(scene) {
  let max = 0
  for (const item of [...scene.windows, ...scene.furniture]) {
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
        wall: WALLS.includes(item.wall) ? item.wall : 'back',
        along: item.along,
        sill: item.sill,
        width: item.width,
        height: item.height,
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
  const door = {
    style,
    wicket: Boolean(source.door?.wicket) && style !== 'none',
    open,
  }
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
          },
          dimensions,
        )
      : null

  return { dimensions, ...materials, windows, furniture, door, car }
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
