import { billingNow } from './paymentService'
import { subscriptionPlan } from './plans'

// Prava pristupa izvedena iz stanja naplate. Jedino mesto koje odlučuje
// šta je otključano; ekrani samo čitaju rezultat.

const MONTH = 30 * 24 * 60 * 60 * 1000

export function activeSubscription(state, now = billingNow(state)) {
  const subscription = state.subscription
  if (!subscription || subscription.paidUntil <= now) return null
  const plan = subscriptionPlan(subscription.plan)
  return plan ? { ...subscription, plan } : null
}

// Koliko je projekata pretplatnik otvorio u poslednjih 30 dana.
export function quotaUsed(state, now = billingNow(state)) {
  const subscription = activeSubscription(state, now)
  if (!subscription) return 0
  return state.unlocks.filter((entry) => entry.subscriptionId === subscription.id && now - entry.at < MONTH).length
}

/*
  Pristup jednom projektu.
    full       – detaljna računica, crteži i PDF su otključani
    source     – 'diy' | 'starter' | 'pro' | null
    lock       – { width, length, units } dok važi „Uradi sam”, inače null
    expiresAt  – do kada važi ono što otključava
    expired    – paket „Uradi sam” je postojao i istekao
    canUnlock  – pretplatnik može da otvori ovaj projekat (ima mesta u kvoti)
    quota      – { used, limit } za pretplatnika
    branding   – PDF nosi logo i podatke firme
*/
export function projectAccess(state, projectId, now = billingNow(state)) {
  const subscription = activeSubscription(state, now)
  const purchases = projectId ? state.purchases.filter((entry) => entry.projectId === projectId) : []
  const diy = purchases.filter((entry) => entry.expiresAt > now).sort((a, b) => b.expiresAt - a.expiresAt)[0] ?? null
  const base = { full: false, source: null, lock: null, expiresAt: null, expired: false, canUnlock: false, quota: null, branding: false }

  let upgrade = {}
  if (subscription) {
    const limit = subscription.plan.projects
    const used = quotaUsed(state, now)
    const opened = Boolean(projectId) && state.unlocks.some((entry) => entry.projectId === projectId && entry.subscriptionId === subscription.id)
    const unlimited = limit === Infinity
    const quota = { used, limit }
    const shared = { ...base, source: subscription.plan.id, expiresAt: subscription.paidUntil, quota, branding: subscription.plan.branding }
    if (unlimited || opened) return { ...shared, full: true }
    // Pretplata ne otključava ovaj projekat, ali važeći „Uradi sam” i dalje važi.
    if (!diy) return { ...shared, canUnlock: used < limit }
    upgrade = { canUnlock: used < limit, quota }
  }

  if (diy) {
    return { ...base, ...upgrade, full: true, source: 'diy', expiresAt: diy.expiresAt, lock: { width: diy.width, length: diy.length, units: diy.units || 1 } }
  }
  return { ...base, expired: purchases.length > 0 }
}

export function formatDate(timestamp) {
  const date = new Date(timestamp)
  const pad = (value) => String(value).padStart(2, '0')
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}.`
}

// Kratka oznaka stanja paketa za projekat.
export function accessLabel(access) {
  if (access.source === 'diy') return `Paket Uradi sam važi do ${formatDate(access.expiresAt)}`
  if (access.full && access.source === 'pro') return 'Otključano paketom Pro'
  if (access.full && access.source === 'starter') return 'Otključano paketom Starter'
  if (access.expired) return 'Paket Uradi sam je istekao'
  return ''
}
