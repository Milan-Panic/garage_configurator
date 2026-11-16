import { FLOOR_LEVEL } from './config'
import { WALL_IDS, wallFrame } from './layout'
import { ROOF_MATERIALS, WALL_MATERIALS, findMaterial } from './materials'
import { roofGeometry, roofMetrics } from './roof'
import { openingsByWall, wallLength } from './structure'

// Raspored tabli lima i panela po zidovima i krovu.
// Table se poručuju sečene na dužinu, pa je otpad ono što se odseče na licu
// mesta: otvori, kosina uz krov i višak širine poslednje table.

const MIN_PIECE = 0.05

function roundCut(value) {
  return Math.ceil(value * 20 - 1e-9) / 20
}

function tally(lengths) {
  const groups = new Map()
  lengths.forEach((length) => groups.set(length, (groups.get(length) ?? 0) + 1))
  return [...groups.entries()].sort((left, right) => right[0] - left[0]).map(([length, count]) => ({ length, count }))
}

/*
  Zidovi: table stoje uspravno, od levog kraja zida gledano spolja.
  Tabla koja cela pada u otvor ne poručuje se u punoj dužini, već samo
  komad iznad (i ispod) otvora. Vraća null za obloge koje nisu u tablama.
*/
export function wallSheets(scene) {
  const material = findMaterial(WALL_MATERIALS, scene.wallMaterialId)
  const cover = material.cover ?? { kind: 'sheet', width: 1.1, name: 'Zidna obloga' }
  if (cover.kind !== 'sheet') return null
  const { dimensions } = scene
  const geometry = roofGeometry(dimensions, scene.roof)
  const openings = openingsByWall(scene)
  const lengths = []
  let ordered = 0
  let net = 0

  const walls = WALL_IDS.map((id) => {
    const wall = wallFrame(id, dimensions)
    const span = wallLength(id, dimensions)
    const heightAt = (u) => geometry.underside(wall.origin[0] + wall.axis[0] * u, wall.origin[2] + wall.axis[2] * u) - FLOOR_LEVEL
    const count = Math.max(1, Math.ceil(span / cover.width - 1e-9))
    const strips = []
    for (let index = 0; index < count; index += 1) {
      const u0 = -span / 2 + index * cover.width
      const u1 = Math.min(span / 2, u0 + cover.width)
      const samples = [0, 0.25, 0.5, 0.75, 1].map((t) => heightAt(u0 + (u1 - u0) * t))
      const top = roundCut(Math.max(...samples))
      const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length
      let pieces = [[0, top]]
      let holes = 0
      openings[id].forEach((opening) => {
        const left = opening.along - opening.width / 2
        const right = opening.along + opening.width / 2
        const overlap = Math.min(u1, right) - Math.max(u0, left)
        if (overlap <= 0.001) return
        holes += overlap * opening.height
        // Otvor preko cele širine table: tabla se deli na komad ispod i iznad.
        if (left <= u0 + 0.02 && right >= u1 - 0.02) {
          const from = opening.sill
          const to = opening.sill + opening.height
          pieces = pieces.flatMap(([low, high]) => {
            if (to <= low || from >= high) return [[low, high]]
            return [
              [low, from],
              [to, high],
            ].filter(([a, b]) => b - a > MIN_PIECE)
          })
        }
      })
      const cuts = pieces.map(([low, high]) => roundCut(high - low))
      cuts.forEach((length) => {
        lengths.push(length)
        ordered += length * cover.width
      })
      net += Math.max(0, (u1 - u0) * mean - holes)
      strips.push({ u0, u1, top, pieces, cuts })
    }
    return { id, label: wall.label, span, heightAt, strips, openings: openings[id], count: strips.reduce((sum, strip) => sum + strip.cuts.length, 0) }
  })

  return summary(cover.name, cover.width, walls, lengths, ordered, net)
}

// Krov: table idu niz kosinu, od strehe do slemena, jedna do druge duž strehe.
export function roofSheets(scene) {
  const material = findMaterial(ROOF_MATERIALS, scene.roofMaterialId)
  const cover = material.cover ?? { kind: 'sheet', useful: 1, name: material.name }
  if (cover.kind === 'membrane') return null
  const metrics = roofMetrics(scene.dimensions, scene.roof)
  const useful = cover.useful ?? 1
  const lengths = []
  let ordered = 0
  let net = 0
  const slopes = metrics.slopes.map((slope, index) => {
    const across = Math.max(1, Math.ceil(slope.alongCover / useful - 1e-9))
    const rows = cover.fixedLength ? Math.ceil(slope.slopeLength / (cover.fixedLength - 0.2)) : 1
    const length = cover.fixedLength ?? roundCut(slope.slopeLength)
    for (let piece = 0; piece < across * rows; piece += 1) {
      lengths.push(length)
      ordered += length * useful
    }
    net += slope.alongCover * slope.slopeLength
    return { label: metrics.slopes.length > 1 ? `Voda ${index + 1}` : 'Krov', across, rows, length, alongCover: slope.alongCover, slopeLength: slope.slopeLength, count: across * rows }
  })
  return summary(cover.name, useful, slopes, lengths, ordered, net, cover.unit || 'tabla')
}

function summary(name, width, parts, lengths, ordered, net, unit = 'tabla') {
  const waste = Math.max(0, ordered - net)
  return {
    name,
    width,
    unit,
    parts,
    order: tally(lengths),
    count: lengths.length,
    ordered,
    net,
    waste,
    wastePct: ordered > 0 ? Math.round((waste / ordered) * 100) : 0,
  }
}
