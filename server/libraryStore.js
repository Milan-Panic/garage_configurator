import fs from 'node:fs/promises'
import path from 'node:path'

const ID_PATTERN = /^project-[a-z0-9-]{4,80}$/

export function createLibraryStore(projectsDir) {
  const activePath = path.resolve(projectsDir, '../active.json')
  let chain = Promise.resolve()

  function enqueue(task) {
    const job = chain.then(task, task)
    chain = job.then(
      () => {},
      () => {},
    )
    return job
  }

  return {
    projectsDir,
    readLibrary: () => enqueue(() => readLibraryNow(projectsDir, activePath)),
    writeLibrary: (raw) => enqueue(() => writeLibraryNow(projectsDir, activePath, raw)),
  }
}

export function isProjectId(id) {
  return typeof id === 'string' && ID_PATTERN.test(id)
}

async function readLibraryNow(projectsDir, activePath) {
  await fs.mkdir(projectsDir, { recursive: true })
  const names = await fs.readdir(projectsDir)
  const projects = []
  for (const name of names) {
    if (!name.endsWith('.json')) continue
    const id = name.slice(0, -'.json'.length)
    if (!isProjectId(id)) continue
    try {
      const raw = JSON.parse(await fs.readFile(path.join(projectsDir, name), 'utf8'))
      const project = sanitizeProject(raw)
      if (project) projects.push(project)
    } catch {
      // An unreadable file stays on disk and is left out of the list.
    }
  }
  let activeId = null
  try {
    const active = JSON.parse(await fs.readFile(activePath, 'utf8'))
    activeId = active.activeId ?? null
  } catch {
    activeId = null
  }
  return sanitizeLibrary({ activeId, projects })
}

async function writeLibraryNow(projectsDir, activePath, raw) {
  const library = sanitizeLibrary(raw)
  await fs.mkdir(projectsDir, { recursive: true })
  const keep = new Set(library.projects.map((project) => project.id))
  await Promise.all(
    library.projects.map((project) =>
      fs.writeFile(path.join(projectsDir, `${project.id}.json`), `${JSON.stringify(project, null, 2)}\n`),
    ),
  )
  const names = await fs.readdir(projectsDir)
  await Promise.all(
    names.map((name) => {
      if (!name.endsWith('.json')) return null
      const id = name.slice(0, -'.json'.length)
      if (!isProjectId(id) || keep.has(id)) return null
      return fs.unlink(path.join(projectsDir, name))
    }),
  )
  await fs.writeFile(activePath, `${JSON.stringify({ activeId: library.activeId }, null, 2)}\n`)
  return library
}

function sanitizeLibrary(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const projects = []
  const seen = new Set()
  if (Array.isArray(source.projects)) {
    for (const entry of source.projects) {
      const project = sanitizeProject(entry)
      if (!project || seen.has(project.id)) continue
      seen.add(project.id)
      projects.push(project)
    }
  }
  projects.sort((left, right) => right.updatedAt - left.updatedAt)
  const activeId = projects.some((project) => project.id === source.activeId) ? source.activeId : null
  return { activeId, projects }
}

function sanitizeProject(project) {
  if (!project || typeof project !== 'object' || !isProjectId(project.id)) return null
  if (!project.scene || typeof project.scene !== 'object' || Array.isArray(project.scene)) return null
  const name = typeof project.name === 'string' ? project.name.trim().slice(0, 60) : ''
  const updatedAt = Number(project.updatedAt)
  return {
    id: project.id,
    name: name || 'Garaža',
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
    scene: project.scene,
  }
}
