import { FLOOR_LEVEL, PANEL_THICKNESS } from './config'

export const WINDOW_TYPES = [
  { id: 'fixed', name: 'Fiksni', detail: 'Ne otvara se', addLabel: 'Dodaj fiksni prozor', width: 1, height: 1, sill: 0.95 },
  { id: 'single', name: 'Jednokrilni', detail: 'Jedno krilo', addLabel: 'Dodaj jednokrilni prozor', width: 0.8, height: 1.1, sill: 0.95 },
  { id: 'double', name: 'Dvokrilni', detail: 'Dva krila', addLabel: 'Dodaj dvokrilni prozor', width: 1.4, height: 1.15, sill: 0.95 },
  { id: 'tilt', name: 'Ventus', detail: 'Kip, visoko', addLabel: 'Dodaj ventus prozor', width: 1.2, height: 0.5, sill: 1.75 },
  { id: 'strip', name: 'Trakasti', detail: 'Svetlo ispod krova', addLabel: 'Dodaj trakasti prozor', width: 2.4, height: 0.4, sill: 1.9 },
  { id: 'glassblock', name: 'Staklena prizma', detail: 'Zidana, ne otvara se', addLabel: 'Dodaj staklene prizme', width: 0.8, height: 0.8, sill: 1.2 },
]

export const FURNITURE_GROUPS = ['Radni prostor', 'Servis', 'Odlaganje', 'Vozila i bašta', 'Kućna tehnika', 'Kancelarija i odmor', 'Sanitarije i grejanje']

export const FURNITURE_TYPES = [
  {
    id: 'workbench',
    name: 'Radni sto',
    addLabel: 'Dodaj radni sto',
    width: 1.5,
    depth: 0.65,
    height: 0.9,
    widthRange: [0.8, 2.4],
    depthRange: [0.45, 1],
    heightRange: [0.7, 1.15],
  },
  {
    id: 'shelf',
    name: 'Polica',
    addLabel: 'Dodaj policu',
    width: 1,
    depth: 0.35,
    height: 1.6,
    widthRange: [0.5, 2],
    depthRange: [0.25, 0.6],
    heightRange: [0.8, 2.3],
  },
  {
    id: 'rack',
    name: 'Regal',
    addLabel: 'Dodaj regal',
    width: 1.2,
    depth: 0.5,
    height: 1.9,
    widthRange: [0.7, 2.4],
    depthRange: [0.35, 0.8],
    heightRange: [1.2, 2.4],
  },
  {
    id: 'cabinet',
    name: 'Ormarić',
    addLabel: 'Dodaj ormarić',
    width: 0.8,
    depth: 0.5,
    height: 0.85,
    widthRange: [0.4, 1.8],
    depthRange: [0.35, 0.7],
    heightRange: [0.7, 1.05],
  },
  {
    id: 'locker',
    name: 'Metalni ormar',
    addLabel: 'Dodaj metalni ormar',
    width: 0.9,
    depth: 0.5,
    height: 1.95,
    widthRange: [0.6, 1.8],
    depthRange: [0.4, 0.65],
    heightRange: [1.6, 2.2],
  },
  {
    id: 'toolchest',
    name: 'Kolica za alat',
    addLabel: 'Dodaj kolica za alat',
    width: 0.7,
    depth: 0.46,
    height: 1,
    widthRange: [0.5, 1.2],
    depthRange: [0.38, 0.6],
    heightRange: [0.8, 1.1],
  },
  {
    id: 'pegboard',
    name: 'Tabla za alat',
    addLabel: 'Dodaj zidnu tablu za alat',
    width: 1.6,
    depth: 0.12,
    height: 1.9,
    widthRange: [0.6, 3],
    depthRange: [0.08, 0.2],
    heightRange: [1.4, 2.3],
  },
  {
    id: 'tirerack',
    name: 'Stalak za gume',
    addLabel: 'Dodaj stalak za gume',
    width: 1.1,
    depth: 0.42,
    height: 1.8,
    widthRange: [0.7, 1.6],
    depthRange: [0.35, 0.55],
    heightRange: [1.2, 2.2],
  },
  {
    id: 'bike',
    name: 'Bicikl',
    addLabel: 'Dodaj bicikl',
    width: 0.6,
    depth: 1.75,
    height: 1.05,
    widthRange: [0.5, 0.7],
    depthRange: [1.5, 1.9],
    heightRange: [0.9, 1.15],
  },
  {
    id: 'motorbike',
    name: 'Motor',
    addLabel: 'Dodaj motor',
    width: 0.8,
    depth: 2.15,
    height: 1.2,
    widthRange: [0.65, 1],
    depthRange: [1.8, 2.5],
    heightRange: [1, 1.5],
  },
  {
    id: 'mower',
    name: 'Kosilica',
    addLabel: 'Dodaj kosilicu',
    width: 0.55,
    depth: 1.45,
    height: 1,
    widthRange: [0.45, 1.2],
    depthRange: [1.1, 2],
    heightRange: [0.9, 1.2],
  },
  {
    id: 'freezer',
    name: 'Zamrzivač',
    addLabel: 'Dodaj zamrzivač',
    width: 1.1,
    depth: 0.65,
    height: 0.86,
    widthRange: [0.6, 1.6],
    depthRange: [0.55, 0.8],
    heightRange: [0.8, 0.95],
  },
  {
    id: 'sink',
    name: 'Sudopera',
    addLabel: 'Dodaj sudoperu',
    width: 0.8,
    depth: 0.55,
    height: 0.9,
    widthRange: [0.5, 1.4],
    depthRange: [0.45, 0.65],
    heightRange: [0.85, 0.95],
  },
  {
    id: 'washer',
    name: 'Veš mašina',
    addLabel: 'Dodaj veš mašinu',
    width: 0.6,
    depth: 0.6,
    height: 0.85,
    widthRange: [0.6, 0.6],
    depthRange: [0.45, 0.65],
    heightRange: [0.85, 0.85],
  },
  {
    id: 'firewood',
    name: 'Drva',
    addLabel: 'Dodaj složena drva',
    width: 1.6,
    depth: 0.4,
    height: 1.1,
    widthRange: [0.6, 3],
    depthRange: [0.3, 0.6],
    heightRange: [0.5, 1.8],
  },
  {
    id: 'lift2',
    name: 'Dvostubna dizalica',
    addLabel: 'Dodaj dvostubnu dizalicu',
    width: 3.4,
    depth: 1.6,
    height: 2.9,
    widthRange: [3.2, 3.8],
    depthRange: [1.4, 2],
    heightRange: [2.6, 4],
  },
  {
    id: 'lift4',
    name: 'Četvorostubna dizalica',
    addLabel: 'Dodaj četvorostubnu dizalicu',
    width: 3,
    depth: 5,
    height: 2.2,
    widthRange: [2.8, 3.4],
    depthRange: [4.4, 5.6],
    heightRange: [2, 2.6],
  },
  {
    id: 'compressor',
    name: 'Kompresor',
    addLabel: 'Dodaj kompresor',
    width: 0.5,
    depth: 1.1,
    height: 0.9,
    widthRange: [0.4, 0.7],
    depthRange: [0.8, 1.6],
    heightRange: [0.7, 1.2],
  },
  {
    id: 'welder',
    name: 'Aparat za varenje',
    addLabel: 'Dodaj aparat za varenje',
    width: 0.45,
    depth: 0.8,
    height: 0.85,
    widthRange: [0.4, 0.6],
    depthRange: [0.6, 1],
    heightRange: [0.7, 1],
  },
  {
    id: 'drillpress',
    name: 'Stubna bušilica',
    addLabel: 'Dodaj stubnu bušilicu',
    width: 0.45,
    depth: 0.6,
    height: 1.65,
    widthRange: [0.4, 0.6],
    depthRange: [0.5, 0.8],
    heightRange: [1.5, 1.8],
  },
  {
    id: 'barrels',
    name: 'Burad',
    addLabel: 'Dodaj burad',
    width: 1.25,
    depth: 0.6,
    height: 0.9,
    widthRange: [0.6, 2.5],
    depthRange: [0.6, 0.6],
    heightRange: [0.85, 0.95],
  },
  {
    id: 'palletrack',
    name: 'Paletni regal',
    addLabel: 'Dodaj paletni regal',
    width: 2.8,
    depth: 1.1,
    height: 3,
    widthRange: [1.9, 3.7],
    depthRange: [0.9, 1.2],
    heightRange: [2, 4.2],
  },
  {
    id: 'pallet',
    name: 'Paleta sa robom',
    addLabel: 'Dodaj paletu sa robom',
    width: 1.2,
    depth: 0.8,
    height: 1.1,
    widthRange: [1.2, 1.2],
    depthRange: [0.8, 1],
    heightRange: [0.5, 1.8],
  },
  {
    id: 'ladder',
    name: 'Merdevine',
    addLabel: 'Dodaj merdevine',
    width: 0.5,
    depth: 0.7,
    height: 2.2,
    widthRange: [0.4, 0.6],
    depthRange: [0.5, 1],
    heightRange: [1.6, 3],
  },
  {
    id: 'extinguisher',
    name: 'PP aparat',
    addLabel: 'Dodaj protivpožarni aparat',
    width: 0.2,
    depth: 0.2,
    height: 0.6,
    widthRange: [0.2, 0.2],
    depthRange: [0.2, 0.2],
    heightRange: [0.5, 0.7],
  },
  {
    id: 'desk',
    name: 'Kancelarijski sto',
    addLabel: 'Dodaj kancelarijski sto',
    width: 1.4,
    depth: 0.7,
    height: 0.75,
    widthRange: [1, 1.8],
    depthRange: [0.6, 0.8],
    heightRange: [0.72, 0.78],
  },
  {
    id: 'chair',
    name: 'Stolica',
    addLabel: 'Dodaj stolicu',
    width: 0.55,
    depth: 0.55,
    height: 0.95,
    widthRange: [0.5, 0.65],
    depthRange: [0.5, 0.65],
    heightRange: [0.85, 1.1],
  },
  {
    id: 'sofa',
    name: 'Dvosed',
    addLabel: 'Dodaj dvosed',
    width: 1.6,
    depth: 0.85,
    height: 0.8,
    widthRange: [1.3, 2.2],
    depthRange: [0.8, 0.95],
    heightRange: [0.75, 0.9],
  },
  {
    id: 'toilet',
    name: 'WC šolja',
    addLabel: 'Dodaj WC šolju',
    width: 0.4,
    depth: 0.68,
    height: 0.8,
    widthRange: [0.38, 0.42],
    depthRange: [0.65, 0.72],
    heightRange: [0.78, 0.82],
  },
  {
    id: 'basin',
    name: 'Lavabo',
    addLabel: 'Dodaj lavabo',
    width: 0.5,
    depth: 0.42,
    height: 0.85,
    widthRange: [0.4, 0.7],
    depthRange: [0.35, 0.5],
    heightRange: [0.82, 0.9],
  },
  {
    id: 'waterheater',
    name: 'Bojler',
    addLabel: 'Dodaj bojler',
    width: 0.45,
    depth: 0.48,
    height: 1.9,
    widthRange: [0.4, 0.5],
    depthRange: [0.45, 0.52],
    heightRange: [1.6, 2.1],
  },
  {
    id: 'boiler',
    name: 'Kotao',
    addLabel: 'Dodaj kotao',
    width: 0.6,
    depth: 0.8,
    height: 1.3,
    widthRange: [0.5, 0.8],
    depthRange: [0.6, 1.1],
    heightRange: [1.1, 1.6],
  },
  {
    id: 'stove',
    name: 'Peć na drva',
    addLabel: 'Dodaj peć na drva',
    width: 0.5,
    depth: 0.5,
    height: 0.9,
    widthRange: [0.4, 0.7],
    depthRange: [0.4, 0.7],
    heightRange: [0.7, 1.1],
  },
]

const FURNITURE_GROUP_OF = {
  workbench: 'Radni prostor',
  toolchest: 'Radni prostor',
  pegboard: 'Radni prostor',
  sink: 'Radni prostor',
  shelf: 'Odlaganje',
  rack: 'Odlaganje',
  cabinet: 'Odlaganje',
  locker: 'Odlaganje',
  tirerack: 'Odlaganje',
  firewood: 'Odlaganje',
  bike: 'Vozila i bašta',
  motorbike: 'Vozila i bašta',
  mower: 'Vozila i bašta',
  freezer: 'Kućna tehnika',
  washer: 'Kućna tehnika',
  lift2: 'Servis',
  lift4: 'Servis',
  compressor: 'Servis',
  welder: 'Servis',
  drillpress: 'Servis',
  barrels: 'Servis',
  extinguisher: 'Servis',
  palletrack: 'Odlaganje',
  pallet: 'Odlaganje',
  ladder: 'Odlaganje',
  desk: 'Kancelarija i odmor',
  chair: 'Kancelarija i odmor',
  sofa: 'Kancelarija i odmor',
  toilet: 'Sanitarije i grejanje',
  basin: 'Sanitarije i grejanje',
  waterheater: 'Sanitarije i grejanje',
  boiler: 'Sanitarije i grejanje',
  stove: 'Sanitarije i grejanje',
}

export function furnitureGroup(id) {
  return FURNITURE_GROUP_OF[id] ?? 'Odlaganje'
}

export const CAR_PRESETS = [
  { id: 'hatch', name: 'Gradski', length: 4, width: 1.75, height: 1.48 },
  { id: 'sedan', name: 'Limuzina', length: 4.75, width: 1.83, height: 1.45 },
  { id: 'wagon', name: 'Karavan', length: 4.7, width: 1.82, height: 1.48 },
  { id: 'suv', name: 'SUV', length: 4.65, width: 1.9, height: 1.7 },
  { id: 'van', name: 'Kombi', length: 5.1, width: 2, height: 1.98 },
  { id: 'pickup', name: 'Pikap', length: 5.3, width: 1.9, height: 1.8 },
]

export const CAR_COLORS = ['#1d4e89', '#b91c1c', '#e7e5e4', '#18181b', '#71717a', '#166534', '#c2410c']

export function wallFrame(id, { width, length, height }) {
  const thickness = PANEL_THICKNESS
  if (id === 'front') {
    return {
      id,
      label: 'Prednji zid',
      span: width - thickness * 2,
      height,
      thickness,
      origin: [0, FLOOR_LEVEL, length / 2 - thickness / 2],
      axis: [-1, 0, 0],
      normal: [0, 0, -1],
    }
  }
  if (id === 'back') {
    return {
      id,
      label: 'Zadnji zid',
      span: width - thickness * 2,
      height,
      thickness,
      origin: [0, FLOOR_LEVEL, -length / 2 + thickness / 2],
      axis: [1, 0, 0],
      normal: [0, 0, 1],
    }
  }
  if (id === 'left') {
    return {
      id,
      label: 'Levi zid',
      span: length,
      height,
      thickness,
      origin: [-width / 2 + thickness / 2, FLOOR_LEVEL, 0],
      axis: [0, 0, -1],
      normal: [1, 0, 0],
    }
  }
  return {
    id,
    label: 'Desni zid',
    span: length,
    height,
    thickness,
    origin: [width / 2 - thickness / 2, FLOOR_LEVEL, 0],
    axis: [0, 0, 1],
    normal: [-1, 0, 0],
  }
}

export const WALL_IDS = ['front', 'back', 'left', 'right']

export function defaultDoorSize(dimensions) {
  const wall = wallFrame('front', dimensions)
  return {
    width: Math.round((wall.span - 0.48) * 100) / 100,
    height: Math.round((dimensions.height - 0.3) * 100) / 100,
  }
}

export function clampDoor(door, dimensions) {
  const wallId = WALL_IDS.includes(door.wall) ? door.wall : 'front'
  const wall = wallFrame(wallId, dimensions)
  const width = clamp(door.width, 1.2, Math.max(1.2, wall.span - 0.16))
  const height = clamp(door.height, 1.8, Math.max(1.8, dimensions.height - 0.08))
  const maxAlong = Math.max(0, wall.span / 2 - width / 2 - 0.06)
  const along = clamp(door.along ?? 0, -maxAlong, maxAlong)
  return { ...door, wall: wallId, width, height, along }
}

export function doorSliderLimits(door, dimensions) {
  const wall = wallFrame(door.wall, dimensions)
  const maxWidth = Math.max(1.2, wall.span - 0.16)
  const maxHeight = Math.max(1.8, dimensions.height - 0.08)
  const maxAlong = Math.max(0, wall.span / 2 - door.width / 2 - 0.06)
  return {
    width: { min: 1.2, max: maxWidth, step: 0.05 },
    height: { min: 1.8, max: maxHeight, step: 0.05 },
    along: { min: -maxAlong, max: maxAlong, step: 0.05 },
  }
}

export const PEDESTRIAN_DEFAULT = { width: 0.9, height: 2.05 }

export function clampPedestrian(item, dimensions, door) {
  const wallId = WALL_IDS.includes(item.wall) ? item.wall : 'left'
  const wall = wallFrame(wallId, dimensions)
  const width = clamp(item.width, 0.7, Math.min(1.2, Math.max(0.7, wall.span - 0.2)))
  const height = clamp(item.height, 1.9, Math.max(1.9, dimensions.height - 0.08))
  const maxAlong = Math.max(0, wall.span / 2 - width / 2 - 0.08)
  let along = clamp(item.along, -maxAlong, maxAlong)
  if (door && door.style !== 'none' && door.wall === wallId && Number.isFinite(door.width)) {
    const gap = width / 2 + door.width / 2 + 0.1
    if (Math.abs(along - door.along) < gap) {
      const direction = along >= door.along ? 1 : -1
      along = clamp(door.along + direction * gap, -maxAlong, maxAlong)
    }
  }
  return { ...item, wall: wallId, width, height, along }
}

export function pedestrianSliderLimits(item, dimensions) {
  const wall = wallFrame(item.wall, dimensions)
  const maxWidth = Math.min(1.2, Math.max(0.7, wall.span - 0.2))
  const maxHeight = Math.max(1.9, dimensions.height - 0.08)
  const maxAlong = Math.max(0, wall.span / 2 - item.width / 2 - 0.08)
  return {
    width: { min: 0.7, max: maxWidth, step: 0.05 },
    height: { min: 1.9, max: maxHeight, step: 0.05 },
    along: { min: -maxAlong, max: maxAlong, step: 0.05 },
  }
}

export function subtractRects(regions, hole) {
  const next = []
  regions.forEach((rect) => {
    const u0 = Math.max(rect.u0, hole.u0)
    const u1 = Math.min(rect.u1, hole.u1)
    const v0 = Math.max(rect.v0, hole.v0)
    const v1 = Math.min(rect.v1, hole.v1)
    if (u1 - u0 <= 0.001 || v1 - v0 <= 0.001) {
      next.push(rect)
      return
    }
    if (u0 - rect.u0 > 0.001) next.push({ ...rect, u1: u0 - 0.001 })
    if (rect.u1 - u1 > 0.001) next.push({ ...rect, u0: u1 + 0.001 })
    if (v0 - rect.v0 > 0.001) next.push({ u0, u1, v0: rect.v0, v1: v0 - 0.001 })
    if (rect.v1 - v1 > 0.001) next.push({ u0, u1, v0: v1 + 0.001, v1: rect.v1 })
  })
  return next
}

export function wallPanels(span, height, openings) {
  let regions = [{ u0: -span / 2, u1: span / 2, v0: 0, v1: height }]
  openings.forEach((opening) => {
    regions = subtractRects(regions, {
      u0: opening.along - opening.width / 2,
      u1: opening.along + opening.width / 2,
      v0: opening.sill,
      v1: opening.sill + opening.height,
    })
  })
  return regions.filter((rect) => rect.u1 - rect.u0 > 0.02 && rect.v1 - rect.v0 > 0.02)
}

function clamp(value, min, max) {
  const rounded = Math.round(Number(value) * 100) / 100
  const safe = Number.isNaN(rounded) ? min : rounded
  return Math.min(Math.max(min, max), Math.max(min, safe))
}

export function clampWindow(item, dimensions) {
  const wall = wallFrame(item.wall, dimensions)
  const width = clamp(item.width, 0.45, Math.min(2.4, Math.max(0.45, wall.span - 0.24)))
  const height = clamp(item.height, 0.4, Math.min(1.8, Math.max(0.4, dimensions.height - 0.35)))
  const maxAlong = Math.max(0, wall.span / 2 - width / 2 - 0.08)
  const maxSill = Math.max(0.12, dimensions.height - height - 0.1)
  const along = clamp(item.along, -maxAlong, maxAlong)
  const sill = clamp(item.sill, 0.12, maxSill)
  if (
    item.width === width &&
    item.height === height &&
    item.along === along &&
    item.sill === sill
  ) {
    return item
  }
  return { ...item, width, height, along, sill }
}

export function windowSliderLimits(item, dimensions) {
  const wall = wallFrame(item.wall, dimensions)
  const maxWidth = Math.min(2.4, Math.max(0.5, wall.span - 0.24))
  const maxHeight = Math.min(1.8, Math.max(0.45, dimensions.height - 0.35))
  const maxAlong = Math.max(0, wall.span / 2 - item.width / 2 - 0.08)
  const maxSill = Math.max(0.12, dimensions.height - item.height - 0.1)
  return {
    along: { min: -maxAlong, max: maxAlong },
    sill: { min: 0.12, max: maxSill },
    width: { min: 0.45, max: maxWidth },
    height: { min: 0.4, max: maxHeight },
  }
}

export function clampFurniture(item, dimensions) {
  const spec = FURNITURE_TYPES.find((entry) => entry.id === item.type) ?? FURNITURE_TYPES[0]
  const maxWidth = Math.max(spec.widthRange[0], dimensions.width - PANEL_THICKNESS * 2 - 0.25)
  const maxDepth = Math.max(spec.depthRange[0], dimensions.length - PANEL_THICKNESS * 2 - 0.25)
  const maxHeight = Math.max(spec.heightRange[0], dimensions.height - 0.15)
  const width = clamp(item.width, spec.widthRange[0], Math.min(spec.widthRange[1], maxWidth))
  const depth = clamp(item.depth, spec.depthRange[0], Math.min(spec.depthRange[1], maxDepth))
  const height = clamp(item.height, spec.heightRange[0], Math.min(spec.heightRange[1], maxHeight))
  const rotation = quarterTurn(item.rotation)
  const cosine = Math.abs(Math.cos(rotation))
  const sine = Math.abs(Math.sin(rotation))
  const extentX = (width / 2) * cosine + (depth / 2) * sine
  const extentZ = (width / 2) * sine + (depth / 2) * cosine
  const limitX = Math.max(0, dimensions.width / 2 - PANEL_THICKNESS - extentX - 0.06)
  const limitZ = Math.max(0, dimensions.length / 2 - PANEL_THICKNESS - extentZ - 0.06)
  const x = clamp(item.x, -limitX, limitX)
  const z = clamp(item.z, -limitZ, limitZ)
  if (
    item.width === width &&
    item.depth === depth &&
    item.height === height &&
    item.x === x &&
    item.z === z &&
    item.rotation === rotation
  ) {
    return item
  }
  return { ...item, width, depth, height, x, z, rotation }
}

export function furnitureSliderLimits(item, dimensions) {
  const spec = FURNITURE_TYPES.find((entry) => entry.id === item.type) ?? FURNITURE_TYPES[0]
  const clamped = clampFurniture(item, dimensions)
  const cosine = Math.abs(Math.cos(clamped.rotation))
  const sine = Math.abs(Math.sin(clamped.rotation))
  const extentX = (clamped.width / 2) * cosine + (clamped.depth / 2) * sine
  const extentZ = (clamped.width / 2) * sine + (clamped.depth / 2) * cosine
  const limitX = Math.max(0, dimensions.width / 2 - PANEL_THICKNESS - extentX - 0.06)
  const limitZ = Math.max(0, dimensions.length / 2 - PANEL_THICKNESS - extentZ - 0.06)
  return {
    width: {
      min: spec.widthRange[0],
      max: Math.max(spec.widthRange[0], Math.min(spec.widthRange[1], dimensions.width - 0.4)),
    },
    depth: {
      min: spec.depthRange[0],
      max: Math.max(spec.depthRange[0], Math.min(spec.depthRange[1], dimensions.length - 0.4)),
    },
    height: {
      min: spec.heightRange[0],
      max: Math.max(spec.heightRange[0], Math.min(spec.heightRange[1], dimensions.height - 0.15)),
    },
    x: { min: -limitX, max: limitX },
    z: { min: -limitZ, max: limitZ },
  }
}

export const CAR_LIMITS = {
  length: [3.4, 5.6],
  width: [1.6, 2.2],
  height: [1.3, 2.05],
}

// Koliko auto može da se podigne na dizalici a da ne udari u krov.
function carLiftLimit(carHeight, dimensions) {
  return Math.max(0, Math.min(1.9, Math.floor((dimensions.height - carHeight - 0.15) * 20) / 20))
}

// Predmeti stoje pod pravim uglom; sačuvana vrednost bez rotacije znači 0.
function quarterTurn(value) {
  const turns = Number.isFinite(value) ? Math.round(value / (Math.PI / 2)) : 0
  return (((turns % 4) + 4) % 4) * (Math.PI / 2)
}

export function clampCar(item, dimensions) {
  const length = clamp(item.length, CAR_LIMITS.length[0], Math.min(CAR_LIMITS.length[1], dimensions.length - 0.45))
  const width = clamp(item.width, CAR_LIMITS.width[0], Math.min(CAR_LIMITS.width[1], dimensions.width - 0.4))
  const height = clamp(item.height, CAR_LIMITS.height[0], Math.min(CAR_LIMITS.height[1], dimensions.height - 0.2))
  const elevation = clamp(item.elevation ?? 0, 0, carLiftLimit(height, dimensions))
  const rotation = quarterTurn(item.rotation)
  const cosine = Math.abs(Math.cos(rotation))
  const sine = Math.abs(Math.sin(rotation))
  const extentX = (width / 2) * cosine + (length / 2) * sine
  const extentZ = (width / 2) * sine + (length / 2) * cosine
  const limitX = Math.max(0, dimensions.width / 2 - PANEL_THICKNESS - extentX - 0.08)
  const limitZ = Math.max(0, dimensions.length / 2 - PANEL_THICKNESS - extentZ - 0.08)
  const x = clamp(item.x, -limitX, limitX)
  const z = clamp(item.z, -limitZ, limitZ)
  if (
    item.length === length &&
    item.width === width &&
    item.height === height &&
    item.rotation === rotation &&
    item.elevation === elevation &&
    item.x === x &&
    item.z === z
  ) {
    return item
  }
  return { ...item, length, width, height, elevation, rotation, x, z }
}

export function carSliderLimits(item, dimensions) {
  const clamped = clampCar(item, dimensions)
  const cosine = Math.abs(Math.cos(clamped.rotation))
  const sine = Math.abs(Math.sin(clamped.rotation))
  const extentX = (clamped.width / 2) * cosine + (clamped.length / 2) * sine
  const extentZ = (clamped.width / 2) * sine + (clamped.length / 2) * cosine
  return {
    length: {
      min: CAR_LIMITS.length[0],
      max: Math.max(CAR_LIMITS.length[0], Math.min(CAR_LIMITS.length[1], dimensions.length - 0.45)),
    },
    width: {
      min: CAR_LIMITS.width[0],
      max: Math.max(CAR_LIMITS.width[0], Math.min(CAR_LIMITS.width[1], dimensions.width - 0.4)),
    },
    height: {
      min: CAR_LIMITS.height[0],
      max: Math.max(CAR_LIMITS.height[0], Math.min(CAR_LIMITS.height[1], dimensions.height - 0.2)),
    },
    elevation: { min: 0, max: carLiftLimit(clamped.height, dimensions), step: 0.05 },
    x: {
      min: -Math.max(0, dimensions.width / 2 - PANEL_THICKNESS - extentX - 0.08),
      max: Math.max(0, dimensions.width / 2 - PANEL_THICKNESS - extentX - 0.08),
    },
    z: {
      min: -Math.max(0, dimensions.length / 2 - PANEL_THICKNESS - extentZ - 0.08),
      max: Math.max(0, dimensions.length / 2 - PANEL_THICKNESS - extentZ - 0.08),
    },
  }
}

export function projectAlong(point, wall) {
  return (
    (point.x - wall.origin[0]) * wall.axis[0] +
    (point.y - wall.origin[1]) * wall.axis[1] +
    (point.z - wall.origin[2]) * wall.axis[2]
  )
}
