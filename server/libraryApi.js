import path from 'node:path'
import fs from 'node:fs/promises'
import { configureMail, mailReady, sendMail } from './mailer.js'
import {
  adminEmail,
  adminFromToken,
  approveInquiry,
  craftsmanFromToken,
  createInquiry,
  customerInquiries,
  dueReminders,
  getInquiry,
  listAdminInquiries,
  listCraftsmen,
  logMail,
  loginAdmin,
  loginCraftsman,
  markReminded,
  openPlatform,
  paidFees,
  payInquiry,
  publicUrl,
  readVisitorLibrary,
  recentMail,
  registerCraftsman,
  rejectInquiry,
  respondInquiry,
  resumeVisitor,
  skillLabel,
  withdrawInquiry,
  workshopInquiries,
  writeVisitorLibrary,
} from './platformDb.js'

const MAX_BODY = 12_000_000
let remindersStarted = false

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
  configureMail(root)
  openPlatform(root)
  startReminders()

  return (req, res, next) => {
    const url = req.url?.split('?')[0]
    if (url === '/api/prices') {
      handlePrices(root, req, res).catch((error) => {
        console.error(error)
        sendJson(res, 500, { error: 'Cene nisu sačuvane.' })
      })
      return
    }
    if (url === '/api/craftsmen' && req.method === 'GET') {
      sendJson(res, 200, { craftsmen: listCraftsmen() })
      return
    }
    if (url === '/api/workshop/register' && req.method === 'POST') {
      handleJson(req, res, (raw) => {
        const result = registerCraftsman(raw)
        if (result.error) return sendJson(res, 400, result)
        sendJson(res, 200, result)
      })
      return
    }
    if (url === '/api/workshop/login' && req.method === 'POST') {
      handleJson(req, res, (raw) => {
        const result = loginCraftsman(raw.email, raw.password)
        if (!result) return sendJson(res, 401, { error: 'Imejl ili lozinka nisu tačni.' })
        sendJson(res, 200, result)
      })
      return
    }
    if (url === '/api/workshop/inquiries' && req.method === 'GET') {
      const craftsman = craftsmanFromToken(bearer(req))
      if (!craftsman) return sendJson(res, 401, { error: 'Prijava je istekla.' })
      sendJson(res, 200, { craftsman, inquiries: workshopInquiries(craftsman.id) })
      return
    }
    if (url?.startsWith('/api/workshop/inquiries/') && req.method === 'POST') {
      const craftsman = craftsmanFromToken(bearer(req))
      if (!craftsman) return sendJson(res, 401, { error: 'Prijava je istekla.' })
      const id = decodeURIComponent(url.slice('/api/workshop/inquiries/'.length))
      handleJson(req, res, (raw) => {
        const result = respondInquiry(craftsman.id, id, raw.decision, raw.price)
        if (result.error) return sendJson(res, 400, result)
        sendJson(res, 200, result)
      })
      return
    }
    if (url === '/api/admin/login' && req.method === 'POST') {
      handleJson(req, res, (raw) => {
        const result = loginAdmin(raw.email, raw.password)
        if (!result) return sendJson(res, 401, { error: 'Imejl ili lozinka nisu tačni.' })
        sendJson(res, 200, result)
      })
      return
    }
    if (url === '/api/admin/inquiries' && req.method === 'GET') {
      const admin = adminFromToken(bearer(req))
      if (!admin) return sendJson(res, 401, { error: 'Prijava je istekla.' })
      runReminders()
        .then(() => {
          sendJson(res, 200, {
            admin,
            inquiries: listAdminInquiries(),
            fees: paidFees(),
            mail: recentMail(),
            mailReady: mailReady(),
          })
        })
        .catch((error) => {
          console.error(error)
          sendJson(res, 500, { error: 'Upiti nisu učitani.' })
        })
      return
    }
    if (url?.startsWith('/api/admin/inquiries/') && req.method === 'POST') {
      const admin = adminFromToken(bearer(req))
      if (!admin) return sendJson(res, 401, { error: 'Prijava je istekla.' })
      const id = decodeURIComponent(url.slice('/api/admin/inquiries/'.length))
      handleJson(req, res, async (raw) => {
        const result = raw.decision === 'reject' ? rejectInquiry(id) : approveInquiry(id)
        if (result.error) return sendJson(res, 400, result)
        if (raw.decision === 'reject') await notifyRejected(result.inquiry)
        else await notifyApproved(result.inquiry)
        sendJson(res, 200, { ok: true })
      })
      return
    }
    if (url === '/api/visitor/resume' && req.method === 'POST') {
      handleJson(req, res, (raw) => {
        const visitorKey = resumeVisitor(raw.token)
        if (!visitorKey) return sendJson(res, 404, { error: 'Link više ne važi.' })
        sendJson(res, 200, { visitorKey })
      })
      return
    }
    if (url === '/api/customer/inquiries' && req.method === 'GET') {
      sendJson(res, 200, { inquiries: customerInquiries(req.headers['x-customer-key']) })
      return
    }
    if (url?.startsWith('/api/customer/inquiries/') && url.endsWith('/pay') && req.method === 'POST') {
      const id = decodeURIComponent(url.slice('/api/customer/inquiries/'.length, -'/pay'.length))
      handleJson(req, res, (raw) => {
        const result = payInquiry(raw.key || req.headers['x-customer-key'], id)
        if (result.error) return sendJson(res, 400, result)
        sendJson(res, 200, result)
      })
      return
    }
    if (url?.startsWith('/api/customer/inquiries/') && url.endsWith('/withdraw') && req.method === 'POST') {
      const id = decodeURIComponent(url.slice('/api/customer/inquiries/'.length, -'/withdraw'.length))
      const result = withdrawInquiry(req.headers['x-customer-key'], id)
      if (result.error) return sendJson(res, 400, result)
      sendJson(res, 200, result)
      return
    }
    if (url?.startsWith('/api/inquiry-views/') && req.method === 'GET') {
      serveView(root, url, res)
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
    handleLibrary(req, res).catch((error) => {
      console.error(error)
      sendJson(res, 500, { error: 'Čuvanje garaže nije uspelo.' })
    })
  }
}

function startReminders() {
  if (remindersStarted) return
  remindersStarted = true
  const tick = () => {
    runReminders().catch((error) => console.error(error))
  }
  setInterval(tick, 60 * 60 * 1000)
  tick()
}

async function runReminders() {
  const due = dueReminders()
  for (const inquiry of due) {
    await deliver({
      to: adminEmail(),
      subject: `Majstor ćuti: ${skillLabel(inquiry.skill)}`,
      text: [
        'Majstor nije odgovorio tri dana.',
        '',
        `Posao: ${skillLabel(inquiry.skill)}`,
        `Garaža: ${inquiry.project_name || 'Garaža'}`,
        `Majstor: ${inquiry.craftsman?.shop || ''} (${inquiry.craftsman?.email || ''})`,
        `Kupac: ${inquiry.customer_name}, ${inquiry.customer_phone}, ${inquiry.customer_email}`,
        '',
        'Kupac sada može da povuče upit i izabere drugog majstora.',
        `${publicUrl()}/admin`,
      ].join('\n'),
    })
    markReminded(inquiry.id)
  }
}

async function handleLibrary(req, res) {
  const visitorKey = req.headers['x-visitor-key']
  if (req.method === 'GET') {
    const library = readVisitorLibrary(visitorKey)
    if (library.error) return sendJson(res, 400, library)
    sendJson(res, 200, { ...library, directory: 'Sačuvano samo za ovaj pregledač.' })
    return
  }
  if (req.method !== 'PUT') {
    sendJson(res, 405, { error: 'Metoda nije podržana.' })
    return
  }
  const raw = parseJson(await readBody(req))
  if (!raw) {
    sendJson(res, 400, { error: 'Telo zahteva nije ispravan JSON.' })
    return
  }
  const library = writeVisitorLibrary(visitorKey, raw)
  if (library.error) return sendJson(res, 400, library)
  sendJson(res, 200, { ...library, directory: 'Sačuvano samo za ovaj pregledač.' })
}

function serveView(root, url, res) {
  const name = path.basename(decodeURIComponent(url.slice('/api/inquiry-views/'.length)))
  if (!/^upit-[a-z0-9]+-\d+\.jpg$/.test(name)) {
    sendJson(res, 404, { error: 'Nema prikaza.' })
    return
  }
  fs.readFile(path.resolve(root, 'data/inquiries', name))
    .then((buffer) => {
      res.statusCode = 200
      res.setHeader('Content-Type', 'image/jpeg')
      res.end(buffer)
    })
    .catch(() => sendJson(res, 404, { error: 'Nema prikaza.' }))
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
  const raw = parseJson(await readBody(req))
  if (!raw) {
    sendJson(res, 400, { error: 'Telo zahteva nije ispravan JSON.' })
    return
  }
  const idPreview = `upit-${Date.now().toString(36)}`
  const directory = path.resolve(root, 'data/inquiries')
  await fs.mkdir(directory, { recursive: true })
  const views = []
  const incoming = Array.isArray(raw.views) ? raw.views.slice(0, 4) : []
  for (let index = 0; index < incoming.length; index += 1) {
    const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=\s]+)$/.exec(String(incoming[index] || ''))
    if (!match) continue
    const fileName = `${idPreview}-${index + 1}.jpg`
    await fs.writeFile(path.join(directory, fileName), Buffer.from(match[1], 'base64'))
    views.push(fileName)
  }
  const result = createInquiry({ ...raw, views })
  if (result.error) {
    sendJson(res, 400, result)
    return
  }
  const inquiry = getInquiry(result.id)
  await notifyNewInquiry(inquiry, result.resumeToken).catch((error) => console.error(error))
  sendJson(res, 200, { id: result.id, customerKey: result.customerKey, status: 'pending' })
}

async function notifyNewInquiry(inquiry, resumeToken) {
  if (!inquiry) return
  const money = formatMoney(inquiry.orientation_total)
  await deliver({
    to: adminEmail(),
    subject: `Novi upit: ${skillLabel(inquiry.skill)}`,
    text: [
      'Novi upit čeka odobrenje. Majstor ga još ne vidi.',
      '',
      `Kupac: ${inquiry.customer_name}`,
      `Telefon: ${inquiry.customer_phone}`,
      `Imejl: ${inquiry.customer_email}`,
      `Posao: ${skillLabel(inquiry.skill)}`,
      `Majstor: ${inquiry.craftsman?.shop || ''}, ${inquiry.craftsman?.city || ''} (${inquiry.craftsman?.email || ''})`,
      `Garaža: ${inquiry.project_name || 'Garaža'}`,
      `Orijentaciono: ${money}`,
      inquiry.note ? `Poruka: ${inquiry.note}` : '',
      '',
      `Odobri ili odbij: ${publicUrl()}/admin`,
    ].filter((line) => line !== '').join('\n'),
  })
  await deliver({
    to: inquiry.customer_email,
    subject: `Upit je primljen: ${skillLabel(inquiry.skill)}`,
    text: [
      `Zdravo ${inquiry.first_name || inquiry.customer_name},`,
      '',
      `Upit za posao „${skillLabel(inquiry.skill)}” je primljen i čeka odobrenje. Majstor ga još ne vidi.`,
      '',
      'Iste garaže možeš da nastaviš i na drugom uređaju:',
      `${publicUrl()}/nastavi/${resumeToken}`,
      '',
      'Mera',
    ].join('\n'),
  })
}

async function notifyApproved(inquiry) {
  if (!inquiry) return
  await deliver({
    to: inquiry.craftsman?.email,
    subject: `Odobren upit: ${skillLabel(inquiry.skill)}`,
    text: [
      'Stigao je odobren upit.',
      '',
      `Posao: ${skillLabel(inquiry.skill)}`,
      `Garaža: ${inquiry.project_name || 'Garaža'}`,
      `Orijentaciona cena sa sajta: ${formatMoney(inquiry.orientation_total)}`,
      inquiry.note ? `Poruka kupca: ${inquiry.note}` : '',
      '',
      'Otvori Radionicu, prihvati i unesi svoju cenu:',
      `${publicUrl()}/radionica`,
      '',
      'Kupčev telefon dobijaš tek kad plati naknadu platforme.',
    ].filter((line) => line !== '').join('\n'),
  })
  await deliver({
    to: inquiry.customer_email,
    subject: `Upit je poslat majstoru: ${skillLabel(inquiry.skill)}`,
    text: [
      `Zdravo ${inquiry.first_name || inquiry.customer_name},`,
      '',
      `Upit za „${skillLabel(inquiry.skill)}” je odobren i poslat majstoru ${inquiry.craftsman?.shop || ''}.`,
      'Kad prihvati, uneće svoju cenu. Telefon se otvara kad se plati naknada od 10%.',
      '',
      'Mera',
    ].join('\n'),
  })
}

async function notifyRejected(inquiry) {
  if (!inquiry?.customer_email) return
  await deliver({
    to: inquiry.customer_email,
    subject: `Upit nije odobren: ${skillLabel(inquiry.skill)}`,
    text: [
      `Zdravo ${inquiry.first_name || inquiry.customer_name},`,
      '',
      `Upit za „${skillLabel(inquiry.skill)}” nije prosleđen majstoru.`,
      '',
      'Mera',
    ].join('\n'),
  })
}

async function deliver(message) {
  if (!message.to) return null
  const entry = await sendMail(message)
  logMail(entry)
  return entry
}

function formatMoney(value) {
  return `${Math.round(Number(value) || 0).toLocaleString('sr-RS')} RSD`
}

function handleJson(req, res, done) {
  readBody(req)
    .then((text) => {
      const raw = parseJson(text || '{}')
      if (!raw) {
        sendJson(res, 400, { error: 'Telo zahteva nije ispravan JSON.' })
        return
      }
      Promise.resolve(done(raw)).catch((error) => {
        console.error(error)
        if (!res.writableEnded) sendJson(res, 500, { error: 'Zahtev nije sačuvan.' })
      })
    })
    .catch((error) => {
      console.error(error)
      sendJson(res, 500, { error: 'Zahtev nije sačuvan.' })
    })
}

function bearer(req) {
  const header = req.headers.authorization || ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  return match ? match[1] : ''
}

function parseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
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
  const raw = parseJson(await readBody(req))
  if (!raw) {
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
