// Trenutni crtež, i bez naloga. Pamti se u pregledaču; ako pregledač to ne dozvoljava,
// ostaje u memoriji dok je kartica otvorena. Sačuvani projekti su na nalogu, ne ovde.

const KEY = 'mera-draft-v1'
let memory = null

export function readDraft() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return parse(raw)
  } catch {
    // Pregledač ne dozvoljava skladište.
  }
  return memory
}

export function writeDraft(draft) {
  memory = { scene: draft.scene, name: draft.name || '', projectId: draft.projectId || null, savedAt: Date.now() }
  try {
    localStorage.setItem(KEY, JSON.stringify(memory))
  } catch {
    // Ostaje u memoriji.
  }
}

export function clearDraft() {
  memory = null
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nema šta da se briše.
  }
}

function parse(raw) {
  try {
    const value = JSON.parse(raw)
    if (!value || typeof value !== 'object' || !value.scene || typeof value.scene !== 'object') return null
    return { scene: value.scene, name: typeof value.name === 'string' ? value.name : '', projectId: typeof value.projectId === 'string' ? value.projectId : null }
  } catch {
    return null
  }
}
