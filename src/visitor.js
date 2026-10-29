const VISITOR_KEY = 'mera-visitor-key'
const CUSTOMER_KEY = 'mera-customer-key'

export function visitorKey() {
  try {
    const current = localStorage.getItem(VISITOR_KEY)
    if (current && /^[a-f0-9]{24,80}$/.test(current)) return current
    const bytes = new Uint8Array(18)
    crypto.getRandomValues(bytes)
    const key = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')
    localStorage.setItem(VISITOR_KEY, key)
    localStorage.setItem(CUSTOMER_KEY, key)
    return key
  } catch {
    return ''
  }
}

export function adoptVisitorKey(key) {
  localStorage.setItem(VISITOR_KEY, key)
  localStorage.setItem(CUSTOMER_KEY, key)
}
