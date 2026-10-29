import fs from 'node:fs/promises'
import path from 'node:path'
import nodemailer from 'nodemailer'

let rootDir = ''

export function configureMail(root) {
  rootDir = root
}

export function mailReady() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

export async function sendMail({ to, subject, text }) {
  const entry = { to, subject, text, sent: false, error: '' }
  if (!mailReady()) {
    entry.error = 'SMTP nije podešen. Poruka je sačuvana u sandučetu.'
  } else {
    try {
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === '1',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
      })
      await transport.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to,
        subject,
        text,
      })
      entry.sent = true
    } catch (error) {
      entry.error = error instanceof Error ? error.message : 'Slanje nije uspelo.'
    }
  }
  if (rootDir) {
    const directory = path.resolve(rootDir, 'data/outbox')
    await fs.mkdir(directory, { recursive: true })
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}.json`
    await fs.writeFile(path.join(directory, name), `${JSON.stringify({ ...entry, at: new Date().toISOString() }, null, 2)}\n`)
  }
  return entry
}
