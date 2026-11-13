// Krovni prozori: kupole ili svetlosne trake, ravnomerno po krovnim ravnima.
import { ROOF_THICKNESS } from './config'
import { roofGeometry } from './roof'

export const SKYLIGHT_KINDS = [
  { id: 'kupola', name: 'Kupole', detail: 'Svetlosna kupola 1 × 1 m' },
  { id: 'traka', name: 'Trake', detail: 'Svetlosna traka širine 1 m niz krov' },
]

export const SKYLIGHT_LIMITS = { min: 0, max: 12, step: 1 }
export const DEFAULT_SKYLIGHTS = { kind: 'kupola', count: 0 }

export function normalizeSkylights(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const count = Math.round(Number(source.count))
  return {
    kind: SKYLIGHT_KINDS.some((entry) => entry.id === source.kind) ? source.kind : DEFAULT_SKYLIGHTS.kind,
    count: Number.isFinite(count) ? Math.min(SKYLIGHT_LIMITS.max, Math.max(0, count)) : 0,
  }
}

export function skylightLayout(dimensions, roof, skylights) {
  const { kind, count } = normalizeSkylights(skylights)
  if (count <= 0) return { items: [], area: 0, kind }
  const geometry = roofGeometry(dimensions, roof)
  const planes = geometry.planes
  const items = []
  planes.forEach((plane, planeIndex) => {
    const share = Math.floor(count / planes.length) + (planeIndex < count % planes.length ? 1 : 0)
    if (share === 0) return
    const [c0, c1, , c3] = plane.corners
    const origin = [c0.x, c0.y, c0.z]
    const u = [c1.x - c0.x, c1.y - c0.y, c1.z - c0.z]
    const v = [c3.x - c0.x, c3.y - c0.y, c3.z - c0.z]
    const lengthU = Math.hypot(...u)
    const lengthV = Math.hypot(...v)
    const unitU = u.map((value) => value / lengthU)
    const unitV = v.map((value) => value / lengthV)
    let normal = [unitU[1] * unitV[2] - unitU[2] * unitV[1], unitU[2] * unitV[0] - unitU[0] * unitV[2], unitU[0] * unitV[1] - unitU[1] * unitV[0]]
    if (normal[1] < 0) normal = normal.map((value) => -value)
    const sloped = Math.abs(c0.y - c1.y) > 0.01 || Math.abs(c0.y - c3.y) > 0.01
    const slopeAlongU = sloped ? Math.abs(c0.y - c1.y) > 0.01 : lengthU <= lengthV
    const slopeLength = slopeAlongU ? lengthU : lengthV
    const spread = slopeAlongU ? lengthV : lengthU
    const margin = geometry.overhang + 0.45
    const long = kind === 'traka' ? Math.max(1, slopeLength - margin * 2) : 1
    const width = Math.min(1, Math.max(0.5, (spread - margin * 2) / share - 0.3))
    for (let index = 0; index < share; index += 1) {
      const across = margin + ((spread - margin * 2) * (index + 0.5)) / share
      const du = slopeAlongU ? lengthU / 2 : across
      const dv = slopeAlongU ? across : lengthV / 2
      items.push({
        position: [0, 1, 2].map((axis) => origin[axis] + unitU[axis] * du + unitV[axis] * dv + normal[axis] * (ROOF_THICKNESS + 0.03)),
        unitU,
        normal,
        size: slopeAlongU ? [long, width] : [width, long],
        dome: kind === 'kupola',
      })
    }
  })
  const area = items.reduce((sum, item) => sum + item.size[0] * item.size[1], 0)
  return { items, area, kind }
}
