import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { openAccounts } from './accountDb.js'
import { openPartners } from './partnerDb.js'

const DEMO_PASSWORD = 'radionica'
const REMINDER_MS = 3 * 24 * 60 * 60 * 1000
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const SKILLS = ['konstrukcija', 'krov', 'oluk', 'temelj', 'rolo', 'stolarija', 'struja', 'oprema']

const SKILL_LABEL = {
  konstrukcija: 'Metalna konstrukcija',
  krov: 'Krovni pokrivač',
  oluk: 'Oluk',
  temelj: 'Betonska ploča',
  rolo: 'Rolo i sekcijska vrata',
  stolarija: 'Prozori, krilna i kipna vrata',
  struja: 'Struja, punjač i solar',
  oprema: 'Ventilacija',
}

const SEED = [
  ['bravar-ns', 'Bravar čelične konstrukcije', 'Radionica okvira', 'Novi Sad', '061111101', 'bravar@okvir.mera', 'Stubovi, venci, rogovi i zidni pojasevi po crtežu.', ['konstrukcija']],
  ['limar-krov', 'Limar pokrivača', 'Krov i opšivka', 'Beograd', '061111102', 'krov@lim.mera', 'Trapez, limeni crep i slemenska opšivka.', ['krov']],
  ['limar-oluk', 'Limar oluka', 'Oluci na strehi', 'Beograd', '061111103', 'oluk@lim.mera', 'Polukružni oluk, čela i olučne cevi.', ['oluk']],
  ['limar-oba', 'Limar', 'Lim i oluk', 'Zemun', '061111104', 'limar@zemun.mera', 'Krov i oluk. Svaki posao stiže kao poseban upit.', ['krov', 'oluk']],
  ['rolo-pancevo', 'Monter rolo vrata', 'Rolo servis', 'Pančevo', '061111105', 'rolo@pancevo.mera', 'Rolo vrata po površini otvora.', ['rolo']],
  ['stolarija-pancevo', 'Bravar krila i prozora', 'Krilo i prozor', 'Pančevo', '061111106', 'stolarija@pancevo.mera', 'Krilna vrata, bočna vrata i prozori.', ['stolarija']],
  ['zidar-su', 'Zidar', 'Temelj i ploča', 'Subotica', '061111107', 'zidar@subotica.mera', 'Betonska ploča: cement, pesak, šljunak i armatura.', ['temelj']],
  ['elektro-ns', 'Električar', 'Elektro instalacije', 'Novi Sad', '061111108', 'struja@elektro.mera', 'Tabla, kablovi, rasveta, punjači za auto i solarni paneli.', ['struja']],
]

let database

export function openPlatform(root) {
  if (database) return database
  const directory = path.resolve(root, 'data')
  fs.mkdirSync(directory, { recursive: true })
  database = new DatabaseSync(path.join(directory, 'mera.sqlite'))
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS craftsmen (
      id TEXT PRIMARY KEY,
      profession TEXT NOT NULL,
      shop TEXT NOT NULL,
      city TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      bio TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS craftsman_skills (
      craftsman_id TEXT NOT NULL,
      skill TEXT NOT NULL,
      PRIMARY KEY (craftsman_id, skill)
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      craftsman_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS inquiries (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      customer_key TEXT NOT NULL,
      project_name TEXT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      note TEXT,
      skill TEXT NOT NULL,
      craftsman_id TEXT NOT NULL,
      orientation_total INTEGER NOT NULL,
      status TEXT NOT NULL,
      craftsman_price INTEGER,
      fee_amount INTEGER,
      accepted_at TEXT,
      paid_at TEXT,
      estimate_json TEXT,
      views_json TEXT
    );
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mail_log (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      sent INTEGER NOT NULL,
      error TEXT
    );
    CREATE INDEX IF NOT EXISTS inquiries_customer ON inquiries (customer_key);
  `)
  ensureColumn('inquiries', 'first_name', 'TEXT')
  ensureColumn('inquiries', 'last_name', 'TEXT')
  ensureColumn('inquiries', 'sent_at', 'TEXT')
  ensureColumn('inquiries', 'reminded_at', 'TEXT')
  ensureColumn('inquiries', 'approved_at', 'TEXT')
  ensureColumn('inquiries', 'rejected_at', 'TEXT')
  // Provizija je dogovor sa svakim majstorom posebno. Kupac je ne vidi i ne plaća.
  ensureColumn('craftsmen', 'commission_pct', 'REAL NOT NULL DEFAULT 0')
  seedCraftsmen()
  seedAdmin()
  openPartners(database, { hashPassword, checkPassword })
  openAccounts(database, { hashPassword, checkPassword })
  return database
}

function ensureColumn(table, name, type) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all()
  if (columns.some((column) => column.name === name)) return
  database.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`)
}

function seedCraftsmen() {
  const insert = database.prepare(`
    INSERT INTO craftsmen (id, profession, shop, city, phone, email, password_hash, bio)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const skill = database.prepare('INSERT INTO craftsman_skills (craftsman_id, skill) VALUES (?, ?)')
  const existing = database.prepare('SELECT id FROM craftsmen WHERE id = ? OR email = ?')
  for (const entry of SEED) {
    if (existing.get(entry[0], entry[5])) continue
    insert.run(entry[0], entry[1], entry[2], entry[3], entry[4], entry[5], hashPassword(DEMO_PASSWORD), entry[6])
    entry[7].forEach((item) => skill.run(entry[0], item))
  }
}

function seedAdmin() {
  const email = adminEmail()
  const existing = database.prepare('SELECT id FROM admins WHERE email = ?').get(email)
  if (existing) return
  database.prepare('INSERT INTO admins (id, email, name, password_hash) VALUES (?, ?, ?, ?)').run(
    'admin',
    email,
    'Milan',
    hashPassword(process.env.MERA_ADMIN_PASSWORD || 'mera-admin'),
  )
}

export function adminEmail() {
  return (process.env.ADMIN_EMAIL || 'milan.88.panic@gmail.com').toLowerCase()
}

export function publicUrl() {
  return (process.env.PUBLIC_URL || 'http://127.0.0.1:5173').replace(/\/$/, '')
}

export function skillLabel(id) {
  return SKILL_LABEL[id] || id
}

export function listCraftsmen() {
  return database.prepare('SELECT id, profession, shop, city, bio FROM craftsmen ORDER BY city, shop').all().map((row) => ({
    ...row,
    does: row.bio,
    skills: skillsOf(row.id),
  }))
}

export function registerCraftsman(input) {
  const email = clean(input.email, 80).toLowerCase()
  const password = String(input.password ?? '')
  const skills = uniqueSkills(input.skills)
  if (!EMAIL.test(email)) return { error: 'Imejl mora biti pravi. Na njega stiže odobreni upit.' }
  if (password.length < 6 || skills.length === 0) {
    return { error: 'Lozinka od bar 6 znakova i bar jedan skil su obavezni.' }
  }
  if (!clean(input.profession, 80) || !clean(input.shop, 80) || !clean(input.city, 80) || !clean(input.phone, 40)) {
    return { error: 'Profesija, radionica, grad i telefon su obavezni.' }
  }
  const existing = database.prepare('SELECT id FROM craftsmen WHERE email = ?').get(email)
  if (existing) return { error: 'Nalog sa tim imejlom već postoji.' }
  const id = `majstor-${Date.now().toString(36)}`
  database.prepare(`
    INSERT INTO craftsmen (id, profession, shop, city, phone, email, password_hash, bio)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    clean(input.profession, 80),
    clean(input.shop, 80),
    clean(input.city, 80),
    clean(input.phone, 40),
    email,
    hashPassword(password),
    clean(input.bio, 400) || 'Radi poslove označene skilovima.',
  )
  const insertSkill = database.prepare('INSERT INTO craftsman_skills (craftsman_id, skill) VALUES (?, ?)')
  skills.forEach((item) => insertSkill.run(id, item))
  return { craftsman: publicCraftsman(id) }
}

export function loginCraftsman(email, password) {
  const row = database.prepare('SELECT * FROM craftsmen WHERE email = ?').get(clean(email, 80).toLowerCase())
  if (!row || !checkPassword(String(password ?? ''), row.password_hash)) return null
  const token = randomBytes(24).toString('hex')
  database.prepare('INSERT INTO sessions (token, craftsman_id, created_at) VALUES (?, ?, ?)').run(token, row.id, new Date().toISOString())
  return { token, craftsman: publicCraftsman(row.id) }
}

export function craftsmanFromToken(token) {
  if (!token) return null
  const session = database.prepare('SELECT craftsman_id FROM sessions WHERE token = ?').get(token)
  if (!session) return null
  return publicCraftsman(session.craftsman_id)
}

export function loginAdmin(email, password) {
  const row = database.prepare('SELECT * FROM admins WHERE email = ?').get(clean(email, 80).toLowerCase())
  if (!row || !checkPassword(String(password ?? ''), row.password_hash)) return null
  const token = randomBytes(24).toString('hex')
  database.prepare('INSERT INTO admin_sessions (token, admin_id, created_at) VALUES (?, ?, ?)').run(token, row.id, new Date().toISOString())
  return { token, admin: { email: row.email, name: row.name } }
}

export function adminFromToken(token) {
  if (!token) return null
  const session = database.prepare('SELECT admin_id FROM admin_sessions WHERE token = ?').get(token)
  if (!session) return null
  const row = database.prepare('SELECT email, name FROM admins WHERE id = ?').get(session.admin_id)
  return row ? { email: row.email, name: row.name } : null
}

export function createInquiry(input) {
  const craftsman = database.prepare('SELECT id FROM craftsmen WHERE id = ?').get(clean(input.craftsmanId, 80))
  const skill = clean(input.skill, 40)
  if (!craftsman || !SKILLS.includes(skill)) return { error: 'Majstor ili skil nisu poznati.' }
  const hasSkill = database.prepare('SELECT 1 AS ok FROM craftsman_skills WHERE craftsman_id = ? AND skill = ?').get(craftsman.id, skill)
  if (!hasSkill) return { error: 'Taj majstor nema skil za ovaj posao.' }
  const firstName = clean(input.firstName, 40)
  const lastName = clean(input.lastName, 40)
  const phone = clean(input.phone, 40)
  const email = clean(input.email, 80).toLowerCase()
  if (!firstName || !lastName || !phone || !EMAIL.test(email)) {
    return { error: 'Ime, prezime, imejl i telefon su obavezni.' }
  }
  // Ključ kupca je id naloga; postavlja ga server iz sesije, ne pregledač.
  const customerKey = clean(input.customerKey, 80)
  if (!customerKey) return { error: 'Za upit je potrebna prijava.' }
  const id = `upit-${Date.now().toString(36)}${randomBytes(2).toString('hex')}`
  const name = `${firstName} ${lastName}`
  database.prepare(`
    INSERT INTO inquiries (
      id, created_at, customer_key, project_id, project_name, customer_name, first_name, last_name,
      customer_phone, customer_email, note, skill, craftsman_id, orientation_total, status,
      estimate_json, views_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).run(
    id,
    new Date().toISOString(),
    customerKey,
    clean(input.projectId, 90) || null,
    clean(input.projectName, 80),
    name,
    firstName,
    lastName,
    phone,
    email,
    clean(input.note, 1000),
    skill,
    craftsman.id,
    Math.max(0, Math.round(Number(input.orientationTotal) || 0)),
    JSON.stringify(input.estimate ?? null),
    JSON.stringify(input.views ?? []),
  )
  return { id, customerKey }
}

export function customerInquiries(customerKey) {
  const key = clean(customerKey, 80)
  if (!key) return []
  return database.prepare('SELECT * FROM inquiries WHERE customer_key = ? ORDER BY created_at DESC').all(key).map((row) => presentInquiry(row, 'customer'))
}

export function withdrawInquiry(customerKey, id) {
  const row = database.prepare('SELECT * FROM inquiries WHERE id = ? AND customer_key = ?').get(id, clean(customerKey, 80))
  if (!row) return { error: 'Upit nije pronađen.' }
  if (row.status === 'pending') {
    database.prepare(`UPDATE inquiries SET status = 'withdrawn' WHERE id = ?`).run(id)
    return { inquiry: presentInquiry(database.prepare('SELECT * FROM inquiries WHERE id = ?').get(id), 'customer') }
  }
  const age = Date.now() - new Date(row.sent_at || row.created_at).getTime()
  if (row.status === 'sent' && age >= REMINDER_MS) {
    database.prepare(`UPDATE inquiries SET status = 'withdrawn' WHERE id = ?`).run(id)
    return { inquiry: presentInquiry(database.prepare('SELECT * FROM inquiries WHERE id = ?').get(id), 'customer') }
  }
  return { error: 'Ovaj upit više ne može da se povuče.' }
}

export function workshopInquiries(craftsmanId) {
  return database.prepare(`
    SELECT * FROM inquiries
    WHERE craftsman_id = ? AND status IN ('sent', 'accepted', 'declined', 'paid')
    ORDER BY created_at DESC
  `).all(craftsmanId).map((row) => presentInquiry(row, 'craftsman'))
}

export function respondInquiry(craftsmanId, id, decision, price) {
  const row = database.prepare('SELECT * FROM inquiries WHERE id = ? AND craftsman_id = ?').get(id, craftsmanId)
  if (!row) return { error: 'Upit nije pronađen.' }
  if (row.status !== 'sent') return { error: 'Na ovaj upit je već odgovoreno.' }
  if (decision === 'decline') {
    database.prepare(`UPDATE inquiries SET status = 'declined' WHERE id = ?`).run(id)
  } else {
    const amount = Math.round(Number(price))
    if (!Number.isFinite(amount) || amount < 1000) return { error: 'Cena je iznos u dinarima, bar 1.000.' }
    const terms = database.prepare('SELECT commission_pct FROM craftsmen WHERE id = ?').get(craftsmanId)
    const fee = Math.round((amount * (Number(terms?.commission_pct) || 0)) / 100)
    database.prepare(`
      UPDATE inquiries
      SET status = 'accepted', craftsman_price = ?, fee_amount = ?, accepted_at = ?
      WHERE id = ?
    `).run(amount, fee, new Date().toISOString(), id)
  }
  return { inquiry: presentInquiry(database.prepare('SELECT * FROM inquiries WHERE id = ?').get(id), 'craftsman') }
}

export function listAdminInquiries() {
  return database.prepare('SELECT * FROM inquiries ORDER BY created_at DESC').all().map((row) => presentInquiry(row, 'admin'))
}

// Majstori sa dogovorenom provizijom, za admina.
export function listCraftsmanTerms() {
  return database.prepare('SELECT id, profession, shop, city, email, commission_pct FROM craftsmen ORDER BY city, shop').all().map((row) => ({
    id: row.id,
    profession: row.profession,
    shop: row.shop,
    city: row.city,
    email: row.email,
    commissionPct: row.commission_pct,
  }))
}

export function setCraftsmanCommission(id, value) {
  const pct = Math.round(Number(value) * 10) / 10
  if (!Number.isFinite(pct) || pct < 0 || pct > 50) return { error: 'Provizija je procenat od 0 do 50.' }
  const done = database.prepare('UPDATE craftsmen SET commission_pct = ? WHERE id = ?').run(pct, clean(id, 80))
  if (!done.changes) return { error: 'Majstor nije pronađen.' }
  return { craftsmen: listCraftsmanTerms() }
}

// Naknade koje su kupci platili po starom modelu. Ostaju kao istorija.
export function paidFees() {
  return database.prepare(`SELECT * FROM inquiries WHERE status = 'paid' ORDER BY paid_at DESC`).all().map((row) => ({
    id: row.id,
    paidAt: row.paid_at,
    skill: row.skill,
    projectName: row.project_name,
    customerName: row.customer_name,
    craftsmanPrice: row.craftsman_price,
    feeAmount: row.fee_amount,
  }))
}

export function approveInquiry(id) {
  const row = database.prepare('SELECT * FROM inquiries WHERE id = ?').get(id)
  if (!row) return { error: 'Upit nije pronađen.' }
  if (row.status !== 'pending') return { error: 'Ovaj upit nije na čekanju.' }
  const now = new Date().toISOString()
  database.prepare(`UPDATE inquiries SET status = 'sent', sent_at = ?, approved_at = ? WHERE id = ?`).run(now, now, id)
  return { inquiry: getInquiry(id) }
}

export function rejectInquiry(id) {
  const row = database.prepare('SELECT * FROM inquiries WHERE id = ?').get(id)
  if (!row) return { error: 'Upit nije pronađen.' }
  if (row.status !== 'pending') return { error: 'Ovaj upit nije na čekanju.' }
  database.prepare(`UPDATE inquiries SET status = 'rejected', rejected_at = ? WHERE id = ?`).run(new Date().toISOString(), id)
  return { inquiry: getInquiry(id) }
}

export function getInquiry(id) {
  const row = database.prepare('SELECT * FROM inquiries WHERE id = ?').get(id)
  if (!row) return null
  const craftsman = database.prepare('SELECT id, profession, shop, city, phone, email FROM craftsmen WHERE id = ?').get(row.craftsman_id)
  return { ...row, craftsman }
}

export function dueReminders(now = Date.now()) {
  return database.prepare(`SELECT id, sent_at, created_at FROM inquiries WHERE status = 'sent' AND reminded_at IS NULL`).all()
    .filter((row) => now - new Date(row.sent_at || row.created_at).getTime() >= REMINDER_MS)
    .map((row) => getInquiry(row.id))
    .filter(Boolean)
}

export function markReminded(id) {
  database.prepare(`UPDATE inquiries SET reminded_at = ? WHERE id = ?`).run(new Date().toISOString(), id)
}

export function logMail(entry) {
  database.prepare(`
    INSERT INTO mail_log (id, created_at, recipient, subject, body, sent, error)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    `posta-${Date.now().toString(36)}${randomBytes(2).toString('hex')}`,
    new Date().toISOString(),
    clean(entry.to, 120),
    clean(entry.subject, 160),
    String(entry.text ?? '').slice(0, 4000),
    entry.sent ? 1 : 0,
    clean(entry.error, 300),
  )
}

export function recentMail() {
  return database.prepare('SELECT recipient, subject, body, sent, error, created_at FROM mail_log ORDER BY created_at DESC LIMIT 20').all().map((row) => ({
    to: row.recipient,
    subject: row.subject,
    body: row.body,
    sent: Boolean(row.sent),
    error: row.error || '',
    createdAt: row.created_at,
  }))
}

function presentInquiry(row, role) {
  // Kontakt se otvara čim majstor prihvati i kaže cenu. 'paid' je status iz starog modela.
  const open = row.status === 'accepted' || row.status === 'paid'
  const craftsman = database.prepare('SELECT id, profession, shop, city, phone, email FROM craftsmen WHERE id = ?').get(row.craftsman_id)
  const sentAt = new Date(row.sent_at || row.created_at).getTime()
  const view = {
    id: row.id,
    createdAt: row.created_at,
    skill: row.skill,
    status: row.status,
    projectId: row.project_id || null,
    projectName: row.project_name,
    orientationTotal: row.orientation_total,
    craftsmanPrice: row.craftsman_price,
    craftsman: {
      id: craftsman?.id,
      profession: craftsman?.profession,
      shop: craftsman?.shop,
      city: craftsman?.city,
      phone: role === 'admin' || (role === 'customer' && open) ? craftsman?.phone : undefined,
      email: role === 'admin' ? craftsman?.email : undefined,
    },
  }
  if (role === 'customer') {
    view.canWithdraw = row.status === 'pending'
    view.canSwitch = row.status === 'sent' && Date.now() - sentAt >= REMINDER_MS
  }
  if (role === 'craftsman' || role === 'admin') {
    // Provizija je između platforme i majstora, pa je kupac ne dobija ni u odgovoru servera.
    view.feeAmount = row.fee_amount || 0
    view.note = row.note
    view.estimate = parseJson(row.estimate_json)
    view.views = parseJson(row.views_json) ?? []
  }
  if (role === 'admin' || (role === 'craftsman' && open)) {
    view.customer = {
      name: row.customer_name,
      phone: row.customer_phone,
      email: row.customer_email,
    }
  }
  return view
}

function publicCraftsman(id) {
  const row = database.prepare('SELECT id, profession, shop, city, bio FROM craftsmen WHERE id = ?').get(id)
  if (!row) return null
  return { ...row, does: row.bio, skills: skillsOf(id) }
}

function skillsOf(id) {
  return database.prepare('SELECT skill FROM craftsman_skills WHERE craftsman_id = ? ORDER BY skill').all(id).map((row) => row.skill)
}

function uniqueSkills(value) {
  const list = Array.isArray(value) ? value : []
  return [...new Set(list.map((item) => clean(item, 40)).filter((item) => SKILLS.includes(item)))]
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 32).toString('hex')
  return `${salt}:${hash}`
}

function checkPassword(password, stored) {
  const [salt, hash] = String(stored ?? '').split(':')
  if (!salt || !hash) return false
  const next = scryptSync(password, salt, 32)
  const previous = Buffer.from(hash, 'hex')
  return next.length === previous.length && timingSafeEqual(next, previous)
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
