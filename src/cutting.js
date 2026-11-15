// Raspored rezanja profila po šipkama standardne dužine.
// Ulaz su redovi računice koji nose `cuts` (komadi po dužini).

export const BAR_LENGTH = 6
const KERF = 0.003

// Svaki par (deo konstrukcije, dužina) dobija broj pozicije, redom kroz spisak.
export function cutPositions(estimate) {
  const positions = []
  estimate.lines.forEach((line) => {
    if (!line.cuts) return
    const split = line.item.lastIndexOf(', ')
    const part = split > 0 ? line.item.slice(0, split) : line.item
    const profile = split > 0 ? line.item.slice(split + 2) : 'profil'
    line.cuts.forEach((cut) => {
      positions.push({ mark: positions.length + 1, part, profile, length: cut.length, count: cut.count })
    })
  })
  return positions
}

/*
  Za svaki profil: šipke od 6 m sa komadima koji se iz njih seku i ostatkom.
  Komadi se ređaju od najdužeg i idu u prvu šipku u koju staju. Komad duži od
  šipke deli se na cele šipke i nastavak, koji se spaja zavarivanjem.
*/
export function cuttingPlan(estimate) {
  const groups = new Map()
  cutPositions(estimate).forEach((position) => {
    if (!groups.has(position.profile)) groups.set(position.profile, [])
    const pieces = groups.get(position.profile)
    for (let index = 0; index < position.count; index += 1) {
      let rest = position.length
      let joined = false
      while (rest > BAR_LENGTH + 1e-9) {
        pieces.push({ mark: position.mark, length: BAR_LENGTH, joined: true })
        rest = round(rest - BAR_LENGTH)
        joined = true
      }
      if (rest > 0.001) pieces.push({ mark: position.mark, length: rest, joined })
    }
  })

  return [...groups.entries()].map(([profile, pieces]) => {
    const bars = []
    pieces
      .sort((left, right) => right.length - left.length)
      .forEach((piece) => {
        // Rez troši 3 mm, ali komad koji tačno staje u ostatak ne traži novi rez.
        const need = piece.length + KERF
        let bar = bars.find((entry) => entry.free + 1e-9 >= piece.length)
        if (!bar) {
          bar = { pieces: [], free: BAR_LENGTH }
          bars.push(bar)
        }
        bar.pieces.push(piece)
        bar.free = Math.max(0, round(bar.free - need))
      })
    const used = pieces.reduce((sum, piece) => sum + piece.length, 0)
    const bought = bars.length * BAR_LENGTH
    return {
      profile,
      bars: groupBars(bars),
      barCount: bars.length,
      used: round(used),
      waste: round(bought - used),
      wastePct: bought > 0 ? Math.round(((bought - used) / bought) * 100) : 0,
      joined: pieces.some((piece) => piece.joined),
    }
  })
}

// Šipke sa istim rasporedom prikazuju se jednom, sa brojem ponavljanja.
function groupBars(bars) {
  const patterns = new Map()
  bars.forEach((bar) => {
    const key = bar.pieces.map((piece) => `${piece.mark}:${piece.length}`).join('|')
    const existing = patterns.get(key)
    if (existing) existing.times += 1
    else patterns.set(key, { times: 1, pieces: bar.pieces, rest: round(BAR_LENGTH - bar.pieces.reduce((sum, piece) => sum + piece.length, 0)) })
  })
  return [...patterns.values()]
}

function round(value) {
  return Math.round(value * 1000) / 1000
}
