import { FLOOR_LEVEL, PANEL_THICKNESS, ROOF_OVERHANG } from './config'

export const ROOF_KINDS = [
  { id: 'flat', name: 'Ravan' },
  { id: 'mono', name: 'Jedna voda' },
  { id: 'duo', name: 'Dve vode' },
]

export const ROOF_FALLS = [
  { id: 'front', name: 'Napred' },
  { id: 'back', name: 'Nazad' },
  { id: 'left', name: 'Levo' },
  { id: 'right', name: 'Desno' },
]

export const ROOF_RIDGES = [
  { id: 'length', name: 'Uzduž', detail: 'Slemen napred–nazad, vode levo i desno' },
  { id: 'width', name: 'Popreko', detail: 'Slemen levo–desno, vode napred i nazad' },
]

export const PITCH_LIMITS = { min: 5, max: 30, step: 1 }

export const initialRoof = {
  kind: 'flat',
  pitch: 10,
  fall: 'back',
  ridge: 'length',
}

export function normalizeRoof(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const kind = ROOF_KINDS.some((entry) => entry.id === source.kind) ? source.kind : initialRoof.kind
  let pitch = Math.round(Number(source.pitch))
  if (!Number.isFinite(pitch)) pitch = initialRoof.pitch
  pitch = Math.min(PITCH_LIMITS.max, Math.max(PITCH_LIMITS.min, pitch))
  const fall = ROOF_FALLS.some((entry) => entry.id === source.fall) ? source.fall : initialRoof.fall
  const ridge = ROOF_RIDGES.some((entry) => entry.id === source.ridge) ? source.ridge : initialRoof.ridge
  return { kind, pitch, fall, ridge }
}

export function roofGeometry(dimensions, roofInput) {
  const roof = normalizeRoof(roofInput)
  const { width, length, height } = dimensions
  const y0 = FLOOR_LEVEL + height
  const radians = roof.kind === 'flat' ? 0 : (roof.pitch * Math.PI) / 180
  const slope = Math.tan(radians)
  const overhang = ROOF_OVERHANG

  function underside(x, z) {
    if (radians === 0) return y0
    if (roof.kind === 'mono') {
      if (roof.fall === 'front') return y0 + (length / 2 - z) * slope
      if (roof.fall === 'back') return y0 + (z + length / 2) * slope
      if (roof.fall === 'left') return y0 + (x + width / 2) * slope
      return y0 + (width / 2 - x) * slope
    }
    if (roof.ridge === 'length') return y0 + (width / 2 - Math.abs(x)) * slope
    return y0 + (length / 2 - Math.abs(z)) * slope
  }

  const samples = [
    [0, 0],
    [-width / 2, length / 2],
    [width / 2, length / 2],
    [-width / 2, -length / 2],
    [width / 2, -length / 2],
  ]
  const rise = Math.max(0, ...samples.map(([x, z]) => underside(x, z) - y0))
  const x0 = -width / 2 - overhang
  const x1 = width / 2 + overhang
  const z0 = -length / 2 - overhang
  const z1 = length / 2 + overhang

  const planes = []
  if (roof.kind === 'duo' && roof.ridge === 'length') {
    planes.push(plane(x0, 0, z0, z1, underside, [3, 0]))
    planes.push(plane(0, x1, z0, z1, underside, [1, 2]))
  } else if (roof.kind === 'duo' && roof.ridge === 'width') {
    planes.push(plane(x0, x1, 0, z1, underside, [0, 1]))
    planes.push(plane(x0, x1, z0, 0, underside, [2, 3]))
  } else {
    const drips =
      roof.kind === 'mono'
        ? { front: [0, 1], back: [2, 3], left: [3, 0], right: [1, 2] }[roof.fall]
        : length >= width
          ? [[3, 0], [1, 2]]
          : [[0, 1], [2, 3]]
    planes.push(plane(x0, x1, z0, z1, underside, drips))
  }

  const walls = [
    { outward: [0, 0, 1], inward: [0, 0, -1], at: (t) => point(lerp(-width / 2, width / 2, t), length / 2) },
    { outward: [0, 0, -1], inward: [0, 0, 1], at: (t) => point(lerp(-width / 2, width / 2, t), -length / 2) },
    { outward: [-1, 0, 0], inward: [1, 0, 0], at: (t) => point(-width / 2, lerp(length / 2, -length / 2, t)) },
    { outward: [1, 0, 0], inward: [-1, 0, 0], at: (t) => point(width / 2, lerp(-length / 2, length / 2, t)) },
  ]
  const caps = walls
    .map((wall) => capFor(wall, underside, y0))
    .filter(Boolean)

  return { roof, y0, rise, radians, underside, planes, caps, overhang }
}

function point(x, z) {
  return { x, z }
}

function lerp(from, to, t) {
  return from + (to - from) * t
}

function plane(xL, xR, zBack, zFront, underside, drips) {
  const corners = [
    { x: xL, y: underside(xL, zFront), z: zFront },
    { x: xR, y: underside(xR, zFront), z: zFront },
    { x: xR, y: underside(xR, zBack), z: zBack },
    { x: xL, y: underside(xL, zBack), z: zBack },
  ]
  const edges = Array.isArray(drips[0]) ? drips : [drips]
  return { corners, drips: edges }
}

function capFor(wall, underside, y0) {
  const start = wall.at(0)
  const mid = wall.at(0.5)
  const end = wall.at(1)
  const ys = [start, mid, end].map((spot) => underside(spot.x, spot.z))
  const peak = ys[1] > (ys[0] + ys[2]) / 2 + 0.03
  if (Math.max(...ys) < y0 + 0.025) return null
  const lift = (spot, y) => ({ x: spot.x, y: Math.max(y, y0 + 0.008), z: spot.z })
  const points = peak
    ? [lift(start, ys[0]), lift(mid, ys[1]), lift(end, ys[2])]
    : [lift(start, y0), lift(end, y0), lift(end, ys[2]), lift(start, ys[0])]
  return { points, inward: wall.inward, thickness: PANEL_THICKNESS }
}

export function roofMetrics(dimensions, roofInput) {
  const roof = normalizeRoof(roofInput)
  const { width, length } = dimensions
  const radians = roof.kind === 'flat' ? 0 : (roof.pitch * Math.PI) / 180
  const cosine = Math.cos(radians) || 1
  const overhang = ROOF_OVERHANG
  const slopes = []

  if (roof.kind === 'flat') {
    slopes.push({
      run: length,
      along: width,
      slopeLength: length + overhang * 2,
      alongCover: width + overhang * 2,
    })
  } else if (roof.kind === 'mono') {
    const alongWidth = roof.fall === 'front' || roof.fall === 'back'
    const run = alongWidth ? length : width
    const along = alongWidth ? width : length
    slopes.push({
      run,
      along,
      slopeLength: (run + overhang * 2) / cosine,
      alongCover: along + overhang * 2,
    })
  } else if (roof.ridge === 'length') {
    slopes.push(
      {
        run: width / 2,
        along: length,
        slopeLength: (width / 2 + overhang) / cosine,
        alongCover: length + overhang * 2,
      },
      {
        run: width / 2,
        along: length,
        slopeLength: (width / 2 + overhang) / cosine,
        alongCover: length + overhang * 2,
      },
    )
  } else {
    slopes.push(
      {
        run: length / 2,
        along: width,
        slopeLength: (length / 2 + overhang) / cosine,
        alongCover: width + overhang * 2,
      },
      {
        run: length / 2,
        along: width,
        slopeLength: (length / 2 + overhang) / cosine,
        alongCover: width + overhang * 2,
      },
    )
  }

  const area = slopes.reduce((sum, slope) => sum + slope.slopeLength * slope.alongCover, 0)
  return { roof, radians, slopes, area }
}
