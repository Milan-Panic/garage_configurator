import path from 'node:path'
import { createLibraryStore } from './libraryStore.js'

const MAX_BODY = 2_000_000

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
