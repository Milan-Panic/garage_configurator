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
  listCraftsmanTerms,
  paidFees,
  publicUrl,
  recentMail,
  registerCraftsman,
  rejectInquiry,
  respondInquiry,
  setCraftsmanCommission,
  skillLabel,
  withdrawInquiry,
  workshopInquiries,
} from './platformDb.js'
import {
  adminCreatePartner,
  adminPartnerData,
  adminUpdatePartner,
  billMonth,
  createLead,
  customerLeads,
  decideLead,
  deletePartner,
  loginPartner,
  markChargePaid,
  partnerDashboard,
  partnerFromToken,
  publicOffers,
  registerPartner,
  reportSale,
  savePartnerPrices,
} from './partnerDb.js'
import { PACKAGES } from '../src/prices.js'
import {
  changePassword,
  createReset,
  deleteUser,
  endOtherSessions,
  endSession,
  googleUser,
  loginUser,
  ownsProject,
  payOrder,
  readBilling,
  readLibrary,
  registerUser,
  resetPassword,
  saveCompany,
  testBilling,
  unlockProject,
  updateProfile,
  userFromToken,
  writeLibrary,
} from './accountDb.js'

const MAX_BODY = 12_000_000
const SESSION_COOKIE = 'mera_session'
const SESSION_DAYS = 60
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
    if (url?.startsWith('/api/admin/partners') || url?.startsWith('/api/admin/leads/') || url?.startsWith('/api/admin/charges/') || url === '/api/admin/me') {
      const admin = adminFromToken(bearer(req))
      if (!admin) return sendJson(res, 401, { error: 'Prijava je istekla.' })
      handleAdminPartners(url, req, res, admin)
      return
    }
    if (url === '/api/offers' && req.method === 'GET') {
      sendJson(res, 200, { partners: publicOffers() })
      return
    }
    if (url === '/api/partner-leads' && req.method === 'POST') {
      const user = currentUser(req)
      if (!user) return sendJson(res, 401, { error: 'Za upit firmi prijavi se na nalog.' })
      handleJson(req, res, async (raw) => {
        const projectId = ownsProject(user.id, raw.projectId) ? raw.projectId : null
        const result = createLead({ ...raw, customerKey: user.id, projectId })
        if (result.error) return sendJson(res, 400, result)
        await notifyNewLead(result.lead).catch((error) => console.error(error))
        sendJson(res, 200, { id: result.id, code: result.code })
      })
      return
    }
    if (url === '/api/customer/leads' && req.method === 'GET') {
      const user = currentUser(req)
      sendJson(res, 200, { leads: user ? customerLeads(user.id) : [] })
      return
    }
    if (url === '/api/partner/register' && req.method === 'POST') {
      handleJson(req, res, async (raw) => {
        const result = registerPartner(raw)
        if (result.error) return sendJson(res, 400, result)
        await deliver({
          to: adminEmail(),
          subject: `Nova firma čeka odobrenje: ${result.partner.name}`,
          text: [`${result.partner.name}, ${result.partner.city}`, `${result.partner.phone} · ${result.partner.email}`, '', `Odobri: ${publicUrl()}/admin`].join('\n'),
        }).catch((error) => console.error(error))
        sendJson(res, 200, { ok: true })
      })
      return
    }
    if (url === '/api/partner/login' && req.method === 'POST') {
      handleJson(req, res, (raw) => {
        const result = loginPartner(raw.email, raw.password)
        if (!result) return sendJson(res, 401, { error: 'Imejl ili lozinka nisu tačni.' })
        sendJson(res, 200, result)
      })
      return
    }
    if (url?.startsWith('/api/partner/')) {
      const partner = partnerFromToken(bearer(req))
      if (!partner) return sendJson(res, 401, { error: 'Prijava je istekla.' })
      if (url === '/api/partner/me' && req.method === 'GET') {
        sendJson(res, 200, { partner, ...partnerDashboard(partner.id) })
        return
      }
      if (url === '/api/partner/prices' && req.method === 'PUT') {
        handleJson(req, res, (raw) => {
          const result = savePartnerPrices(partner.id, raw)
          if (result.error) return sendJson(res, 400, result)
          sendJson(res, 200, result)
        })
        return
      }
      const sale = /^\/api\/partner\/leads\/([^/]+)\/sale$/.exec(url)
      if (sale && req.method === 'POST') {
        handleJson(req, res, (raw) => {
          const result = reportSale(partner.id, decodeURIComponent(sale[1]), raw.amount)
          if (result.error) return sendJson(res, 400, result)
          sendJson(res, 200, result)
        })
        return
      }
      sendJson(res, 404, { error: 'Nepoznat zahtev.' })
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
            craftsmen: listCraftsmanTerms(),
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
    if (url?.startsWith('/api/admin/craftsmen/') && req.method === 'PUT') {
      const admin = adminFromToken(bearer(req))
      if (!admin) return sendJson(res, 401, { error: 'Prijava je istekla.' })
      const id = decodeURIComponent(url.slice('/api/admin/craftsmen/'.length))
      handleJson(req, res, (raw) => {
        const result = setCraftsmanCommission(id, raw.commissionPct)
        sendJson(res, result.error ? 400 : 200, result)
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
    if (url?.startsWith('/api/account/') || url?.startsWith('/api/billing/')) {
      handleAccount(url, req, res)
      return
    }
    if (url === '/api/customer/inquiries' && req.method === 'GET') {
      const user = currentUser(req)
      sendJson(res, 200, { inquiries: user ? customerInquiries(user.id) : [] })
      return
    }
    if (url?.startsWith('/api/customer/inquiries/') && url.endsWith('/withdraw') && req.method === 'POST') {
      const user = currentUser(req)
      if (!user) return sendJson(res, 401, { error: 'Prijava je istekla.' })
      const id = decodeURIComponent(url.slice('/api/customer/inquiries/'.length, -'/withdraw'.length))
      const result = withdrawInquiry(user.id, id)
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
      sendJson(res, 500, { error: 'Čuvanje projekta nije uspelo.' })
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
        `Objekat: ${inquiry.project_name || 'Objekat'}`,
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
  const user = currentUser(req)
  if (!user) return sendJson(res, 401, { error: 'Za čuvanje projekata prijavi se na nalog.' })
  if (req.method === 'GET') {
    sendJson(res, 200, readLibrary(user.id))
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
  sendJson(res, 200, writeLibrary(user.id, raw))
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
  const user = currentUser(req)
  if (!user) {
    sendJson(res, 401, { error: 'Za upit majstoru prijavi se na nalog.' })
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
  const projectId = ownsProject(user.id, raw.projectId) ? raw.projectId : null
  const result = createInquiry({ ...raw, views, customerKey: user.id, projectId })
  if (result.error) {
    sendJson(res, 400, result)
    return
  }
  const inquiry = getInquiry(result.id)
  await notifyNewInquiry(inquiry).catch((error) => console.error(error))
  sendJson(res, 200, { id: result.id, status: 'pending' })
}

async function notifyNewInquiry(inquiry) {
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
      `Objekat: ${inquiry.project_name || 'Objekat'}`,
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
      'Status upita i sve svoje projekte vidiš na profilu:',
      `${publicUrl()}/nalog`,
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
      `Objekat: ${inquiry.project_name || 'Objekat'}`,
      `Orijentaciona cena sa sajta: ${formatMoney(inquiry.orientation_total)}`,
      inquiry.note ? `Poruka kupca: ${inquiry.note}` : '',
      '',
      'Otvori Radionicu, prihvati i unesi svoju cenu:',
      `${publicUrl()}/radionica`,
      '',
      'Kupčev telefon vidiš čim prihvatiš upit i uneseš cenu.',
    ].filter((line) => line !== '').join('\n'),
  })
  await deliver({
    to: inquiry.customer_email,
    subject: `Upit je poslat majstoru: ${skillLabel(inquiry.skill)}`,
    text: [
      `Zdravo ${inquiry.first_name || inquiry.customer_name},`,
      '',
      `Upit za „${skillLabel(inquiry.skill)}” je odobren i poslat majstoru ${inquiry.craftsman?.shop || ''}.`,
      'Kad prihvati, uneće svoju cenu i videćeš njegov telefon. Za upit i kontakt ne plaćaš ništa.',
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

function handleAdminPartners(url, req, res, admin) {
  if (url === '/api/admin/me') return sendJson(res, 200, { admin })
  if (url === '/api/admin/partners' && req.method === 'GET') return sendJson(res, 200, adminPartnerData())
  const reply = (result) => sendJson(res, result.error ? 400 : 200, result)
  if (url === '/api/admin/partners' && req.method === 'POST') {
    handleJson(req, res, (raw) => reply(adminCreatePartner(raw)))
    return
  }
  if (url === '/api/admin/partners/billing' && req.method === 'POST') return reply(billMonth())
  const prices = /^\/api\/admin\/partners\/([^/]+)\/prices$/.exec(url)
  if (prices && req.method === 'PUT') {
    handleJson(req, res, (raw) => reply(savePartnerPrices(decodeURIComponent(prices[1]), raw)))
    return
  }
  const partner = /^\/api\/admin\/partners\/([^/]+)$/.exec(url)
  if (partner && req.method === 'PUT') {
    handleJson(req, res, (raw) => reply(adminUpdatePartner(decodeURIComponent(partner[1]), raw)))
    return
  }
  if (partner && req.method === 'DELETE') return reply(deletePartner(decodeURIComponent(partner[1])))
  const lead = /^\/api\/admin\/leads\/([^/]+)$/.exec(url)
  if (lead && req.method === 'POST') {
    handleJson(req, res, async (raw) => {
      const result = decideLead(decodeURIComponent(lead[1]), raw.decision)
      if (result.error) return sendJson(res, 400, result)
      await notifyLeadDecision(result.lead).catch((error) => console.error(error))
      sendJson(res, 200, { ok: true })
    })
    return
  }
  const charge = /^\/api\/admin\/charges\/([^/]+)\/paid$/.exec(url)
  if (charge && req.method === 'POST') return reply(markChargePaid(decodeURIComponent(charge[1])))
  sendJson(res, 404, { error: 'Nepoznat zahtev.' })
}

function packageLabel(id) {
  return PACKAGES.find((entry) => entry.id === id)?.name ?? id
}

async function notifyNewLead(lead) {
  if (!lead) return
  const label = packageLabel(lead.package)
  await deliver({
    to: adminEmail(),
    subject: `Novi upit za firmu: ${lead.partner?.name} · ${label}`,
    text: [
      'Upit za ponudu materijala čeka odobrenje. Firma ga još ne vidi.',
      '',
      `Firma: ${lead.partner?.name}`,
      `Paket: ${label}`,
      `Kupac: ${lead.customer_name}, ${lead.customer_phone}, ${lead.customer_email}`,
      `Ponuda po cenovniku: ${formatMoney(lead.offer_total)} (${lead.covered} od ${lead.articles} artikala)`,
      '',
      `Odobri ili odbij: ${publicUrl()}/admin`,
    ].join('\n'),
  })
  await deliver({
    to: lead.customer_email,
    subject: `Upit je primljen: ${label}`,
    text: [
      `Zdravo ${lead.first_name},`,
      '',
      `Upit firmi ${lead.partner?.name} za paket „${label}” je primljen i čeka odobrenje.`,
      `Kod ponude: ${lead.code}`,
      '',
      'Mera',
    ].join('\n'),
  })
}

async function notifyLeadDecision(lead) {
  if (!lead) return
  const label = packageLabel(lead.package)
  if (lead.status === 'rejected') {
    await deliver({
      to: lead.customer_email,
      subject: `Upit nije odobren: ${label}`,
      text: [`Zdravo ${lead.first_name},`, '', `Upit firmi ${lead.partner?.name} za paket „${label}” nije prosleđen.`, '', 'Mera'].join('\n'),
    })
    return
  }
  await deliver({
    to: lead.partner?.email,
    subject: `Novi kupac: ${label} · ${lead.code}`,
    text: [
      'Stigao je odobren upit za ponudu materijala.',
      '',
      `Kod ponude: ${lead.code}`,
      `Paket: ${label}`,
      `Kupac: ${lead.customer_name}, ${lead.customer_phone}, ${lead.customer_email}`,
      `Po vašem cenovniku: ${formatMoney(lead.offer_total)}`,
      lead.note ? `Poruka kupca: ${lead.note}` : '',
      '',
      `Stavke su na ${publicUrl()}/partner`,
    ].filter((line) => line !== '').join('\n'),
  })
  await deliver({
    to: lead.customer_email,
    subject: `Upit je poslat firmi: ${label}`,
    text: [
      `Zdravo ${lead.first_name},`,
      '',
      `Firma ${lead.partner?.name} je dobila tvoj upit za paket „${label}” i javiće ti se sa konačnom ponudom.`,
      `Telefon firme: ${lead.partner?.phone}`,
      `Kod ponude, koji pomeni firmi: ${lead.code}`,
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

// ---------- Nalog kupca ----------

function handleAccount(url, req, res) {
  const reply = (result, status = 200) => sendJson(res, result?.error ? 400 : status, result)
  const signIn = (result) => {
    if (!result || result.error) return reply(result || { error: 'Prijava nije uspela.' })
    setSessionCookie(res, result.token)
    sendJson(res, 200, { user: result.user })
  }

  if (url === '/api/account/config' && req.method === 'GET') {
    return sendJson(res, 200, { googleClientId: process.env.GOOGLE_CLIENT_ID || '', mailReady: mailReady() })
  }
  if (url === '/api/account/me' && req.method === 'GET') {
    return sendJson(res, 200, { user: currentUser(req) })
  }
  if (url === '/api/account/register' && req.method === 'POST') {
    return handleJson(req, res, (raw) => signIn(registerUser(raw)))
  }
  if (url === '/api/account/login' && req.method === 'POST') {
    return handleJson(req, res, (raw) => {
      const result = loginUser(raw.email, raw.password)
      if (!result) return sendJson(res, 401, { error: 'Imejl ili lozinka nisu tačni.' })
      signIn(result)
    })
  }
  if (url === '/api/account/google' && req.method === 'POST') {
    return handleJson(req, res, async (raw) => {
      const clientId = process.env.GOOGLE_CLIENT_ID
      if (!clientId) return sendJson(res, 503, { error: 'Prijava preko Google-a još nije podešena. Prijavi se imejlom i lozinkom.' })
      const profile = await verifyGoogle(raw.credential, clientId)
      if (!profile) return sendJson(res, 401, { error: 'Google prijava nije potvrđena. Pokušaj ponovo.' })
      signIn(googleUser(profile))
    })
  }
  if (url === '/api/account/logout' && req.method === 'POST') {
    endSession(sessionToken(req))
    clearSessionCookie(res)
    return sendJson(res, 200, { ok: true })
  }
  if (url === '/api/account/forgot' && req.method === 'POST') {
    return handleJson(req, res, async (raw) => {
      const reset = createReset(raw.email)
      if (reset) {
        await deliver({
          to: reset.email,
          subject: 'Nova lozinka za Mera nalog',
          text: [
            `Zdravo ${reset.name},`,
            '',
            'Neko je zatražio novu lozinku za ovaj nalog. Ako si to ti, otvori link u narednih sat vremena:',
            `${publicUrl()}/nalog/nova-lozinka/${reset.token}`,
            '',
            'Ako nisi ti, samo zanemari ovu poruku. Stara lozinka i dalje važi.',
            '',
            'Mera',
          ].join('\n'),
        }).catch((error) => console.error(error))
      }
      // Isti odgovor i kad nalog ne postoji, da se imejlovi ne mogu proveravati.
      sendJson(res, 200, { ok: true })
    })
  }
  if (url === '/api/account/reset' && req.method === 'POST') {
    return handleJson(req, res, (raw) => signIn(resetPassword(raw.token, raw.password)))
  }

  const user = currentUser(req)
  if (!user) return sendJson(res, 401, { error: 'Prijava je istekla. Prijavi se ponovo.' })
  const token = sessionToken(req)

  if (url === '/api/account/profile' && req.method === 'PUT') {
    return handleJson(req, res, (raw) => reply(updateProfile(user.id, raw)))
  }
  if (url === '/api/account/password' && req.method === 'POST') {
    return handleJson(req, res, (raw) => reply(changePassword(user.id, token, raw.current, raw.next)))
  }
  if (url === '/api/account/logout-others' && req.method === 'POST') {
    endOtherSessions(user.id, token)
    return sendJson(res, 200, { ok: true })
  }
  if (url === '/api/account/delete' && req.method === 'POST') {
    return handleJson(req, res, (raw) => {
      if (String(raw.confirm || '').trim().toLowerCase() !== user.email) return sendJson(res, 400, { error: 'Za brisanje upiši imejl naloga.' })
      deleteUser(user.id)
      clearSessionCookie(res)
      sendJson(res, 200, { ok: true })
    })
  }
  if (url === '/api/billing/state' && req.method === 'GET') {
    return sendJson(res, 200, { state: readBilling(user.id) })
  }
  if (url === '/api/billing/pay' && req.method === 'POST') {
    return handleJson(req, res, (raw) => reply(payOrder(user.id, raw.order, raw.method)))
  }
  if (url === '/api/billing/unlock' && req.method === 'POST') {
    return handleJson(req, res, (raw) => reply(unlockProject(user.id, raw.projectId)))
  }
  if (url === '/api/billing/company' && req.method === 'PUT') {
    return handleJson(req, res, (raw) => reply(saveCompany(user.id, raw)))
  }
  if (url === '/api/billing/test' && req.method === 'POST') {
    return handleJson(req, res, (raw) => reply(testBilling(user.id, raw.action, raw.days)))
  }
  sendJson(res, 404, { error: 'Nepoznat zahtev.' })
}

// Google šalje potpisan ID token; tokeninfo proverava potpis i rok.
async function verifyGoogle(credential, clientId) {
  if (typeof credential !== 'string' || credential.length > 4096) return null
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`)
    if (!response.ok) return null
    const info = await response.json()
    if (info.aud !== clientId || String(info.email_verified) !== 'true' || !info.sub) return null
    return { sub: String(info.sub), email: String(info.email || ''), name: String(info.name || '') }
  } catch (error) {
    console.error(error)
    return null
  }
}

function currentUser(req) {
  return userFromToken(sessionToken(req))
}

function sessionToken(req) {
  const header = req.headers.cookie || ''
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === SESSION_COOKIE) return /^[a-f0-9]{64}$/.test(rest.join('=')) ? rest.join('=') : ''
  }
  return ''
}

function setSessionCookie(res, token) {
  const secure = publicUrl().startsWith('https://') ? '; Secure' : ''
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 60 * 60}${secure}`)
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
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
  if (!adminFromToken(bearer(req))) {
    sendJson(res, 401, { error: 'Cene menja samo administrator.' })
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
        .map((item) => ({ id: item.id, price: Math.max(0, Number(item.price) || 0) }))
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
