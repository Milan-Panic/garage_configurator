import { useEffect, useState } from 'react'

// Brojač otvaranja gotovih modela. Brojke su stvarne: server broji jedno
// otvaranje po pregledaču dnevno. Ispod praga model nosi oznaku „Novo“.
export const VIEWS_SHOWN_FROM = 10

const VISITOR_KEY = 'mera-visitor-key'

function visitorKey() {
  try {
    let key = localStorage.getItem(VISITOR_KEY)
    if (!key || !/^[A-Za-z0-9-]{8,64}$/.test(key)) {
      key = crypto.randomUUID()
      localStorage.setItem(VISITOR_KEY, key)
    }
    return key
  } catch {
    return null
  }
}

let cached = null
const listeners = new Set()

function load() {
  return fetch('/api/models/views')
    .then((response) => (response.ok ? response.json() : { views: {} }))
    .then((payload) => {
      cached = payload.views || {}
      listeners.forEach((listener) => listener(cached))
    })
    .catch(() => {})
}

export function useModelViews() {
  const [views, setViews] = useState(cached || {})
  useEffect(() => {
    listeners.add(setViews)
    if (!cached) load()
    return () => listeners.delete(setViews)
  }, [])
  return views
}

export function recordModelView(id) {
  const visitor = visitorKey()
  if (!visitor) return
  fetch('/api/models/views', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, visitor }),
  })
    .then(() => load())
    .catch(() => {})
}

export function viewsLabel(count) {
  if (!count || count < VIEWS_SHOWN_FROM) return null
  const word = count % 10 === 1 && count % 100 !== 11 ? 'put' : 'puta'
  return `otvoren ${count.toLocaleString('sr-RS')} ${word}`
}
