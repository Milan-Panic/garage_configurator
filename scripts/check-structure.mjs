// Brza provera statike za nekoliko tipičnih objekata.
// U kontejneru: node --import /tmp/reg.mjs scripts/check-structure.mjs
// (/tmp/reg.mjs dodaje .js uvozima bez ekstenzije, kao što radi Vite.)
import { buildEstimate } from '../src/estimate.js'
import { profileKg } from '../src/systems.js'

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
  ['Garaža 3×6, kit 1,25 m', { width: 3, length: 6, height: 2.5 }, { kind: 'mono', pitch: 5, fall: 'back' }, { system: 'kit', frameSpacing: 1.25 }],
  ['Garaža 6×6, C/Z 4,5 m', { width: 6, length: 6, height: 2.6 }, { kind: 'duo', pitch: 15, ridge: 'length' }, { system: 'cz', frameSpacing: 4.5 }],
  ['Radionica 8×10, C/Z 4,5 m', { width: 8, length: 10, height: 3.5 }, { kind: 'duo', pitch: 15, ridge: 'length' }, { system: 'cz', frameSpacing: 4.5 }],
  ['Radionica 8×10, hala 5 m', { width: 8, length: 10, height: 3.5 }, { kind: 'duo', pitch: 15, ridge: 'length' }, { system: 'hala', frameSpacing: 5 }],
  ['Magacin 12×20, C/Z 5 m', { width: 12, length: 20, height: 4.5 }, { kind: 'duo', pitch: 12, ridge: 'length' }, { system: 'cz', frameSpacing: 5 }],
  ['Magacin 12×20, hala 6 m', { width: 12, length: 20, height: 4.5 }, { kind: 'duo', pitch: 12, ridge: 'length' }, { system: 'hala', frameSpacing: 6 }],
  ['Hala 16×30, hala 6 m', { width: 16, length: 30, height: 4.5 }, { kind: 'duo', pitch: 10, ridge: 'length' }, { system: 'hala', frameSpacing: 6 }],
  ['Hala 20×40, hala 6 m', { width: 20, length: 40, height: 4.5 }, { kind: 'duo', pitch: 10, ridge: 'length' }, { system: 'hala', frameSpacing: 6 }],
  ['Hala 20×40, hala 5 m', { width: 20, length: 40, height: 4.5 }, { kind: 'duo', pitch: 10, ridge: 'length' }, { system: 'hala', frameSpacing: 5 }],
  ['Hala 20×30, jednovodni', { width: 20, length: 30, height: 4.5 }, { kind: 'mono', pitch: 6 }, { system: 'hala', frameSpacing: 6 }],
  ['Hala 20×40, visina 6 m', { width: 20, length: 40, height: 6 }, { kind: 'duo', pitch: 10, ridge: 'length' }, { system: 'hala', frameSpacing: 6 }],
  ['Hala 20×40, visina 8 m', { width: 20, length: 40, height: 8 }, { kind: 'duo', pitch: 10, ridge: 'length' }, { system: 'hala', frameSpacing: 6 }],
  ['Radionica 8×12, C/Z 5 m', { width: 8, length: 12, height: 5 }, { kind: 'duo', pitch: 12, ridge: 'length' }, { system: 'cz', frameSpacing: 4 }],
  ['Magacin 12×24, okviri 5 m', { width: 12, length: 24, height: 5 }, { kind: 'duo', pitch: 12, ridge: 'length' }, { system: 'radionica', frameSpacing: 4 }],
]
const sites = [
  { place: 'beograd', altitude: 117, wind: 'open' },
  { place: 'beograd', altitude: 117, wind: 'exposed' },
  { place: 'bor', altitude: 381, wind: 'open' },
]


for (const [label, dimensions, roof, structure] of cases) {
  for (const site of sites) {
    const estimate = buildEstimate({ ...base, dimensions, roof, site, structure })
    const s = estimate.sizing
    const steel = profileKg(estimate.lines.filter((line) => line.section === 'Konstrukcija'))
    const members = s.members.map((m) => `${m.name} ${m.check.profile?.name.replace('kutija ', '') ?? ''} ${Math.round(m.check.use * 100)}%`).join(' | ')
    console.log(`${label.padEnd(24)} ${`${site.place}/${site.wind}`.padEnd(16)} g ${s.loads.g.toFixed(2)} s ${s.snow.toFixed(1)} | ${Math.round(steel)} kg (${(steel / dimensions.width / dimensions.length).toFixed(1)} kg/m²) ok=${s.ok}\n    ${members}`)
  }
}
