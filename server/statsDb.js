import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

// Broj otvaranja gotovih modela. Jedan pregledač se broji najviše jednom dnevno
// po modelu, da osvežavanje strane ne naduvava brojke.
const MODEL_ID = /^[a-z0-9-]{3,60}$/
const VISITOR = /^[A-Za-z0-9-]{8,64}$/
const MAX_MODELS = 500

let database

function open(root) {
  if (database) return database
  const directory = path.resolve(root, 'data')
  fs.mkdirSync(directory, { recursive: true })
  database = new DatabaseSync(path.join(directory, 'stats.sqlite'))
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS model_views (
      model_id TEXT NOT NULL,
      visitor TEXT NOT NULL,
      day TEXT NOT NULL,
      PRIMARY KEY (model_id, visitor, day)
    );
  `)
  return database
}

export function modelViews(root) {
  const rows = open(root).prepare('SELECT model_id, COUNT(*) AS views FROM model_views GROUP BY model_id').all()
  return Object.fromEntries(rows.map((row) => [row.model_id, Number(row.views)]))
}

export function recordModelView(root, modelId, visitor) {
  if (!MODEL_ID.test(String(modelId)) || !VISITOR.test(String(visitor))) return { error: 'Neispravan zahtev.' }
  const db = open(root)
  const known = db.prepare('SELECT 1 FROM model_views WHERE model_id = ? LIMIT 1').get(modelId)
  if (!known && db.prepare('SELECT COUNT(DISTINCT model_id) AS count FROM model_views').get().count >= MAX_MODELS) return { error: 'Previše modela.' }
  const day = new Date().toISOString().slice(0, 10)
  db.prepare('INSERT OR IGNORE INTO model_views (model_id, visitor, day) VALUES (?, ?, ?)').run(modelId, visitor, day)
  return { ok: true }
}
