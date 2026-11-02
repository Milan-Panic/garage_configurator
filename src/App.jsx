import { useEffect, useMemo, useRef, useState } from 'react'
import { ControlPanel } from './components/ControlPanel'
import { GarageCanvas } from './components/GarageCanvas'
import { SiteHeader } from './components/SiteHeader'
import { navigate, usePath } from './nav'
import { HomePage } from './pages/HomePage'
import { CraftsmenPage } from './pages/CraftsmenPage'
import { PricesPage } from './pages/PricesPage'
import { WorkshopPage } from './pages/WorkshopPage'
import { AdminPage } from './pages/AdminPage'
import { adoptVisitorKey } from './visitor'
import { clampDimension } from './config'
import { DOOR_MATERIALS, doorMaterialsFor, sceneMaterials } from './materials'
import { useHistory } from './history'
import { buildEstimate } from './estimate'
import { mergePrices, orientationQuote, quoteTotal } from './prices'
import {
  CAR_PRESETS,
  FURNITURE_TYPES,
  PEDESTRIAN_DEFAULT,
  WINDOW_TYPES,
  clampCar,
  clampDoor,
  clampFurniture,
  clampPedestrian,
  clampWindow,
  defaultDoorSize,
} from './layout'
import {
  createProjectId,
  isSceneDirty,
  loadLibrary,
  persistLibrary,
  projectNameOrDefault,
  upsertProject,
} from './projects'
import { highestSerial, initialScene, normalizeScene, scenesEqual } from './scene'

let nextId = 1

function createId(prefix) {
  nextId += 1
  return `${prefix}-${nextId}`
}

function adoptIds(scene) {
  nextId = Math.max(nextId, highestSerial(scene))
}

// Klizači šalju mnogo malih izmena; to je jedan korak u istoriji.
const CONTINUOUS = new Set(['along', 'sill', 'width', 'height', 'depth', 'length', 'x', 'z', 'open', 'pitch'])

function isContinuous(patch) {
  const keys = Object.keys(patch)
  return keys.length > 0 && keys.every((key) => CONTINUOUS.has(key))
}

function isTyping(target) {
  if (!target) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

export default function App() {
  const [boot, setBoot] = useState(null)
  const [bootError, setBootError] = useState('')

  useEffect(() => {
    let cancelled = false
    loadLibrary()
      .then(({ library, directory }) => {
        if (cancelled) return
        const active = library.projects.find((project) => project.id === library.activeId) ?? null
        const scene = active ? active.scene : initialScene
        adoptIds(scene)
        setBoot({ library, scene, name: active?.name ?? '', directory })
      })
      .catch(() => {
        if (!cancelled) setBootError('Projekti se ne mogu učitati sa servera.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (bootError) {
    return (
      <Shell>
        <StatusScreen message={bootError} />
      </Shell>
    )
  }
  if (!boot) {
    return (
      <Shell>
        <StatusScreen message="Učitavam garaže…" />
      </Shell>
    )
  }
  return (
    <Shell>
      <Configurator boot={boot} />
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--page)]">
      <SiteHeader />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}

function ResumePage({ token }) {
  const [message, setMessage] = useState('Vraćam sačuvane garaže…')

  useEffect(() => {
    let stop = false
    fetch('/api/visitor/resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Link nije važeći.')
        adoptVisitorKey(payload.visitorKey)
        window.location.replace('/')
      })
      .catch((error) => {
        if (!stop) setMessage(error.message || 'Link nije važeći.')
      })
    return () => {
      stop = true
    }
  }, [token])

  return <div className="flex h-full items-center justify-center px-6 text-center text-stone-700">{message}</div>
}

function StatusScreen({ message }) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center text-stone-600">
      <span className="flex items-center gap-3">
        <span className="size-2 animate-pulse rounded-full bg-orange-500" />
        {message}
      </span>
    </div>
  )
}

function Configurator({ boot }) {
  const { scene, canUndo, canRedo, commit, transient, endGesture, undo, redo, replace } = useHistory(boot.scene)
  const [selected, setSelected] = useState(null)
  const [library, setLibrary] = useState(boot.library)
  const [projectName, setProjectName] = useState(boot.name)
  const [saveError, setSaveError] = useState('')
  const [saveNotice, setSaveNotice] = useState(null)
  const [prices, setPrices] = useState(() => mergePrices(null))
  const saveSerial = useRef(0)
  const libraryRef = useRef(library)
  const sceneRef = useRef(scene)
  const nameRef = useRef(projectName)
  const selectedRef = useRef(selected)
  libraryRef.current = library
  sceneRef.current = scene
  nameRef.current = projectName
  selectedRef.current = selected
  const { wallMaterial, roofMaterial, doorMaterial, floorMaterial } = sceneMaterials(scene)
  const door = Number.isFinite(scene.door?.width)
    ? scene.door
    : clampDoor(
        { ...scene.door, ...defaultDoorSize(scene.dimensions), wall: scene.door?.wall ?? 'front' },
        scene.dimensions,
      )
  const fullScene = useMemo(() => ({ ...scene, door }), [scene, door])
  const estimate = useMemo(() => buildEstimate(fullScene), [fullScene])
  const quote = useMemo(() => orientationQuote(fullScene, estimate, prices), [fullScene, estimate, prices])
  const total = quoteTotal(quote)
  const path = usePath()
  const resumeMatch = /^\/nastavi\/([a-f0-9]{24,80})$/.exec(path)
  const activeProject = library.projects.find((project) => project.id === library.activeId) ?? null
  const dirty = isSceneDirty(activeProject, projectName, scene)
  const saveMessage =
    saveNotice && scenesEqual(saveNotice.scene, scene) && saveNotice.name === projectName
      ? saveNotice.message
      : ''

  useEffect(() => {
    fetch('/api/prices')
      .then((response) => response.json())
      .then((payload) => setPrices(mergePrices(payload.prices)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    function onKeyDown(event) {
      if (isTyping(event.target)) return
      const key = event.key.toLowerCase()
      if (event.ctrlKey || event.metaKey) {
        if (key === 'z') {
          event.preventDefault()
          if (event.shiftKey) redo()
          else undo()
        } else if (key === 'y') {
          event.preventDefault()
          redo()
        } else if (key === 'd' && selectedRef.current) {
          event.preventDefault()
          duplicateItem(selectedRef.current)
        }
        return
      }
      if ((key === 'delete' || key === 'backspace') && selectedRef.current) {
        event.preventDefault()
        removeItem(selectedRef.current)
      } else if (key === 'escape') {
        setSelected(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  useEffect(() => {
    if (!library.activeId) return undefined
    const id = library.activeId
    const handle = setTimeout(() => {
      const current = libraryRef.current
      if (current.activeId !== id) return
      const existing = current.projects.find((project) => project.id === id)
      if (!existing) return
      const typed = nameRef.current.trim()
      const name = typed || existing.name
      const nextScene = sceneRef.current
      if (existing.name === name && JSON.stringify(existing.scene) === JSON.stringify(nextScene)) return
      storeLibrary({
        ...current,
        projects: upsertProject(current.projects, {
          ...existing,
          name,
          updatedAt: Date.now(),
          scene: nextScene,
        }),
      })
    }, 700)
    return () => clearTimeout(handle)
  }, [scene, projectName, library.activeId])

  function storeLibrary(next) {
    const serial = ++saveSerial.current
    libraryRef.current = next
    setLibrary(next)
    return persistLibrary(next)
      .then(() => {
        if (serial !== saveSerial.current) return false
        setSaveError('')
        return true
      })
      .catch(() => {
        if (serial === saveSerial.current) setSaveError('Nije moguće sačuvati garažu. Proveri vezu sa serverom.')
        return false
      })
  }

  function snapshotProject() {
    const current = libraryRef.current
    const id = current.activeId ?? createProjectId()
    const existing = current.projects.find((project) => project.id === id)
    const name = projectNameOrDefault(nameRef.current || existing?.name)
    const record = {
      id,
      name,
      updatedAt: Date.now(),
      scene: normalizeScene(sceneRef.current),
    }
    return {
      library: { activeId: id, projects: upsertProject(current.projects, record) },
      record,
    }
  }

  function saveProject() {
    const updating = Boolean(libraryRef.current.activeId)
    const snap = snapshotProject()
    setProjectName(snap.record.name)
    storeLibrary(snap.library).then((saved) => {
      if (!saved) return
      setSaveNotice({
        message: updating ? 'Izmene su sačuvane.' : 'Garaža je sačuvana.',
        scene: snap.record.scene,
        name: snap.record.name,
      })
    })
    return snap
  }

  function openProject(id) {
    const project = libraryRef.current.projects.find((entry) => entry.id === id)
    if (!project) return
    const nextScene = normalizeScene(project.scene)
    adoptIds(nextScene)
    replace(nextScene)
    setSelected(null)
    setSaveNotice(null)
    setProjectName(project.name)
    storeLibrary({ ...libraryRef.current, activeId: id })
  }

  function startNewProject() {
    adoptIds(initialScene)
    replace(initialScene)
    setSelected(null)
    setSaveNotice(null)
    setProjectName('')
    storeLibrary({ ...libraryRef.current, activeId: null })
  }

  function startFrom(source) {
    if (!libraryRef.current.activeId && isSceneDirty(null, nameRef.current, sceneRef.current)) {
      if (!window.confirm('Trenutna garaža nije sačuvana. Da li da je zamenim ovim primerom?')) return
    }
    const nextScene = normalizeScene(source)
    adoptIds(nextScene)
    replace(nextScene)
    setSelected(null)
    setSaveNotice(null)
    setProjectName('')
    storeLibrary({ ...libraryRef.current, activeId: null })
    navigate('/konfigurator')
  }

  function deleteProject(id) {
    const current = libraryRef.current
    const projects = current.projects.filter((project) => project.id !== id)
    const activeId = current.activeId === id ? null : current.activeId
    storeLibrary({ activeId, projects })
  }

  function apply(patch, recipe) {
    if (isContinuous(patch)) transient(recipe)
    else commit(recipe)
  }

  function updateScene(patch) {
    commit((current) => ({ ...current, ...patch }))
  }

  function updateDimension(key, value) {
    transient((current) => {
      const dimensions = { ...current.dimensions, [key]: clampDimension(key, value) }
      return {
        ...current,
        dimensions,
        windows: current.windows.map((item) => clampWindow(item, dimensions)),
        door: clampDoor(current.door?.width ? current.door : { ...current.door, ...defaultDoorSize(dimensions) }, dimensions),
        pedestrianDoors: (current.pedestrianDoors || []).map((item) => clampPedestrian(item, dimensions, current.door)),
        furniture: current.furniture.map((item) => clampFurniture(item, dimensions)),
        car: current.car ? clampCar(current.car, dimensions) : null,
      }
    })
  }

  function addWindow(typeId) {
    const spec = WINDOW_TYPES.find((entry) => entry.id === typeId) ?? WINDOW_TYPES[0]
    const id = createId('window')
    commit((current) => {
      const onBack = current.windows.filter((item) => item.wall === 'back').length
      const item = clampWindow(
        {
          id,
          type: spec.id,
          wall: 'back',
          along: onBack === 0 ? 0 : (onBack % 2 === 0 ? 1 : -1) * Math.ceil(onBack / 2) * 1.15,
          sill: spec.sill,
          width: spec.width,
          height: spec.height,
          frame: 'bela',
          bars: false,
        },
        current.dimensions,
      )
      return { ...current, windows: [...current.windows, item] }
    })
    setSelected({ kind: 'window', id })
  }

  function copyWindow(id) {
    const copyId = createId('window')
    commit((current) => {
      const source = current.windows.find((item) => item.id === id)
      if (!source) return current
      const shifted = { ...clampWindow({ ...source, id: copyId, along: source.along + source.width + 0.12 }, current.dimensions), id: copyId }
      const item =
        Math.abs(shifted.along - source.along) > 0.05
          ? shifted
          : { ...clampWindow({ ...source, id: copyId, along: source.along - source.width - 0.12 }, current.dimensions), id: copyId }
      return { ...current, windows: [...current.windows, item] }
    })
    setSelected({ kind: 'window', id: copyId })
  }

  function copyFurniture(id) {
    const copyId = createId('furniture')
    commit((current) => {
      const source = current.furniture.find((item) => item.id === id)
      if (!source) return current
      const step = Math.abs(Math.cos(source.rotation)) > 0.5 ? source.width + 0.1 : source.depth + 0.1
      let item = { ...clampFurniture({ ...source, id: copyId, x: source.x + step }, current.dimensions), id: copyId }
      if (Math.abs(item.x - source.x) < 0.05) item = { ...clampFurniture({ ...source, id: copyId, x: source.x - step }, current.dimensions), id: copyId }
      return { ...current, furniture: [...current.furniture, item] }
    })
    setSelected({ kind: 'furniture', id: copyId })
  }

  function duplicateItem(target) {
    if (target.kind === 'window') copyWindow(target.id)
    else if (target.kind === 'furniture') copyFurniture(target.id)
  }

  function addPedestrian() {
    const id = createId('pesacka')
    commit((current) => {
      const count = (current.pedestrianDoors || []).filter((item) => item.wall === 'left').length
      const item = clampPedestrian(
        {
          id,
          wall: 'left',
          along: count === 0 ? -1.2 : 1.2,
          width: PEDESTRIAN_DEFAULT.width,
          height: PEDESTRIAN_DEFAULT.height,
          glass: false,
        },
        current.dimensions,
        current.door,
      )
      return { ...current, pedestrianDoors: [...(current.pedestrianDoors || []), item] }
    })
    setSelected({ kind: 'pedestrian', id })
  }

  function updatePedestrian(id, patch) {
    apply(patch, (current) => ({
      ...current,
      pedestrianDoors: (current.pedestrianDoors || []).map((item) =>
        item.id === id ? clampPedestrian({ ...item, ...patch }, current.dimensions, current.door) : item,
      ),
    }))
  }

  function addFurniture(typeId) {
    const spec = FURNITURE_TYPES.find((entry) => entry.id === typeId) ?? FURNITURE_TYPES[0]
    const id = createId('furniture')
    commit((current) => {
      const item = clampFurniture(
        {
          id,
          type: spec.id,
          x: ((current.furniture.length % 3) - 1) * 1.15,
          z: Math.floor(current.furniture.length / 3) * 1.2 - 0.4,
          rotation: 0,
          width: spec.width,
          depth: spec.depth,
          height: spec.height,
        },
        current.dimensions,
      )
      return { ...current, furniture: [...current.furniture, item] }
    })
    setSelected({ kind: 'furniture', id })
  }

  function updateWindow(id, patch) {
    apply(patch, (current) => ({
      ...current,
      windows: current.windows.map((item) =>
        item.id === id ? clampWindow({ ...item, ...patch }, current.dimensions) : item,
      ),
    }))
  }

  function updateFurniture(id, patch) {
    apply(patch, (current) => ({
      ...current,
      furniture: current.furniture.map((item) =>
        item.id === id ? clampFurniture({ ...item, ...patch }, current.dimensions) : item,
      ),
    }))
  }

  function updateDoor(patch) {
    apply(patch, (current) => {
      const base = Number.isFinite(current.door?.width)
        ? current.door
        : { ...current.door, ...defaultDoorSize(current.dimensions), wall: current.door?.wall ?? 'front' }
      const next = clampDoor({ ...base, ...patch }, current.dimensions)
      if (next.style !== 'single' && next.style !== 'double') next.wicket = false
      let { doorMaterialId, doorColor } = current
      const spec = DOOR_MATERIALS.find((entry) => entry.id === doorMaterialId)
      if (next.style !== 'none' && spec && !spec.styles.includes(next.style)) {
        const options = doorMaterialsFor(next.style)
        const light = spec.color && parseInt(spec.color.slice(1, 3), 16) > 200
        const match = options.find((entry) => light === parseInt(entry.color.slice(1, 3), 16) > 200) ?? options[0]
        doorMaterialId = match.id
        if (!match.tintable) doorColor = null
      }
      return { ...current, door: next, doorMaterialId, doorColor }
    })
  }

  function updateRoof(patch) {
    apply(patch, (current) => ({ ...current, roof: { ...current.roof, ...patch } }))
  }

  function addCar(presetId = 'sedan') {
    const preset = CAR_PRESETS.find((entry) => entry.id === presetId) ?? CAR_PRESETS[1]
    commit((current) => ({
      ...current,
      car: clampCar(
        {
          length: preset.length,
          width: preset.width,
          height: preset.height,
          x: current.car?.x ?? 0,
          z: current.car?.z ?? 0.2,
          rotation: current.car?.rotation ?? 0,
          kind: preset.id,
          color: current.car?.color ?? '#1d4e89',
        },
        current.dimensions,
      ),
    }))
    setSelected({ kind: 'car' })
  }

  function updateCar(patch) {
    apply(patch, (current) => ({
      ...current,
      car: current.car ? clampCar({ ...current.car, ...patch }, current.dimensions) : null,
    }))
  }

  function removeCar() {
    commit((current) => ({ ...current, car: null }))
    setSelected((current) => (current?.kind === 'car' ? null : current))
  }

  function removeItem(target) {
    if (target.kind === 'window') {
      commit((current) => ({
        ...current,
        windows: current.windows.filter((item) => item.id !== target.id),
      }))
    } else if (target.kind === 'furniture') {
      commit((current) => ({
        ...current,
        furniture: current.furniture.filter((item) => item.id !== target.id),
      }))
    } else if (target.kind === 'pedestrian') {
      commit((current) => ({
        ...current,
        pedestrianDoors: (current.pedestrianDoors || []).filter((item) => item.id !== target.id),
      }))
    } else if (target.kind === 'car') {
      removeCar()
      return
    } else {
      return
    }
    setSelected((current) => (current?.id === target.id ? null : current))
  }

  const pages = ['/konfigurator', '/majstori', '/cene', '/radionica', '/admin']

  return (
    <>
      {path === '/majstori' && <CraftsmenPage scene={fullScene} projectName={projectNameOrDefault(projectName)} />}
      {path === '/cene' && <PricesPage />}
      {path === '/radionica' && <WorkshopPage />}
      {path === '/admin' && <AdminPage />}
      {resumeMatch && <ResumePage token={resumeMatch[1]} />}
      {!pages.includes(path) && !resumeMatch && <HomePage onStartFrom={startFrom} />}
      {path === '/konfigurator' && (
        <div className="flex h-full flex-col md:flex-row">
          <ControlPanel
            scene={fullScene}
            estimate={estimate}
            quote={quote}
            total={total}
            onDimensionChange={updateDimension}
            onSceneChange={updateScene}
            selected={selected}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            projectName={projectName}
            projects={library.projects}
            activeProjectId={library.activeId}
            projectDirty={dirty}
            saveError={saveError}
            saveNotice={saveMessage}
            onProjectNameChange={setProjectName}
            onSaveProject={saveProject}
            onNewProject={startNewProject}
            onOpenProject={openProject}
            onDeleteProject={deleteProject}
            onSettle={endGesture}
            onSelect={setSelected}
            onAddWindow={addWindow}
            onCopyWindow={copyWindow}
            onCopyFurniture={copyFurniture}
            onAddFurniture={addFurniture}
            onChangeWindow={updateWindow}
            onChangeFurniture={updateFurniture}
            onDoorChange={updateDoor}
            onRoofChange={updateRoof}
            onAddPedestrian={addPedestrian}
            onChangePedestrian={updatePedestrian}
            onAddCar={addCar}
            onChangeCar={updateCar}
            onRemoveCar={removeCar}
            onRemove={removeItem}
          />
          <main className="relative min-h-[48dvh] flex-1 md:min-h-0">
            <GarageCanvas
              dimensions={scene.dimensions}
              wallMaterial={wallMaterial}
              roofMaterial={roofMaterial}
              doorMaterial={doorMaterial}
              floorMaterial={floorMaterial}
              windows={scene.windows}
              furniture={scene.furniture}
              door={door}
              roof={scene.roof}
              gutters={scene.gutters !== false}
              pedestrianDoors={scene.pedestrianDoors || []}
              car={scene.car}
              selected={selected}
              projectName={projectName}
              onSelect={setSelected}
              onChangeWindow={updateWindow}
              onChangePedestrian={updatePedestrian}
              onChangeFurniture={updateFurniture}
              onChangeCar={updateCar}
              onGestureEnd={endGesture}
            />
          </main>
        </div>
      )}
    </>
  )
}
