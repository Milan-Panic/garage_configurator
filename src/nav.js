import { useEffect, useState } from 'react'

export const ROUTES = [
  { path: '/', label: 'Home' },
  { path: '/konfigurator', label: 'Garage Configurator' },
  { path: '/majstori', label: 'Majstori' },
  { path: '/radionica', label: 'Radionica' },
  { path: '/cene', label: 'Cene' },
  { path: '/admin', label: 'Admin' },
]

const listeners = new Set()

export function usePath() {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname))

  useEffect(() => {
    const sync = () => setPath(normalizePath(window.location.pathname))
    listeners.add(sync)
    window.addEventListener('popstate', sync)
    return () => {
      listeners.delete(sync)
      window.removeEventListener('popstate', sync)
    }
  }, [])

  return path
}

export function navigate(path) {
  const next = normalizePath(path)
  if (normalizePath(window.location.pathname) === next) return
  window.history.pushState({}, '', next)
  listeners.forEach((listener) => listener())
}

function normalizePath(path) {
  if (!path || path === '/') return '/'
  return path.replace(/\/+$/, '')
}
