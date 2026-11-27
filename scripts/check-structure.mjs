// Brza provera statike za nekoliko tipičnih objekata.
// U kontejneru: node --import /tmp/reg.mjs scripts/check-structure.mjs
// (/tmp/reg.mjs dodaje .js uvozima bez ekstenzije, kao što radi Vite.)
import { buildEstimate } from '../src/estimate.js'

const base = {
  door: { style: 'sectional', wall: 'front', width: 2.5, height: 2.2, along: 0 },
  windows: [],
  pedestrianDoors: [],
  rooms: [],
  furniture: [],
}

const cases = [
  ['Garaža 3×6, jedna voda', { width: 3, length: 6, height: 2.5 }, { kind: 'mono', pitch: 5, fall: 'back' }],
  ['Radionica 8×10, rogovi', { width: 8, length: 10, height: 3.5 }, { kind: 'duo', pitch: 15, ridge: 'length' }],
  ['Radionica 8×10, rešetka', { width: 8, length: 10, height: 3.5 }, { kind: 'duo', pitch: 15, ridge: 'length', truss: true }],
  ['Magacin 12×20, rešetka', { width: 12, length: 20, height: 4.5 }, { kind: 'duo', pitch: 12, ridge: 'length', truss: true }],
  ['Radionica 8×10, okviri 4 m', { width: 8, length: 10, height: 3.5 }, { kind: 'duo', pitch: 15, ridge: 'length' }, { system: 'radionica', frameSpacing: 4 }],
  ['Radionica 8×10, okviri 5 m', { width: 8, length: 10, height: 3.5 }, { kind: 'duo', pitch: 15, ridge: 'length' }, { system: 'radionica', frameSpacing: 5 }],
  ['Magacin 12×20, okviri 4 m', { width: 12, length: 20, height: 4.5 }, { kind: 'duo', pitch: 12, ridge: 'length' }, { system: 'radionica', frameSpacing: 4 }],
  ['Hala 10×8, ravan, okviri 4 m', { width: 10, length: 8, height: 3.5 }, { kind: 'mono', pitch: 5, fall: 'back' }, { system: 'radionica', frameSpacing: 4 }],
]
const sites = [
  { place: 'beograd', altitude: 117, wind: 'open' },
  { place: 'beograd', altitude: 117, wind: 'exposed' },
  { place: 'bor', altitude: 381, wind: 'open' },
]

const kg = { 'box-40x40x2': 2.31, 'box-60x40x2': 2.93, 'box-80x40x2': 3.56, 'box-80x40x3': 5.19, 'box-100x50x3': 6.6, 'box-120x60x4': 10.7, 'box-140x80x4': 13.2, 'post-80x80x2': 4.82, 'post-80x80x3': 7.07, 'post-100x100x3': 8.96, 'post-120x120x4': 14.4 }

for (const [label, dimensions, roof, structure] of cases) {
  for (const site of sites) {
    const estimate = buildEstimate({ ...base, dimensions, roof, site, structure })
    const s = estimate.sizing
    const steel = estimate.lines.filter((line) => line.section === 'Konstrukcija').reduce((sum, line) => sum + (line.meters || 0) * (kg[line.priceId] || 0), 0)
    const members = s.members.map((m) => `${m.name} ${m.check.profile?.name.replace('kutija ', '') ?? ''} ${Math.round(m.check.use * 100)}%`).join(' | ')
    console.log(`${label.padEnd(24)} ${`${site.place}/${site.wind}`.padEnd(16)} g ${s.loads.g.toFixed(2)} s ${s.snow.toFixed(1)} | ${Math.round(steel)} kg (${(steel / dimensions.width / dimensions.length).toFixed(1)} kg/m²) ok=${s.ok}\n    ${members}`)
  }
}
