// Bedževi po broju završenih poslova preko Mere. Posao se broji tek kad kupac
// potvrdi da je završen, pa se brojke ne mogu naduvati.
export const BADGE_TIERS = [
  { id: 'proveren', name: 'Proveren', min: 1, tone: 'bg-emerald-100 text-emerald-900 ring-emerald-300' },
  { id: 'bronza', name: 'Bronzani', min: 10, tone: 'bg-amber-100 text-amber-950 ring-amber-400' },
  { id: 'srebro', name: 'Srebrni', min: 20, tone: 'bg-slate-100 text-slate-900 ring-slate-400' },
  { id: 'zlato', name: 'Zlatni', min: 50, tone: 'bg-yellow-100 text-yellow-950 ring-yellow-500' },
  { id: 'platina', name: 'Platinasti', min: 100, tone: 'bg-indigo-100 text-indigo-950 ring-indigo-400' },
]

export function badgeFor(jobs) {
  const count = Number(jobs) || 0
  return [...BADGE_TIERS].reverse().find((tier) => count >= tier.min) ?? null
}

export function nextBadge(jobs) {
  const count = Number(jobs) || 0
  return BADGE_TIERS.find((tier) => count < tier.min) ?? null
}

export function jobsLabel(jobs) {
  const count = Number(jobs) || 0
  if (count === 0) return 'Još nema završenih poslova preko Mere'
  const last = count % 10
  const word = last === 1 && count % 100 !== 11 ? 'završen posao' : last >= 2 && last <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'završena posla' : 'završenih poslova'
  return `${count} ${word} preko Mere`
}

// Uslovi firme za poređenje ponuda: garancija u godinama i rok montaže.
export function yearsLabel(years) {
  const count = Number(years) || 0
  if (!count) return '—'
  const last = count % 10
  const word = last === 1 && count % 100 !== 11 ? 'godina' : last >= 2 && last <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'godine' : 'godina'
  return `${count} ${word}`
}

export const VAT_RATE = 0.2

// Firme koje unose cene bez PDV-a svode se na cenu sa PDV-om, da ponude budu uporedive.
export function vatFactor(partner) {
  return partner?.terms?.pricesWithVat === false ? 1 + VAT_RATE : 1
}
