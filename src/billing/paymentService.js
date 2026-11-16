import { useSyncExternalStore } from 'react'
import { DIY, diyPrice, footprintArea, subscriptionPlan, subscriptionPrice } from './plans'

// Demo plaćanje. Ništa se ne šalje sa uređaja: kupovine žive u localStorage.
// Kad stigne pravi procesor, menja se samo ovaj fajl: `pay` zove server,
// a `readState` čita stanje koje server potvrdi. Ostatak aplikacije koristi
// isključivo funkcije izvezene odavde i iz entitlements.js.

const KEY = 'mera-billing-v1'
const DAY = 24 * 60 * 60 * 1000
const EMPTY = { purchases: [], subscription: null, unlocks: [], company: { name: '', details: '', logo: '' }, clockOffsetDays: 0 }

let state = read()
const listeners = new Set()

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!raw || typeof raw !== 'object') return EMPTY
    return {
      purchases: Array.isArray(raw.purchases) ? raw.purchases : [],
      subscription: raw.subscription && typeof raw.subscription === 'object' ? raw.subscription : null,
      unlocks: Array.isArray(raw.unlocks) ? raw.unlocks : [],
      company: { ...EMPTY.company, ...(raw.company && typeof raw.company === 'object' ? raw.company : {}) },
      clockOffsetDays: Number.isFinite(raw.clockOffsetDays) ? raw.clockOffsetDays : 0,
    }
  } catch {
    return EMPTY
  }
}

function write(next) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Bez mesta u pregledaču kupovina važi do zatvaranja kartice.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== KEY) return
    state = read()
    listeners.forEach((listener) => listener())
  })
}

export function readState() {
  return state
}

export function useBilling() {
  return useSyncExternalStore(subscribe, readState)
}

// Sat aplikacije. Admin može da ga pomeri unapred da proveri istek paketa.
export function billingNow(current = state) {
  return Date.now() + (current.clockOffsetDays || 0) * DAY
}

// Porudžbina za paket „Uradi sam”: cena i mere koje će biti zaključane.
export function diyOrder({ projectId, projectName, dimensions, units = 1 }) {
  const area = footprintArea(dimensions, units)
  return {
    kind: 'diy',
    title: DIY.name,
    projectId,
    projectName,
    width: dimensions.width,
    length: dimensions.length,
    units: units || 1,
    area,
    price: diyPrice(area),
  }
}

export function subscriptionOrder(planId, period) {
  const plan = subscriptionPlan(planId)
  return { kind: 'subscription', title: plan.name, plan: plan.id, period, price: subscriptionPrice(plan.id, period) }
}

// Simulira naplatu: kratko čekanje, pa upis kupovine. Podaci o kartici se ne primaju.
export function pay(order, method) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const now = billingNow()
      const receipt = { id: `demo-${now.toString(36)}`, paidAt: now, method, price: order.price }
      if (order.kind === 'diy') {
        const purchase = {
          ...receipt,
          projectId: order.projectId,
          expiresAt: now + DIY.days * DAY,
          width: order.width,
          length: order.length,
          units: order.units,
          area: order.area,
        }
        write({ ...state, purchases: [...state.purchases, purchase] })
      } else {
        const days = order.period === 'year' ? 365 : 30
        write({ ...state, subscription: { ...receipt, plan: order.plan, period: order.period, paidUntil: now + days * DAY } })
      }
      resolve(receipt)
    }, 1400)
  })
}

// Pretplatnik otvara detalje za projekat. Starter time troši jedno mesto u mesecu.
export function unlockProject(projectId) {
  if (state.unlocks.some((entry) => entry.projectId === projectId && entry.subscriptionId === state.subscription?.id)) return
  write({ ...state, unlocks: [...state.unlocks, { projectId, at: billingNow(), subscriptionId: state.subscription?.id ?? null }] })
}

export function saveCompany(company) {
  write({ ...state, company: { ...state.company, ...company } })
}

// Za testiranje iz /admin.
export function resetBilling() {
  write({ ...EMPTY })
}

export function shiftClock(days) {
  write({ ...state, clockOffsetDays: days === 0 ? 0 : (state.clockOffsetDays || 0) + days })
}
