// Sve cene i ograničenja paketa na jednom mestu. Vrednosti su privremene.

export const DIY = {
  id: 'diy',
  name: 'Uradi sam',
  days: 30,
  // Cena prati površinu osnove: prvi red čija granica nije pređena.
  tiers: [
    { upTo: 20, price: 2000, label: 'do 20 m²' },
    { upTo: 50, price: 3500, label: '20–50 m²' },
    { upTo: Infinity, price: 5000, label: 'preko 50 m²' },
  ],
}

export const SUBSCRIPTIONS = [
  { id: 'starter', name: 'Starter', monthly: 4990, projects: 5, branding: false },
  { id: 'pro', name: 'Pro', monthly: 9990, projects: Infinity, branding: true },
]

// Godišnje se plaća deset meseci, dva su gratis.
export const YEARLY_PAID_MONTHS = 10

export const PAYMENT_METHODS = [
  { id: 'card', name: 'Kartica' },
  { id: 'ips', name: 'IPS QR' },
  { id: 'slip', name: 'Uplatnica' },
]

export function footprintArea(dimensions, units = 1) {
  return dimensions.width * dimensions.length * (units || 1)
}

export function diyTier(area) {
  return DIY.tiers.find((tier) => area <= tier.upTo) ?? DIY.tiers[DIY.tiers.length - 1]
}

export function diyPrice(area) {
  return diyTier(area).price
}

export function subscriptionPlan(id) {
  return SUBSCRIPTIONS.find((plan) => plan.id === id) ?? null
}

// period: 'month' ili 'year'.
export function subscriptionPrice(id, period) {
  const plan = subscriptionPlan(id)
  if (!plan) return 0
  return period === 'year' ? plan.monthly * YEARLY_PAID_MONTHS : plan.monthly
}

export function planName(id) {
  if (id === 'diy') return DIY.name
  return subscriptionPlan(id)?.name ?? 'Besplatno'
}
