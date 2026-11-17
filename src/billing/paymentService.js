import { useSyncExternalStore } from 'react'
import { request } from '../account'
import { DIY, diyPrice, footprintArea, subscriptionPlan, subscriptionPrice } from './plans'

// Probna naplata. Kupovine su vezane za nalog i čuvaju se na serveru; novac se ne naplaćuje.
// Kad stigne pravi procesor, menja se server (`payOrder`) i `pay` ovde. Ostatak aplikacije
// koristi isključivo funkcije izvezene odavde i iz entitlements.js.

const DAY = 24 * 60 * 60 * 1000
const EMPTY = { purchases: [], subscription: null, unlocks: [], company: { name: '', details: '', logo: '' }, clockOffsetDays: 0 }

let state = EMPTY
let companyTimer = null
const listeners = new Set()

function write(next) {
  state = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function readState() {
  return state
}

export function useBilling() {
  return useSyncExternalStore(subscribe, readState)
}

// Učitava pakete prijavljenog naloga; bez naloga nema ni paketa.
export async function loadBilling(signedIn) {
  if (!signedIn) {
    write(EMPTY)
    return
  }
  try {
    const payload = await request('/api/billing/state')
    write(payload.state || EMPTY)
  } catch {
    write(EMPTY)
  }
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

// Server računa cenu i mere iz sačuvanog projekta. Podaci o kartici se ne primaju.
export async function pay(order, method) {
  const payload = await request('/api/billing/pay', { method: 'POST', body: { order, method } })
  write(payload.state)
  return payload.receipt
}

// Pretplatnik otvara detalje za projekat. Starter time troši jedno mesto u mesecu.
export async function unlockProject(projectId) {
  const payload = await request('/api/billing/unlock', { method: 'POST', body: { projectId } })
  write(payload.state)
}

// Podaci firme se menjaju dok se kuca, a na server idu kad kucanje stane.
export function saveCompany(company) {
  write({ ...state, company: { ...state.company, ...company } })
  clearTimeout(companyTimer)
  companyTimer = setTimeout(() => {
    request('/api/billing/company', { method: 'PUT', body: state.company }).catch(() => {})
  }, 600)
}

// Za testiranje iz /admin, na nalogu koji je prijavljen u ovom pregledaču.
export async function resetBilling() {
  const payload = await request('/api/billing/test', { method: 'POST', body: { action: 'reset' } })
  write(payload.state)
}

export async function shiftClock(days) {
  const payload = await request('/api/billing/test', { method: 'POST', body: { action: 'clock', days } })
  write(payload.state)
}
