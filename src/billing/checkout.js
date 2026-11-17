import { useSyncExternalStore } from 'react'
import { requireAccount } from '../account'

// Koja porudžbina je trenutno otvorena u prozoru za plaćanje.
let current = null
const listeners = new Set()

function emit() {
  listeners.forEach((listener) => listener())
}

// Paket se vezuje za nalog, pa kupovina prvo traži prijavu.
export async function openCheckout(order) {
  const user = await requireAccount('Paket se vezuje za nalog. Prijavi se ili napravi nalog da nastaviš kupovinu.')
  if (!user) return
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
