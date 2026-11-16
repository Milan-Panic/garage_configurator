import { useSyncExternalStore } from 'react'

// Koja porudžbina je trenutno otvorena u prozoru za plaćanje.
let current = null
const listeners = new Set()

function emit() {
  listeners.forEach((listener) => listener())
}

export function openCheckout(order) {
  current = order
  emit()
}

export function closeCheckout() {
  current = null
  emit()
}

export function useCheckout() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
  )
}
