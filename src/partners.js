import { useEffect, useState } from 'react'
import { DEFAULT_PRICES, PACKAGES } from './prices'

const PACK_OF = new Map(DEFAULT_PRICES.map((item) => [item.id, item.pack]))

export function useOfferPartners() {
  const [partners, setPartners] = useState([])
  useEffect(() => {
    let stop = false
    fetch('/api/offers')
      .then((response) => response.json())
      .then((payload) => {
        if (!stop) setPartners(payload.partners || [])
      })
      .catch(() => {})
    return () => {
      stop = true
    }
  }, [])
  return partners
}

// Ponuda jedne firme za jedan paket, na količine iz konkretnog objekta.
function buildOffer(partner, items) {
  let total = 0
  const missing = []
  const seen = new Set()
  items.forEach((item) => {
    const price = Number(partner.prices?.[item.priceId])
    if (price > 0) total += Math.round(item.quantity * price)
    else if (!seen.has(item.priceId)) {
      seen.add(item.priceId)
      missing.push(item.name)
    }
  })
  const articles = new Set(items.map((item) => item.priceId)).size
  return { partner, total, articles, covered: articles - missing.length, missing, complete: missing.length === 0 }
}

// Potpune ponude idu prve. Nepotpuna je jeftinija samo zato što nema sve stavke.
function compareOffers(left, right) {
  if (left.complete !== right.complete) return left.complete ? -1 : 1
  if (!left.complete) return right.covered - left.covered || left.total - right.total
  if (Boolean(left.partner.sponsored) !== Boolean(right.partner.sponsored)) return left.partner.sponsored ? -1 : 1
  return left.total - right.total
}

export function packageOffers(partners, items) {
  return PACKAGES.map((pack) => {
    const own = items.filter((item) => PACK_OF.get(item.priceId) === pack.id)
    const offers = partners
      .filter((partner) => partner.packages.includes(pack.id))
      .map((partner) => buildOffer(partner, own))
      .filter((offer) => offer.covered > 0)
      .sort(compareOffers)
    return { pack, items: own, offers }
  }).filter((entry) => entry.items.length > 0)
}

// Izabrana firma menja cene svog paketa. Stavke koje nema ostaju po orijentacionoj ceni.
export function applyOffers(catalog, partners, selected) {
  const chosen = Object.entries(selected || {})
    .map(([pack, id]) => [pack, partners.find((partner) => partner.id === id && partner.packages.includes(pack))])
    .filter(([, partner]) => partner)
  if (chosen.length === 0) return catalog
  return catalog.map((item) => {
    const partner = chosen.find(([pack]) => pack === item.pack)?.[1]
    const price = Number(partner?.prices?.[item.id])
    return price > 0 ? { ...item, price } : item
  })
}

export const CHARGE_KIND = { lead: 'Upit', subscription: 'Članarina', commission: 'Provizija' }

const HEADER = /^(šifra|sifra|id|code)$/i

function parseAmount(value) {
  const raw = String(value ?? '').replace(/\s|rsd|din\.?/gi, '')
  if (!raw) return NaN
  const comma = raw.lastIndexOf(',')
  const dot = raw.lastIndexOf('.')
  let text = raw
  if (comma > dot) text = raw.replace(/\./g, '').replace(',', '.')
  else if (dot > comma && comma >= 0) text = raw.replace(/,/g, '')
  else if (dot >= 0 && /^\d{1,3}(\.\d{3})+$/.test(raw)) text = raw.replace(/\./g, '')
  return Number(text)
}

function splitRow(row, delimiter) {
  const cells = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < row.length; index += 1) {
    const char = row[index]
    if (char === '"') {
      if (quoted && row[index + 1] === '"') {
        cell += '"'
        index += 1
      } else quoted = !quoted
    } else if (char === delimiter && !quoted) {
      cells.push(cell)
      cell = ''
    } else cell += char
  }
  cells.push(cell)
  return cells.map((entry) => entry.trim())
}

// Prima tekst nalepljen iz Excela (tabovi) ili CSV fajl. Artikal bez cene firma ne prodaje, pa se preskače.
export function parsePriceList(text) {
  const rows = String(text ?? '').replace(/^﻿/, '').split(/\r?\n/).filter((row) => row.trim())
  const first = rows[0] ?? ''
  const delimiter = first.includes('\t') ? '\t' : first.includes(';') ? ';' : ','
  const known = new Set(DEFAULT_PRICES.map((item) => item.id))
  const prices = new Map()
  const problems = []
  rows.forEach((row, index) => {
    const cells = splitRow(row, delimiter)
    if (HEADER.test(cells[0])) return
    if (!known.has(cells[0])) {
      problems.push(`Red ${index + 1}: nepoznata šifra „${cells[0]}”.`)
      return
    }
    // Obrazac ima cenu u četvrtoj koloni. Kraći spisak je šifra i cena.
    const amount = cells.length >= 4 ? cells[3] : cells[cells.length - 1]
    if (cells.length < 2 || !amount) return
    const price = parseAmount(amount)
    if (!Number.isFinite(price) || price <= 0) {
      problems.push(`Red ${index + 1}: cena nije broj.`)
      return
    }
    prices.set(cells[0], price)
  })
  return { prices: [...prices].map(([id, price]) => ({ id, price })), problems }
}

// Obrazac za firmu: šifra, naziv, jedinica i prazna kolona za cenu.
export function priceListTemplate(packages) {
  const rows = DEFAULT_PRICES.filter((item) => packages.includes(item.pack)).map((item) =>
    [item.id, `"${item.name}"`, item.unit, ''].join(';'),
  )
  return `﻿šifra;naziv;jedinica;cena RSD\n${rows.join('\n')}\n`
}

export function downloadTemplate(packages) {
  const url = URL.createObjectURL(new Blob([priceListTemplate(packages)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'mera-cenovnik.csv'
  link.click()
  URL.revokeObjectURL(url)
}
