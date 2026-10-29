import { initialScene, normalizeScene, scenesEqual } from './scene'
import { visitorKey } from './visitor'

const LEGACY_KEY = 'garage-projects-v1'
const ID_PATTERN = /^project-[a-z0-9-]{4,80}$/

export async function loadLibrary() {
  const response = await fetch('/api/library', { headers: { 'X-Visitor-Key': visitorKey() } })
  if (!response.ok) throw new Error('Projekti se ne mogu učitati sa diska.')
  const payload = await response.json()
  let library = normalizeLibrary(payload)
  if (library.projects.length === 0) {
    const migrated = readLegacy()
    if (migrated.projects.length > 0) {
      library = await persistLibrary(migrated)
      try {
        localStorage.removeItem(LEGACY_KEY)
      } catch {
        // The disk copy is already written.
      }
    }
  }
  return {
    library,
    directory: typeof payload.directory === 'string' ? payload.directory : '',
  }
}

export async function persistLibrary(library) {
  const response = await fetch('/api/library', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Visitor-Key': visitorKey() },
    body: JSON.stringify({ activeId: library.activeId, projects: library.projects }),
  })
  if (!response.ok) throw new Error('Garaža nije sačuvana na disk.')
  return normalizeLibrary(await response.json())
}

export function createProjectId() {
  return `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function upsertProject(projects, record) {
  const next = projects.filter((project) => project.id !== record.id)
  next.push(record)
  return next.sort((left, right) => right.updatedAt - left.updatedAt)
}

export function projectNameOrDefault(name) {
  return cleanName(name) || 'Garaža'
}

export function isSceneDirty(active, name, scene) {
  const typed = name.trim()
  if (!active) return typed !== '' || !scenesEqual(scene, initialScene)
  const nameChanged = typed !== '' && typed !== active.name
  return nameChanged || !scenesEqual(active.scene, scene)
}

export function formatSavedAt(timestamp) {
  return new Intl.DateTimeFormat('sr-Latn', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

export function normalizeLibrary(raw) {
  if (!raw || !Array.isArray(raw.projects)) return emptyLibrary()
  const projects = []
  const seen = new Set()
  for (const project of raw.projects) {
    if (!project || !isProjectId(project.id) || seen.has(project.id) || !project.scene) continue
    seen.add(project.id)
    projects.push({
      id: project.id,
      name: cleanName(project.name) || 'Garaža',
      updatedAt: Number.isFinite(project.updatedAt) ? project.updatedAt : Date.now(),
      scene: normalizeScene(project.scene),
    })
  }
  projects.sort((left, right) => right.updatedAt - left.updatedAt)
  const activeId = projects.some((project) => project.id === raw.activeId) ? raw.activeId : null
  return { activeId, projects }
}

function readLegacy() {
  try {
    return normalizeLibrary(JSON.parse(localStorage.getItem(LEGACY_KEY) ?? 'null'))
  } catch {
    return emptyLibrary()
  }
}

function emptyLibrary() {
  return { activeId: null, projects: [] }
}

function isProjectId(id) {
  return typeof id === 'string' && ID_PATTERN.test(id)
}

function cleanName(name) {
  return typeof name === 'string' ? name.trim().slice(0, 60) : ''
}
