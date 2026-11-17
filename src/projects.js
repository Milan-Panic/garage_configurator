import { request } from './account'
import { initialScene, normalizeScene, scenesEqual } from './scene'

const ID_PATTERN = /^project-[a-z0-9-]{4,80}$/

// Sačuvani projekti žive na nalogu. Bez prijave biblioteka je prazna.
export async function loadLibrary() {
  return normalizeLibrary(await request('/api/library'))
}

export async function persistLibrary(library) {
  const payload = await request('/api/library', {
    method: 'PUT',
    body: { activeId: library.activeId, projects: library.projects },
  })
  return normalizeLibrary(payload)
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
  return cleanName(name) || 'Objekat'
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

export function emptyLibrary() {
  return { activeId: null, projects: [] }
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
      name: cleanName(project.name) || 'Objekat',
      updatedAt: Number.isFinite(project.updatedAt) ? project.updatedAt : Date.now(),
      scene: normalizeScene(project.scene),
    })
  }
  projects.sort((left, right) => right.updatedAt - left.updatedAt)
  const activeId = projects.some((project) => project.id === raw.activeId) ? raw.activeId : null
  return { activeId, projects }
}

function isProjectId(id) {
  return typeof id === 'string' && ID_PATTERN.test(id)
}

function cleanName(name) {
  return typeof name === 'string' ? name.trim().slice(0, 60) : ''
}
