import { randomBytes } from 'node:crypto'
import { DEFAULT_PRICES, PACKAGES } from '../src/prices.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const VISITOR_KEY = /^[a-f0-9]{24,80}$/
const PACKAGE_IDS = PACKAGES.map((entry) => entry.id)
const ARTICLES = new Map(DEFAULT_PRICES.map((item) => [item.id, item]))
const CONTACT_STATUSES = ['approved', 'sold']

let database
let hashPassword
let checkPassword

export function openPartners(db, passwords) {
  database = db
  hashPassword = passwords.hashPassword
  checkPassword = passwords.checkPassword
  database.exec(`
    CREATE TABLE IF NOT EXISTS partners (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      website TEXT NOT NULL DEFAULT '',
      delivery TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      status TEXT NOT NULL,
      sponsored INTEGER NOT NULL DEFAULT 0,
      free_until TEXT,
      lead_fee INTEGER NOT NULL DEFAULT 0,
      monthly_fee INTEGER NOT NULL DEFAULT 0,
      commission_pct REAL NOT NULL DEFAULT 0,
      prices_valid_until TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS partner_packages (
      partner_id TEXT NOT NULL,
      package TEXT NOT NULL,
      PRIMARY KEY (partner_id, package)
    );
    CREATE TABLE IF NOT EXISTS partner_prices (
      partner_id TEXT NOT NULL,
      price_id TEXT NOT NULL,
      price REAL NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (partner_id, price_id)
    );
    CREATE TABLE IF NOT EXISTS partner_sessions (
      token TEXT PRIMARY KEY,
      partner_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS partner_leads (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      partner_id TEXT NOT NULL,
      package TEXT NOT NULL,
      customer_key TEXT NOT NULL,
      project_name TEXT,
      customer_name TEXT NOT NULL,
      first_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      note TEXT,
      offer_total INTEGER NOT NULL,
      covered INTEGER NOT NULL,
      articles INTEGER NOT NULL,
      items_json TEXT NOT NULL,
      status TEXT NOT NULL,
      decided_at TEXT,
      sale_amount INTEGER,
      sold_at TEXT
    );
    CREATE TABLE IF NOT EXISTS partner_charges (
      id TEXT PRIMARY KEY,
      partner_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      period TEXT NOT NULL,
      lead_id TEXT,
      amount INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      paid_at TEXT
    );
    CREATE INDEX IF NOT EXISTS partner_leads_partner ON partner_leads (partner_id);
    CREATE INDEX IF NOT EXISTS partner_leads_customer ON partner_leads (customer_key);
    CREATE INDEX IF NOT EXISTS partner_charges_partner ON partner_charges (partner_id);
  `)
}

function clean(value, max) {
  return String(value ?? '').trim().slice(0, max)
}

function nonNegative(value, max) {
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) return 0
  return Math.min(max, number)
}

function validDate(value) {
  const text = clean(value, 10)
  return DATE.test(text) ? text : null
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function uniquePackages(value) {
  const list = Array.isArray(value) ? value : []
  return [...new Set(list.map((item) => clean(item, 40)).filter((item) => PACKAGE_IDS.includes(item)))]
}

function packagesOf(id) {
  return database.prepare('SELECT package FROM partner_packages WHERE partner_id = ? ORDER BY package').all(id).map((row) => row.package)
}

function setPackages(id, packages) {
  database.prepare('DELETE FROM partner_packages WHERE partner_id = ?').run(id)
  const insert = database.prepare('INSERT INTO partner_packages (partner_id, package) VALUES (?, ?)')
  packages.forEach((item) => insert.run(id, item))
}

function pricesOf(id) {
  const rows = database.prepare('SELECT price_id, price FROM partner_prices WHERE partner_id = ?').all(id)
  return Object.fromEntries(rows.map((row) => [row.price_id, row.price]))
}

function isFree(row) {
  return Boolean(row.free_until) && row.free_until >= today()
}

function present(row) {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    phone: row.phone,
    email: row.email,
    website: row.website,
    delivery: row.delivery,
    status: row.status,
    sponsored: Boolean(row.sponsored),
    freeUntil: row.free_until,
    leadFee: row.lead_fee,
    monthlyFee: row.monthly_fee,
    commissionPct: row.commission_pct,
    pricesValidUntil: row.prices_valid_until,
    packages: packagesOf(row.id),
    prices: pricesOf(row.id),
  }
}

function partnerRow(id) {
  return database.prepare('SELECT * FROM partners WHERE id = ?').get(id)
}

function readContact(input) {
  const contact = {
    name: clean(input.name, 80),
    city: clean(input.city, 80),
    phone: clean(input.phone, 40),
    email: clean(input.email, 80).toLowerCase(),
    website: clean(input.website, 160),
    delivery: clean(input.delivery, 200),
    packages: uniquePackages(input.packages),
  }
  if (!contact.name || !contact.city || !contact.phone) return { error: 'Naziv firme, grad i telefon su obavezni.' }
  if (!EMAIL.test(contact.email)) return { error: 'Imejl mora biti pravi.' }
  if (contact.packages.length === 0) return { error: 'Izaberi bar jedan paket.' }
  return contact
}

function insertPartner(contact, password, status, terms = {}) {
  if (database.prepare('SELECT id FROM partners WHERE email = ?').get(contact.email)) {
    return { error: 'Firma sa tim imejlom već postoji.' }
  }
  const id = `firma-${Date.now().toString(36)}${randomBytes(2).toString('hex')}`
  database.prepare(`
    INSERT INTO partners (
      id, name, city, phone, email, website, delivery, password_hash, status,
      sponsored, free_until, lead_fee, monthly_fee, commission_pct, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    contact.name,
    contact.city,
    contact.phone,
    contact.email,
    contact.website,
    contact.delivery,
    hashPassword(password),
    status,
    terms.sponsored ? 1 : 0,
    validDate(terms.freeUntil),
    Math.round(nonNegative(terms.leadFee, 10_000_000)),
    Math.round(nonNegative(terms.monthlyFee, 10_000_000)),
    nonNegative(terms.commissionPct, 100),
    new Date().toISOString(),
  )
  setPackages(id, contact.packages)
  return { partner: present(partnerRow(id)) }
}

export function registerPartner(input) {
  const contact = readContact(input)
  if (contact.error) return contact
  const password = String(input.password ?? '')
  if (password.length < 6) return { error: 'Lozinka mora da ima bar 6 znakova.' }
  return insertPartner(contact, password, 'pending')
}

export function adminCreatePartner(input) {
  const contact = readContact(input)
  if (contact.error) return contact
  const typed = String(input.password ?? '')
  if (typed && typed.length < 6) return { error: 'Lozinka mora da ima bar 6 znakova.' }
  const password = typed || randomBytes(6).toString('hex')
  const result = insertPartner(contact, password, 'active', input)
  return result.error ? result : { ...result, password }
}

export function adminUpdatePartner(id, input) {
  const row = partnerRow(id)
  if (!row) return { error: 'Firma nije pronađena.' }
  const contact = readContact(input)
  if (contact.error) return contact
  const taken = database.prepare('SELECT id FROM partners WHERE email = ? AND id != ?').get(contact.email, id)
  if (taken) return { error: 'Firma sa tim imejlom već postoji.' }
  const status = ['pending', 'active', 'paused'].includes(input.status) ? input.status : row.status
  database.prepare(`
    UPDATE partners SET
      name = ?, city = ?, phone = ?, email = ?, website = ?, delivery = ?, status = ?,
      sponsored = ?, free_until = ?, lead_fee = ?, monthly_fee = ?, commission_pct = ?
    WHERE id = ?
  `).run(
    contact.name,
    contact.city,
    contact.phone,
    contact.email,
    contact.website,
    contact.delivery,
    status,
    input.sponsored ? 1 : 0,
    validDate(input.freeUntil),
    Math.round(nonNegative(input.leadFee, 10_000_000)),
    Math.round(nonNegative(input.monthlyFee, 10_000_000)),
    nonNegative(input.commissionPct, 100),
    id,
  )
  setPackages(id, contact.packages)
  return { partner: present(partnerRow(id)) }
}

export function deletePartner(id) {
  if (!partnerRow(id)) return { error: 'Firma nije pronađena.' }
  const history = database.prepare(`
    SELECT (SELECT COUNT(*) FROM partner_leads WHERE partner_id = ?) + (SELECT COUNT(*) FROM partner_charges WHERE partner_id = ?) AS count
  `).get(id, id)
  if (history.count > 0) return { error: 'Firma ima upite ili zaduženja. Pauziraj je umesto brisanja.' }
  database.prepare('DELETE FROM partner_prices WHERE partner_id = ?').run(id)
  database.prepare('DELETE FROM partner_packages WHERE partner_id = ?').run(id)
  database.prepare('DELETE FROM partner_sessions WHERE partner_id = ?').run(id)
  database.prepare('DELETE FROM partners WHERE id = ?').run(id)
  return { ok: true }
}

// Upisuje cene iz paketa firme. Cena 0 briše stavku iz njene ponude.
export function savePartnerPrices(id, input) {
  const row = partnerRow(id)
  if (!row) return { error: 'Firma nije pronađena.' }
  if (!Array.isArray(input.prices)) return { error: 'Cene nisu poslate.' }
  const packages = packagesOf(id)
  const upsert = database.prepare(`
    INSERT INTO partner_prices (partner_id, price_id, price, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT (partner_id, price_id) DO UPDATE SET price = excluded.price, updated_at = excluded.updated_at
  `)
  const remove = database.prepare('DELETE FROM partner_prices WHERE partner_id = ? AND price_id = ?')
  const now = new Date().toISOString()
  let saved = 0
  let skipped = 0
  input.prices.forEach((item) => {
    const article = ARTICLES.get(item?.id)
    if (!article || !packages.includes(article.pack)) {
      skipped += 1
      return
    }
    const price = nonNegative(item.price, 1_000_000_000)
    if (price > 0) {
      upsert.run(id, item.id, price, now)
      saved += 1
    } else remove.run(id, item.id)
  })
  if (Object.hasOwn(input, 'validUntil')) {
    database.prepare('UPDATE partners SET prices_valid_until = ? WHERE id = ?').run(validDate(input.validUntil), id)
  }
  return { partner: present(partnerRow(id)), saved, skipped }
}

export function loginPartner(email, password) {
  const row = database.prepare('SELECT * FROM partners WHERE email = ?').get(clean(email, 80).toLowerCase())
  if (!row || !checkPassword(String(password ?? ''), row.password_hash)) return null
  const token = randomBytes(24).toString('hex')
  database.prepare('INSERT INTO partner_sessions (token, partner_id, created_at) VALUES (?, ?, ?)').run(token, row.id, new Date().toISOString())
  return { token, partner: present(row) }
}

export function partnerFromToken(token) {
  if (!token) return null
  const session = database.prepare('SELECT partner_id FROM partner_sessions WHERE token = ?').get(token)
  const row = session && partnerRow(session.partner_id)
  return row ? present(row) : null
}

// Javni spisak: bez telefona i imejla, jer kontakt ide preko upita.
export function publicOffers() {
  const rows = database.prepare(`SELECT * FROM partners WHERE status = 'active' ORDER BY name`).all()
  return rows
    .filter((row) => !row.prices_valid_until || row.prices_valid_until >= today())
    .map((row) => ({
      id: row.id,
      name: row.name,
      city: row.city,
      website: row.website,
      delivery: row.delivery,
      sponsored: Boolean(row.sponsored),
      pricesValidUntil: row.prices_valid_until,
      packages: packagesOf(row.id),
      prices: pricesOf(row.id),
    }))
    .filter((partner) => Object.keys(partner.prices).length > 0)
}

export function createLead(input) {
  const partner = partnerRow(clean(input.partnerId, 80))
  const pack = clean(input.package, 40)
  if (!partner || partner.status !== 'active' || !packagesOf(partner.id).includes(pack)) {
    return { error: 'Ta firma više nema ovu ponudu.' }
  }
  const firstName = clean(input.firstName, 40)
  const lastName = clean(input.lastName, 40)
  const phone = clean(input.phone, 40)
  const email = clean(input.email, 80).toLowerCase()
  if (!firstName || !lastName || !phone || !EMAIL.test(email)) {
    return { error: 'Ime, prezime, imejl i telefon su obavezni.' }
  }
  // Iznos računa server iz cena firme, a od kupca uzima samo količine.
  const prices = pricesOf(partner.id)
  const items = []
  const seen = new Set()
  let total = 0
  let covered = 0
  const incoming = Array.isArray(input.items) ? input.items.slice(0, 200) : []
  incoming.forEach((item) => {
    const article = ARTICLES.get(item?.priceId)
    const quantity = nonNegative(item?.quantity, 1_000_000)
    if (!article || article.pack !== pack || quantity <= 0) return
    const unitPrice = prices[item.priceId] ?? null
    const lineTotal = unitPrice ? Math.round(quantity * unitPrice) : null
    if (lineTotal) total += lineTotal
    if (!seen.has(item.priceId)) {
      seen.add(item.priceId)
      if (unitPrice) covered += 1
    }
    items.push({ name: clean(item.name, 120) || article.name, quantity: Math.round(quantity * 100) / 100, unit: article.unit, unitPrice, total: lineTotal })
  })
  if (items.length === 0 || covered === 0) return { error: 'Ova firma nema cene za stavke iz objekta.' }
  let customerKey = clean(input.customerKey, 80)
  if (!VISITOR_KEY.test(customerKey)) customerKey = randomBytes(18).toString('hex')
  const id = `ponuda-${Date.now().toString(36)}${randomBytes(2).toString('hex')}`
  const code = `MERA-${randomBytes(3).toString('hex').toUpperCase()}`
  database.prepare(`
    INSERT INTO partner_leads (
      id, code, created_at, partner_id, package, customer_key, project_name, customer_name, first_name,
      customer_phone, customer_email, note, offer_total, covered, articles, items_json, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(
    id,
    code,
    new Date().toISOString(),
    partner.id,
    pack,
    customerKey,
    clean(input.projectName, 80),
    `${firstName} ${lastName}`,
    firstName,
    phone,
    email,
    clean(input.note, 1000),
    total,
    covered,
    seen.size,
    JSON.stringify(items),
  )
  return { id, code, customerKey, lead: getLead(id) }
}

function leadRow(id) {
  return database.prepare('SELECT * FROM partner_leads WHERE id = ?').get(id)
}

export function getLead(id) {
  const row = leadRow(id)
  return row ? { ...row, partner: partnerRow(row.partner_id) } : null
}

function presentLead(row, role) {
  const partner = partnerRow(row.partner_id)
  const view = {
    id: row.id,
    code: row.code,
    createdAt: row.created_at,
    package: row.package,
    status: row.status,
    projectName: row.project_name,
    offerTotal: row.offer_total,
    covered: row.covered,
    articles: row.articles,
    saleAmount: row.sale_amount,
    partner: { id: partner?.id, name: partner?.name, city: partner?.city },
  }
  if (role === 'customer') {
    // Kupac vidi kontakt firme tek kad je upit odobren.
    if (CONTACT_STATUSES.includes(row.status)) view.partner.phone = partner?.phone
    return view
  }
  view.note = row.note
  view.items = JSON.parse(row.items_json)
  if (role === 'admin' || CONTACT_STATUSES.includes(row.status)) {
    view.customer = { name: row.customer_name, phone: row.customer_phone, email: row.customer_email }
  }
  return view
}

export function customerLeads(customerKey) {
  const key = clean(customerKey, 80)
  if (!key) return []
  return database.prepare('SELECT * FROM partner_leads WHERE customer_key = ? ORDER BY created_at DESC').all(key).map((row) => presentLead(row, 'customer'))
}

function addCharge(partnerId, kind, period, amount, leadId = null) {
  database.prepare(`
    INSERT INTO partner_charges (id, partner_id, kind, period, lead_id, amount, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(`zaduzenje-${Date.now().toString(36)}${randomBytes(3).toString('hex')}`, partnerId, kind, period, leadId, amount, new Date().toISOString())
}

export function decideLead(id, decision) {
  const row = leadRow(id)
  if (!row) return { error: 'Upit nije pronađen.' }
  if (row.status !== 'pending') return { error: 'O ovom upitu je već odlučeno.' }
  const approved = decision !== 'reject'
  database.prepare('UPDATE partner_leads SET status = ?, decided_at = ? WHERE id = ?').run(approved ? 'approved' : 'rejected', new Date().toISOString(), id)
  const partner = partnerRow(row.partner_id)
  if (approved && partner.lead_fee > 0 && !isFree(partner)) {
    addCharge(partner.id, 'lead', today().slice(0, 7), partner.lead_fee, id)
  }
  return { lead: getLead(id) }
}

// Firma prijavljuje prodaju po kodu ponude. Provizija se računa na prijavljen iznos.
export function reportSale(partnerId, id, amount) {
  const row = database.prepare('SELECT * FROM partner_leads WHERE id = ? AND partner_id = ?').get(id, partnerId)
  if (!row) return { error: 'Upit nije pronađen.' }
  if (row.status !== 'approved') return { error: 'Prodaja se prijavljuje samo za odobren upit, i to jednom.' }
  const sale = Math.round(Number(amount))
  if (!Number.isFinite(sale) || sale < 1) return { error: 'Iznos prodaje je broj u dinarima.' }
  database.prepare(`UPDATE partner_leads SET status = 'sold', sale_amount = ?, sold_at = ? WHERE id = ?`).run(sale, new Date().toISOString(), id)
  const partner = partnerRow(partnerId)
  const commission = Math.round((sale * partner.commission_pct) / 100)
  if (commission > 0 && !isFree(partner)) addCharge(partnerId, 'commission', today().slice(0, 7), commission, id)
  return { lead: presentLead(leadRow(id), 'partner') }
}

function chargesOf(where, ...args) {
  return database.prepare(`
    SELECT partner_charges.*, partners.name AS partner_name, partner_leads.code AS lead_code
    FROM partner_charges
    JOIN partners ON partners.id = partner_charges.partner_id
    LEFT JOIN partner_leads ON partner_leads.id = partner_charges.lead_id
    ${where}
    ORDER BY partner_charges.created_at DESC
  `).all(...args).map((row) => ({
    id: row.id,
    partnerId: row.partner_id,
    partnerName: row.partner_name,
    kind: row.kind,
    period: row.period,
    amount: row.amount,
    leadCode: row.lead_code,
    createdAt: row.created_at,
    paidAt: row.paid_at,
  }))
}

export function partnerDashboard(id) {
  const leads = database.prepare(`
    SELECT * FROM partner_leads WHERE partner_id = ? AND status IN ('approved', 'sold') ORDER BY created_at DESC
  `).all(id)
  return {
    leads: leads.map((row) => presentLead(row, 'partner')),
    charges: chargesOf('WHERE partner_charges.partner_id = ?', id),
  }
}

export function adminPartnerData() {
  const partners = database.prepare('SELECT * FROM partners ORDER BY created_at DESC').all().map(present)
  const leads = database.prepare('SELECT * FROM partner_leads ORDER BY created_at DESC LIMIT 200').all().map((row) => presentLead(row, 'admin'))
  return { partners, leads, charges: chargesOf('') }
}

// Mesečna članarina za tekući mesec. Ponovljeno pokretanje ne pravi drugo zaduženje.
export function billMonth() {
  const period = today().slice(0, 7)
  const rows = database.prepare(`SELECT * FROM partners WHERE status = 'active' AND monthly_fee > 0`).all()
  const existing = database.prepare(`SELECT 1 AS found FROM partner_charges WHERE partner_id = ? AND kind = 'subscription' AND period = ?`)
  let created = 0
  rows.forEach((row) => {
    if (isFree(row) || existing.get(row.id, period)) return
    addCharge(row.id, 'subscription', period, row.monthly_fee)
    created += 1
  })
  return { created, period }
}

export function markChargePaid(id) {
  const row = database.prepare('SELECT * FROM partner_charges WHERE id = ?').get(id)
  if (!row) return { error: 'Zaduženje nije pronađeno.' }
  database.prepare('UPDATE partner_charges SET paid_at = ? WHERE id = ?').run(row.paid_at ? null : new Date().toISOString(), id)
  return { ok: true }
}
