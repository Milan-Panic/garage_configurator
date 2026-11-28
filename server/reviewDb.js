import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

// Ocene samo od stvarnih kupaca: jedna ocena po potvrđenom poslu, sa gradom i fotografijom objekta.
// Prosek se prikazuje tek od MIN_AVERAGE ocena, da jedna ocena ne odlučuje.

export const MIN_AVERAGE = 5
const MAX_PHOTO = 2_500_000
const PHOTO_NAME = /^ocena-[a-z0-9]+\.jpg$/

let database
let photoDir

export function openReviews(db, root) {
  database = db
  photoDir = path.resolve(root, 'data/reviews')
  fs.mkdirSync(photoDir, { recursive: true })
  database.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      kind TEXT NOT NULL,
      target_id TEXT NOT NULL,
      job_id TEXT NOT NULL UNIQUE,
      customer_key TEXT NOT NULL,
      first_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT NOT NULL,
      city TEXT NOT NULL,
      photo TEXT,
      hidden_at TEXT
    );
    CREATE INDEX IF NOT EXISTS reviews_target ON reviews (kind, target_id);
  `)
}

function clean(value, max) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
}

export function reviewedJob(jobId) {
  return Boolean(database.prepare('SELECT 1 AS ok FROM reviews WHERE job_id = ?').get(jobId))
}

// Fotografija stiže kao data URL; prihvata se samo pravi JPEG, jer ga pregledač smanjuje pre slanja.
function savePhoto(dataUrl) {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''))
  if (!match) return { error: 'Fotografija mora biti JPEG.' }
  const buffer = Buffer.from(match[1], 'base64')
  if (buffer.length > MAX_PHOTO) return { error: 'Fotografija je prevelika.' }
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return { error: 'Fotografija mora biti JPEG.' }
  const name = `ocena-${Date.now().toString(36)}${randomBytes(3).toString('hex')}.jpg`
  fs.writeFileSync(path.join(photoDir, name), buffer)
  return { name }
}

// job: { id, kind, targetId, customerKey, firstName, completedAt } iz upita koji je server već našao.
export function createReview(job, input) {
  if (!job || !job.completedAt) return { error: 'Oceniti možeš tek kad potvrdiš da je posao završen.' }
  if (reviewedJob(job.id)) return { error: 'Ovaj posao je već ocenjen.' }
  const rating = Math.round(Number(input.rating))
  if (!(rating >= 1 && rating <= 5)) return { error: 'Ocena je od 1 do 5.' }
  const comment = clean(input.comment, 600)
  const city = clean(input.city, 60)
  if (!city) return { error: 'Upiši grad ili mesto gde je objekat.' }
  let photo = null
  if (input.photo) {
    const saved = savePhoto(input.photo)
    if (saved.error) return saved
    photo = saved.name
  }
  const id = `ocena-${Date.now().toString(36)}${randomBytes(2).toString('hex')}`
  database.prepare(`
    INSERT INTO reviews (id, created_at, kind, target_id, job_id, customer_key, first_name, rating, comment, city, photo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, new Date().toISOString(), job.kind, job.targetId, job.id, job.customerKey, clean(job.firstName, 40) || 'Kupac', rating, comment, city, photo)
  return { review: presentReview(database.prepare('SELECT * FROM reviews WHERE id = ?').get(id)) }
}

function presentReview(row, admin = false) {
  const view = {
    id: row.id,
    createdAt: row.created_at,
    kind: row.kind,
    targetId: row.target_id,
    name: row.first_name,
    rating: row.rating,
    comment: row.comment,
    city: row.city,
    photo: row.photo ? `/api/review-photos/${row.photo}` : null,
  }
  if (admin) {
    view.hidden = Boolean(row.hidden_at)
    view.jobId = row.job_id
  }
  return view
}

// Javne ocene firme ili majstora; prosek tek od MIN_AVERAGE ocena.
export function reviewsFor(kind, targetId) {
  const rows = database.prepare('SELECT * FROM reviews WHERE kind = ? AND target_id = ? AND hidden_at IS NULL ORDER BY created_at DESC').all(kind, targetId)
  const average = rows.length >= MIN_AVERAGE ? Math.round((rows.reduce((sum, row) => sum + row.rating, 0) / rows.length) * 10) / 10 : null
  return { count: rows.length, average, items: rows.slice(0, 30).map((row) => presentReview(row)) }
}

export function reviewSummary(kind, targetId) {
  const row = database.prepare('SELECT COUNT(*) AS count, AVG(rating) AS average FROM reviews WHERE kind = ? AND target_id = ? AND hidden_at IS NULL').get(kind, targetId)
  return { count: row.count, average: row.count >= MIN_AVERAGE ? Math.round(row.average * 10) / 10 : null }
}

// Galerija: samo ocene sa fotografijom, najnovije prve.
export function galleryItems(limit = 48) {
  return database.prepare('SELECT * FROM reviews WHERE photo IS NOT NULL AND hidden_at IS NULL ORDER BY created_at DESC LIMIT ?').all(limit).map((row) => presentReview(row))
}

export function adminReviews() {
  return database.prepare('SELECT * FROM reviews ORDER BY created_at DESC LIMIT 200').all().map((row) => presentReview(row, true))
}

export function setReviewHidden(id, hidden) {
  const row = database.prepare('SELECT id FROM reviews WHERE id = ?').get(clean(id, 60))
  if (!row) return { error: 'Ocena nije pronađena.' }
  database.prepare('UPDATE reviews SET hidden_at = ? WHERE id = ?').run(hidden ? new Date().toISOString() : null, row.id)
  return { reviews: adminReviews() }
}

export function reviewPhotoPath(name) {
  const file = path.basename(String(name || ''))
  return PHOTO_NAME.test(file) ? path.join(photoDir, file) : null
}

// Medijana sati od trenutka kad je upit stigao do odgovora; prikazuje se tek od 3 odgovora.
export function typicalHours(pairs) {
  const hours = pairs
    .map(([from, to]) => (new Date(to).getTime() - new Date(from).getTime()) / 3_600_000)
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b)
  if (hours.length < 3) return null
  const middle = Math.floor(hours.length / 2)
  const median = hours.length % 2 ? hours[middle] : (hours[middle - 1] + hours[middle]) / 2
  return Math.max(1, Math.round(median))
}
