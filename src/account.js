import { useSyncExternalStore } from 'react'

// Ko je prijavljen. Sesija je u httpOnly kolačiću, pa je JavaScript ne vidi:
// stanje se uvek pita od servera preko /api/account/me.

let state = { status: 'loading', user: null, googleClientId: '', mailReady: false }
let prompt = null
const listeners = new Set()

function emit() {
  listeners.forEach((listener) => listener())
}

function set(patch) {
  state = { ...state, ...patch }
  emit()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAccount() {
  return useSyncExternalStore(subscribe, () => state)
}

export function readAccount() {
  return state
}

export async function loadAccount() {
  try {
    const [me, config] = await Promise.all([request('/api/account/me'), request('/api/account/config')])
    set({ status: me.user ? 'user' : 'guest', user: me.user, googleClientId: config.googleClientId || '', mailReady: Boolean(config.mailReady) })
  } catch {
    set({ status: 'guest', user: null })
  }
  return state
}

export async function login(email, password) {
  const payload = await request('/api/account/login', { method: 'POST', body: { email, password } })
  return signedIn(payload.user)
}

export async function register(name, email, password) {
  const payload = await request('/api/account/register', { method: 'POST', body: { name, email, password } })
  return signedIn(payload.user)
}

export async function loginWithGoogle(credential) {
  const payload = await request('/api/account/google', { method: 'POST', body: { credential } })
  return signedIn(payload.user)
}

export async function logout() {
  await request('/api/account/logout', { method: 'POST' }).catch(() => {})
  set({ status: 'guest', user: null })
}

export function forgotPassword(email) {
  return request('/api/account/forgot', { method: 'POST', body: { email } })
}

export async function resetPassword(token, password) {
  const payload = await request('/api/account/reset', { method: 'POST', body: { token, password } })
  return signedIn(payload.user)
}

export async function updateProfile(profile) {
  const payload = await request('/api/account/profile', { method: 'PUT', body: profile })
  set({ user: payload.user })
  return payload.user
}

export async function changePassword(current, next) {
  const payload = await request('/api/account/password', { method: 'POST', body: { current, next } })
  set({ user: payload.user })
  return payload.user
}

export function logoutOthers() {
  return request('/api/account/logout-others', { method: 'POST' })
}

export async function deleteAccount(confirm) {
  await request('/api/account/delete', { method: 'POST', body: { confirm } })
  set({ status: 'guest', user: null })
}

function signedIn(user) {
  set({ status: 'user', user })
  if (prompt) {
    prompt.resolve(user)
    prompt = null
    emitPrompt()
  }
  return user
}

// ---------- Prozor za prijavu ----------
// requireAccount otvara prozor i čeka: vraća korisnika, ili null ako je prozor zatvoren.

const promptListeners = new Set()

function emitPrompt() {
  promptListeners.forEach((listener) => listener())
}

export function useAccountPrompt() {
  return useSyncExternalStore(
    (listener) => {
      promptListeners.add(listener)
      return () => promptListeners.delete(listener)
    },
    () => prompt,
  )
}

export function requireAccount(reason = '') {
  if (state.user) return Promise.resolve(state.user)
  return openAccountPrompt(reason)
}

export function openAccountPrompt(reason = '', mode = 'login') {
  if (prompt) prompt.resolve(null)
  return new Promise((resolve) => {
    prompt = { reason, mode, resolve }
    emitPrompt()
  })
}

export function closeAccountPrompt() {
  if (!prompt) return
  prompt.resolve(null)
  prompt = null
  emitPrompt()
}

// ---------- Zahtevi ----------

export async function request(url, { method = 'GET', body } = {}) {
  const response = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let payload = {}
  try {
    payload = await response.json()
  } catch {
    // Prazan odgovor.
  }
  if (response.status === 401 && state.user && !url.startsWith('/api/account/login')) set({ status: 'guest', user: null })
  if (!response.ok) {
    const error = new Error(payload.error || 'Zahtev nije uspeo. Proveri vezu sa serverom.')
    error.status = response.status
    throw error
  }
  return payload
}
