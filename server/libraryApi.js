import path from 'node:path'
import fs from 'node:fs/promises'
import { createLibraryStore } from './libraryStore.js'

const MAX_BODY = 12_000_000

export function libraryApi() {
  return {
    name: 'garage-library-files',
    configureServer(server) {
      server.middlewares.use(createMiddleware(server.config.root))
    },
    configurePreviewServer(server) {
      server.middlewares.use(createMiddleware(server.config.root))
    },
  }
}

function createMiddleware(root) {
  const projectsDir = path.resolve(root, 'data/projects')
  const store = createLibraryStore(projectsDir)

  return (req, res, next) => {
    const url = req.url?.split('?')[0]
    if (url === '/api/prices') {
      handlePrices(root, req, res).catch((error) => {
        console.error(error)
        sendJson(res, 500, { error: 'Cene nisu sačuvane.' })
      })
      return
    }
    if (url === '/api/inquiries') {
      handleInquiry(root, req, res).catch((error) => {
        console.error(error)
        sendJson(res, 500, { error: 'Upit nije sačuvan.' })
      })
      return
    }
    if (url !== '/api/library') return next()
    handle(store, req, res).catch((error) => {
      console.error(error)
      sendJson(res, 500, { error: 'Čuvanje na disk nije uspelo.' })
    })
  }
}

async function handle(store, req, res) {
  if (req.method === 'GET') {
    const library = await store.readLibrary()
    sendJson(res, 200, { ...library, directory: store.projectsDir })
    return
  }
  if (req.method !== 'PUT') {
    sendJson(res, 405, { error: 'Metoda nije podržana.' })
    return
  }
  const text = await readBody(req)
  let raw
  try {
    raw = JSON.parse(text)
  } catch {
    sendJson(res, 400, { error: 'Telo zahteva nije ispravan JSON.' })
    return
  }
  const library = await store.writeLibrary(raw)
  sendJson(res, 200, { ...library, directory: store.projectsDir })
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY) {
        reject(new Error('Telo zahteva je preveliko.'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

async function handleInquiry(root, req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Metoda nije podržana.' })
    return
  }
  const text = await readBody(req)
  let raw
  try {
    raw = JSON.parse(text)
  } catch {
    sendJson(res, 400, { error: 'Telo zahteva nije ispravan JSON.' })
    return
  }
  const name = clean(raw.name, 80)
  const phone = clean(raw.phone, 40)
  const craftsmanId = clean(raw.craftsmanId, 80)
  if (!name || !phone || !craftsmanId) {
    sendJson(res, 400, { error: 'Ime, telefon i majstor su obavezni.' })
    return
  }
  const id = `upit-${Date.now().toString(36)}`
  const directory = path.resolve(root, 'data/inquiries')
  await fs.mkdir(directory, { recursive: true })
  const views = []
  const incoming = Array.isArray(raw.views) ? raw.views.slice(0, 4) : []
  for (let index = 0; index < incoming.length; index += 1) {
    const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=\s]+)$/.exec(String(incoming[index] || ''))
    if (!match) continue
    const fileName = `${id}-${index + 1}.jpg`
    await fs.writeFile(path.join(directory, fileName), Buffer.from(match[1], 'base64'))
    views.push(fileName)
  }
  const record = {
    id,
    createdAt: new Date().toISOString(),
    craftsmanId,
    skill: clean(raw.skill, 40),
    name,
    phone,
    email: clean(raw.email, 80),
    note: clean(raw.note, 1000),
    projectName: clean(raw.projectName, 80),
    estimate: raw.estimate ?? null,
    scene: raw.scene ?? null,
    views,
  }
  await fs.writeFile(path.join(directory, `${id}.json`), `${JSON.stringify(record, null, 2)}\n`)
  sendJson(res, 200, { id })
}

function clean(value, max) {
  return String(value ?? '').trim().slice(0, max)
}

async function handlePrices(root, req, res) {
  const file = path.resolve(root, 'data/prices.json')
  if (req.method === 'GET') {
    const prices = await readPrices(file)
    sendJson(res, 200, { prices })
    return
  }
  if (req.method !== 'PUT') {
    sendJson(res, 405, { error: 'Metoda nije podržana.' })
    return
  }
  const text = await readBody(req)
  let raw
  try {
    raw = JSON.parse(text)
  } catch {
    sendJson(res, 400, { error: 'Telo zahteva nije ispravan JSON.' })
    return
  }
  const prices = Array.isArray(raw.prices)
    ? raw.prices
        .filter((item) => item && typeof item.id === 'string')
        .map((item) => ({ id: item.id, price: Number(item.price) || 0 }))
    : []
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, `${JSON.stringify(prices, null, 2)}\n`)
  sendJson(res, 200, { prices })
}

async function readPrices(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {
    return []
  }
}
