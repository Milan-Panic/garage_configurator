import { createHash, randomBytes } from 'node:crypto'
import { DIY, PAYMENT_METHODS, diyPrice, footprintArea, subscriptionPlan, subscriptionPrice } from '../src/billing/plans.js'

// Nalozi kupaca: prijava, sesije, reset lozinke, projekti i paketi.
// Sesija je nasumičan token u httpOnly kolačiću; u bazi stoji samo njegov heš.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PROJECT_ID = /^project-[a-z0-9-]{4,80}$/
const DAY = 24 * 60 * 60 * 1000
const MONTH = 30 * DAY
const SESSION_MS = 60 * DAY
const RESET_MS = 60 * 60 * 1000
const EMPTY_BILLING = { purchases: [], subscription: null, unlocks: [], company: { name: '', details: '', logo: '' }, clockOffsetDays: 0 }

let database
let hashPassword
let checkPassword

export function openAccounts(db, passwords) {
  database = db
  hashPassword = passwords.hashPassword
  checkPassword = passwords.checkPassword
  database.exec(`
    DROP TABLE IF EXISTS projects;
    DROP TABLE IF EXISTS visitor_active;
    DROP TABLE IF EXISTS resume_tokens;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      password_hash TEXT,
      google_sub TEXT UNIQUE,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      seen_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS password_resets (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS user_projects (
      user_id TEXT NOT NULL,
      id TEXT NOT NULL,
      name TEXT NOT NULL,
      scene_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, id)
    );
    CREATE TABLE IF NOT EXISTS user_active (
      user_id TEXT PRIMARY KEY,
      active_id TEXT
    );
    CREATE TABLE IF NOT EXISTS user_billing (
      user_id TEXT PRIMARY KEY,
      state_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS user_sessions_user ON user_sessions (user_id);
  `)
  ensureColumn('inquiries', 'project_id', 'TEXT')
  ensureColumn('partner_leads', 'project_id', 'TEXT')
}

function ensureColumn(table, name, type) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all()
  if (columns.length === 0 || columns.some((column) => column.name === name)) return
  database.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`)
}

// ---------- Nalog i sesije ----------

export function registerUser(input) {
  const email = clean(input.email, 80).toLowerCase()
  const name = clean(input.name, 80)
  const password = String(input.password ?? '')
  if (!name) return { error: 'Upiši ime.' }
  if (!EMAIL.test(email)) return { error: 'Imejl nije ispravan.' }
  if (password.length < 8) return { error: 'Lozinka mora da ima bar 8 znakova.' }
  const existing = database.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) return { error: 'Nalog sa tim imejlom već postoji. Prijavi se ili zatraži novu lozinku.' }
  const id = newUserId()
  database.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)').run(
    id,
    email,
    name,
    hashPassword(password),
    new Date().toISOString(),
  )
  return { user: publicUser(id), token: startSession(id) }
}

export function loginUser(email, password) {
  const row = database.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(clean(email, 80).toLowerCase())
  if (!row || !row.password_hash || !checkPassword(String(password ?? ''), row.password_hash)) return null
  return { user: publicUser(row.id), token: startSession(row.id) }
}

// Google je već potvrdio imejl, pa se nalog sa istim imejlom samo povezuje.
export function googleUser({ sub, email, name }) {
  const address = clean(email, 80).toLowerCase()
  let row = database.prepare('SELECT id FROM users WHERE google_sub = ?').get(sub)
  if (!row && EMAIL.test(address)) {
    row = database.prepare('SELECT id FROM users WHERE email = ?').get(address)
    if (row) database.prepare('UPDATE users SET google_sub = ? WHERE id = ?').run(sub, row.id)
  }
  if (!row) {
    if (!EMAIL.test(address)) return { error: 'Google nije poslao imejl.' }
    const id = newUserId()
    database.prepare('INSERT INTO users (id, email, name, google_sub, created_at) VALUES (?, ?, ?, ?, ?)').run(
      id,
      address,
      clean(name, 80) || address.split('@')[0],
      sub,
      new Date().toISOString(),
    )
    row = { id }
  }
  return { user: publicUser(row.id), token: startSession(row.id) }
}

export function userFromToken(token) {
  if (!token) return null
  const hash = digest(token)
  const session = database.prepare('SELECT user_id, seen_at FROM user_sessions WHERE token_hash = ?').get(hash)
  if (!session) return null
  const now = Date.now()
  if (now - session.seen_at > SESSION_MS) {
    database.prepare('DELETE FROM user_sessions WHERE token_hash = ?').run(hash)
    return null
  }
  // Sesija se produžava dok se koristi; upis najviše jednom na sat.
  if (now - session.seen_at > 60 * 60 * 1000) database.prepare('UPDATE user_sessions SET seen_at = ? WHERE token_hash = ?').run(now, hash)
  return publicUser(session.user_id)
}

export function endSession(token) {
  if (token) database.prepare('DELETE FROM user_sessions WHERE token_hash = ?').run(digest(token))
}

// Odjava sa svih uređaja osim ovog.
export function endOtherSessions(userId, token) {
  database.prepare('DELETE FROM user_sessions WHERE user_id = ? AND token_hash != ?').run(userId, digest(token))
}

export function updateProfile(userId, input) {
  const name = clean(input.name, 80)
  if (!name) return { error: 'Ime ne može da ostane prazno.' }
  database.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(name, clean(input.phone, 40), userId)
  return { user: publicUser(userId) }
}

export function changePassword(userId, token, current, next) {
  const row = database.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId)
  if (!row) return { error: 'Nalog nije pronađen.' }
  if (row.password_hash && !checkPassword(String(current ?? ''), row.password_hash)) return { error: 'Trenutna lozinka nije tačna.' }
  if (String(next ?? '').length < 8) return { error: 'Nova lozinka mora da ima bar 8 znakova.' }
  database.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(String(next)), userId)
  endOtherSessions(userId, token)
  return { user: publicUser(userId) }
}

export function createReset(email) {
  const row = database.prepare('SELECT id, name, email FROM users WHERE email = ?').get(clean(email, 80).toLowerCase())
  if (!row) return null
  const token = randomBytes(24).toString('hex')
  database.prepare('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(digest(token), row.id, Date.now() + RESET_MS)
  return { token, name: row.name, email: row.email }
}

export function resetPassword(token, password) {
  const hash = digest(clean(token, 80))
  const row = database.prepare('SELECT user_id, expires_at, used FROM password_resets WHERE token_hash = ?').get(hash)
  if (!row || row.used || row.expires_at < Date.now()) return { error: 'Link za novu lozinku je istekao ili je već iskorišćen. Zatraži novi.' }
  if (String(password ?? '').length < 8) return { error: 'Lozinka mora da ima bar 8 znakova.' }
  database.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(String(password)), row.user_id)
  database.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ?').run(row.user_id)
  database.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(row.user_id)
  return { user: publicUser(row.user_id), token: startSession(row.user_id) }
}

// Upiti ostaju majstorima i firmama kao istorija, ali se odvezuju od naloga.
export function deleteUser(userId) {
  database.exec('BEGIN')
  try {
    for (const table of ['user_sessions', 'password_resets', 'user_projects', 'user_active', 'user_billing']) {
      database.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(userId)
    }
    database.prepare(`UPDATE inquiries SET customer_key = 'obrisan' WHERE customer_key = ?`).run(userId)
    database.prepare(`UPDATE partner_leads SET customer_key = 'obrisan' WHERE customer_key = ?`).run(userId)
    database.prepare('DELETE FROM users WHERE id = ?').run(userId)
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
  return { ok: true }
}

function startSession(userId) {
  const token = randomBytes(32).toString('hex')
  const now = Date.now()
  database.prepare('INSERT INTO user_sessions (token_hash, user_id, created_at, seen_at) VALUES (?, ?, ?, ?)').run(digest(token), userId, now, now)
  return token
}

function publicUser(id) {
  const row = database.prepare('SELECT id, email, name, phone, password_hash, google_sub, created_at FROM users WHERE id = ?').get(id)
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone || '',
    hasPassword: Boolean(row.password_hash),
    google: Boolean(row.google_sub),
    createdAt: row.created_at,
  }
}

// Id naloga je i ključ kupca u upitima, pa prati isti oblik (heks).
function newUserId() {
  return randomBytes(18).toString('hex')
}

// ---------- Projekti ----------

export function readLibrary(userId) {
  const projects = []
  for (const row of database.prepare('SELECT id, name, scene_json, updated_at FROM user_projects WHERE user_id = ?').all(userId)) {
    const scene = parseJson(row.scene_json)
    if (scene && typeof scene === 'object') projects.push({ id: row.id, name: row.name, updatedAt: row.updated_at, scene })
  }
  projects.sort((left, right) => right.updatedAt - left.updatedAt)
  const active = database.prepare('SELECT active_id FROM user_active WHERE user_id = ?').get(userId)
  const activeId = projects.some((project) => project.id === active?.active_id) ? active.active_id : null
  return { activeId, projects }
}

export function writeLibrary(userId, raw) {
  const library = sanitizeLibrary(raw)
  database.exec('BEGIN')
  try {
    database.prepare('DELETE FROM user_projects WHERE user_id = ?').run(userId)
    const insert = database.prepare('INSERT INTO user_projects (user_id, id, name, scene_json, updated_at) VALUES (?, ?, ?, ?, ?)')
    for (const project of library.projects) insert.run(userId, project.id, project.name, JSON.stringify(project.scene), project.updatedAt)
    database.prepare(`
      INSERT INTO user_active (user_id, active_id) VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET active_id = excluded.active_id
    `).run(userId, library.activeId)
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
  return library
}

export function ownsProject(userId, projectId) {
  return Boolean(database.prepare('SELECT 1 AS ok FROM user_projects WHERE user_id = ? AND id = ?').get(userId, clean(projectId, 90)))
}

function projectScene(userId, projectId) {
  const row = database.prepare('SELECT scene_json FROM user_projects WHERE user_id = ? AND id = ?').get(userId, clean(projectId, 90))
  return row ? parseJson(row.scene_json) : null
}

function sanitizeLibrary(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const projects = []
  const seen = new Set()
  for (const entry of Array.isArray(source.projects) ? source.projects.slice(0, 200) : []) {
    if (!entry || !PROJECT_ID.test(entry.id) || seen.has(entry.id) || !entry.scene || typeof entry.scene !== 'object') continue
    seen.add(entry.id)
    projects.push({
      id: entry.id,
      name: clean(entry.name, 60) || 'Objekat',
      updatedAt: Number.isFinite(entry.updatedAt) ? entry.updatedAt : Date.now(),
      scene: entry.scene,
    })
  }
  projects.sort((left, right) => right.updatedAt - left.updatedAt)
  const activeId = projects.some((project) => project.id === source.activeId) ? source.activeId : null
  return { activeId, projects }
}

// ---------- Paketi (probna naplata, ali stanje živi na serveru) ----------

export function readBilling(userId) {
  const row = database.prepare('SELECT state_json FROM user_billing WHERE user_id = ?').get(userId)
  const raw = row ? parseJson(row.state_json) : null
  if (!raw || typeof raw !== 'object') return structuredClone(EMPTY_BILLING)
  return {
    purchases: Array.isArray(raw.purchases) ? raw.purchases : [],
    subscription: raw.subscription && typeof raw.subscription === 'object' ? raw.subscription : null,
    unlocks: Array.isArray(raw.unlocks) ? raw.unlocks : [],
    company: { ...EMPTY_BILLING.company, ...(raw.company && typeof raw.company === 'object' ? raw.company : {}) },
    clockOffsetDays: Number.isFinite(raw.clockOffsetDays) ? raw.clockOffsetDays : 0,
  }
}

function writeBilling(userId, state) {
  database.prepare(`
    INSERT INTO user_billing (user_id, state_json) VALUES (?, ?)
    ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json
  `).run(userId, JSON.stringify(state))
  return state
}

function billingNow(state) {
  return Date.now() + (state.clockOffsetDays || 0) * DAY
}

// Cenu i mere računa server iz sačuvanog projekta, ne iz onoga što pošalje pregledač.
export function payOrder(userId, order, method) {
  if (!PAYMENT_METHODS.some((entry) => entry.id === method)) return { error: 'Način plaćanja nije poznat.' }
  const state = readBilling(userId)
  const now = billingNow(state)
  const receipt = { id: `demo-${now.toString(36)}${randomBytes(2).toString('hex')}`, paidAt: now, method }
  if (order?.kind === 'diy') {
    const scene = projectScene(userId, order.projectId)
    const dimensions = scene?.dimensions
    if (!dimensions || !Number.isFinite(dimensions.width) || !Number.isFinite(dimensions.length)) return { error: 'Projekat nije sačuvan na nalogu.' }
    const units = Math.max(1, Math.round(Number(scene.units) || 1))
    const area = footprintArea(dimensions, units)
    state.purchases.push({
      ...receipt,
      price: diyPrice(area),
      projectId: order.projectId,
      expiresAt: now + DIY.days * DAY,
      width: dimensions.width,
      length: dimensions.length,
      units,
      area,
    })
  } else if (order?.kind === 'subscription') {
    const plan = subscriptionPlan(order.plan)
    const period = order.period === 'year' ? 'year' : 'month'
    if (!plan) return { error: 'Paket nije poznat.' }
    state.subscription = { ...receipt, price: subscriptionPrice(plan.id, period), plan: plan.id, period, paidUntil: now + (period === 'year' ? 365 : 30) * DAY }
  } else {
    return { error: 'Porudžbina nije ispravna.' }
  }
  return { state: writeBilling(userId, state), receipt }
}

export function unlockProject(userId, projectId) {
  if (!ownsProject(userId, projectId)) return { error: 'Projekat nije sačuvan na nalogu.' }
  const state = readBilling(userId)
  const now = billingNow(state)
  const subscription = state.subscription && state.subscription.paidUntil > now ? state.subscription : null
  const plan = subscription && subscriptionPlan(subscription.plan)
  if (!plan) return { error: 'Nema aktivne pretplate.' }
  if (state.unlocks.some((entry) => entry.projectId === projectId && entry.subscriptionId === subscription.id)) return { state }
  const used = state.unlocks.filter((entry) => entry.subscriptionId === subscription.id && now - entry.at < MONTH).length
  if (used >= plan.projects) return { error: `Paket ${plan.name} je ovog meseca otvorio svih ${plan.projects} projekata.` }
  state.unlocks.push({ projectId, at: now, subscriptionId: subscription.id })
  return { state: writeBilling(userId, state) }
}

export function saveCompany(userId, company) {
  const state = readBilling(userId)
  const logo = typeof company?.logo === 'string' && company.logo.length < 600_000 && company.logo.startsWith('data:image/') ? company.logo : company?.logo === '' ? '' : state.company.logo
  state.company = { name: clean(company?.name ?? state.company.name, 120), details: clean(company?.details ?? state.company.details, 400), logo }
  return { state: writeBilling(userId, state) }
}

// Alat za probu iz /admin: briše kupovine ili pomera sat naloga.
export function testBilling(userId, action, days) {
  if (action === 'reset') return { state: writeBilling(userId, structuredClone(EMPTY_BILLING)) }
  const state = readBilling(userId)
  const step = Math.round(Number(days) || 0)
  state.clockOffsetDays = step === 0 ? 0 : (state.clockOffsetDays || 0) + step
  return { state: writeBilling(userId, state) }
}

// ---------- Pomoćno ----------

function digest(value) {
  return createHash('sha256').update(String(value)).digest('hex')
}

function parseJson(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function clean(value, max) {
  return String(value ?? '').trim().slice(0, max)
}
