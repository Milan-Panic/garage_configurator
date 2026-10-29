import { useEffect, useRef, useState } from 'react'
import { ControlPanel } from './components/ControlPanel'
import { GarageCanvas } from './components/GarageCanvas'
import { SiteHeader } from './components/SiteHeader'
import { usePath } from './nav'
import { HomePage } from './pages/HomePage'
import { CraftsmenPage } from './pages/CraftsmenPage'
import { PricesPage } from './pages/PricesPage'
import { WorkshopPage } from './pages/WorkshopPage'
import { AdminPage } from './pages/AdminPage'
import { adoptVisitorKey } from './visitor'
import { clampDimension } from './config'
import { DOOR_MATERIALS, ROOF_MATERIALS, WALL_MATERIALS, findMaterial } from './materials'
import { useHistory } from './history'
import { FURNITURE_TYPES, PEDESTRIAN_DEFAULT, WINDOW_TYPES, clampCar, clampDoor, clampFurniture, clampPedestrian, clampWindow, defaultDoorSize } from './layout'
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
        if (!cancelled) setBootError('Projekti se ne mogu učitati sa diska.')
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
    <div className="flex h-dvh flex-col bg-[#ebe6de]">
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
      {message}
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
  const saveSerial = useRef(0)
  const libraryRef = useRef(library)
  const sceneRef = useRef(scene)
  const nameRef = useRef(projectName)
  libraryRef.current = library
  sceneRef.current = scene
  nameRef.current = projectName
  const wallMaterial = findMaterial(WALL_MATERIALS, scene.wallMaterialId)
  const roofMaterial = findMaterial(ROOF_MATERIALS, scene.roofMaterialId)
  const doorMaterial = findMaterial(DOOR_MATERIALS, scene.doorMaterialId)
  const door = Number.isFinite(scene.door?.width)
    ? scene.door
    : clampDoor(
        { ...scene.door, ...defaultDoorSize(scene.dimensions), wall: scene.door?.wall ?? 'front' },
        scene.dimensions,
      )
  const path = usePath()
  const resumeMatch = /^\/nastavi\/([a-f0-9]{24,80})$/.exec(path)
  const activeProject = library.projects.find((project) => project.id === library.activeId) ?? null
  const dirty = isSceneDirty(activeProject, projectName, scene)
  const saveMessage =
    saveNotice && scenesEqual(saveNotice.scene, scene) && saveNotice.name === projectName
      ? saveNotice.message
      : ''

  useEffect(() => {
    function onKeyDown(event) {
      if (!(event.ctrlKey || event.metaKey)) return
      const key = event.key.toLowerCase()
      if (key === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (key === 'y') {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

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
        if (serial === saveSerial.current) setSaveError('Nije moguće sačuvati garažu na disk.')
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

  function deleteProject(id) {
    const current = libraryRef.current
    const projects = current.projects.filter((project) => project.id !== id)
    const activeId = current.activeId === id ? null : current.activeId
    storeLibrary({ activeId, projects })
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
          sill: 0.95,
          width: spec.width,
          height: spec.height,
        },
        current.dimensions,
      )
      return { ...current, windows: [...current.windows, item] }
    })
    setSelected({ kind: 'window', id })
  }

  function copyWindow(id) {
    const nextId = createId('window')
    commit((current) => {
      const source = current.windows.find((item) => item.id === id)
      if (!source) return current
      const shifted = { ...clampWindow({ ...source, id: nextId, along: source.along + source.width + 0.12 }, current.dimensions), id: nextId }
      const item =
        Math.abs(shifted.along - source.along) > 0.05
          ? shifted
          : { ...clampWindow({ ...source, id: nextId, along: source.along - source.width - 0.12 }, current.dimensions), id: nextId }
      return { ...current, windows: [...current.windows, item] }
    })
    setSelected({ kind: 'window', id: nextId })
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
        },
        current.dimensions,
        current.door,
      )
      return { ...current, pedestrianDoors: [...(current.pedestrianDoors || []), item] }
    })
    setSelected({ kind: 'pedestrian', id })
  }

  function updatePedestrian(id, patch) {
    const apply = (current) => ({
      ...current,
      pedestrianDoors: (current.pedestrianDoors || []).map((item) =>
        item.id === id ? clampPedestrian({ ...item, ...patch }, current.dimensions, current.door) : item,
      ),
    })
    if (Object.prototype.hasOwnProperty.call(patch, 'along') || Object.prototype.hasOwnProperty.call(patch, 'width') || Object.prototype.hasOwnProperty.call(patch, 'height')) {
      transient(apply)
    } else commit(apply)
  }

  function updateGutters(gutters) {
    commit((current) => ({ ...current, gutters }))
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
    transient((current) => ({
      ...current,
      windows: current.windows.map((item) =>
        item.id === id ? clampWindow({ ...item, ...patch }, current.dimensions) : item,
      ),
    }))
  }

  function updateFurniture(id, patch) {
    transient((current) => ({
      ...current,
      furniture: current.furniture.map((item) =>
        item.id === id ? clampFurniture({ ...item, ...patch }, current.dimensions) : item,
      ),
    }))
  }

  function updateDoor(patch) {
    const apply = (current) => {
      const base = Number.isFinite(current.door?.width)
        ? current.door
        : { ...current.door, ...defaultDoorSize(current.dimensions), wall: current.door?.wall ?? 'front' }
      const door = clampDoor({ ...base, ...patch }, current.dimensions)
      let doorMaterialId = current.doorMaterialId
      if (patch.style === 'roller' && !String(doorMaterialId).startsWith('rolo')) {
        doorMaterialId = String(doorMaterialId).includes('bela') ? 'rolo-bela' : 'rolo-antracit'
      }
      if ((patch.style === 'single' || patch.style === 'double') && String(doorMaterialId).startsWith('rolo')) {
        doorMaterialId = 'sekcijska-antracit'
      }
      return { ...current, door, doorMaterialId }
    }
    const sliding = ['open', 'along', 'width', 'height'].some((key) => Object.prototype.hasOwnProperty.call(patch, key))
    if (sliding) transient(apply)
    else commit(apply)
  }

  function updateRoof(patch) {
    const apply = (current) => ({ ...current, roof: { ...current.roof, ...patch } })
    if (Object.prototype.hasOwnProperty.call(patch, 'pitch')) transient(apply)
    else commit(apply)
  }

  function addCar() {
    commit((current) => ({
      ...current,
      car: clampCar(
        {
          length: 4.4,
          width: 1.8,
          height: 1.5,
          x: 0,
          z: 0.2,
          rotation: 0,
        },
        current.dimensions,
      ),
    }))
    setSelected({ kind: 'car' })
  }

  function updateCar(patch) {
    transient((current) => ({
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
    } else {
      removeCar()
      return
    }
    setSelected((current) => (current?.id === target.id ? null : current))
  }

  return (
    <>
      {path === '/majstori' && (
        <CraftsmenPage scene={{ ...scene, door }} projectName={projectNameOrDefault(projectName)} />
      )}
      {path === '/cene' && <PricesPage />}
      {path === '/radionica' && <WorkshopPage />}
      {path === '/admin' && <AdminPage />}
      {resumeMatch && <ResumePage token={resumeMatch[1]} />}
      {path !== '/konfigurator' && path !== '/majstori' && path !== '/cene' && path !== '/radionica' && path !== '/admin' && !resumeMatch && <HomePage />}
      {path === '/konfigurator' && (
    <div className="flex h-full flex-col bg-[#ebe6de] md:flex-row">
      <ControlPanel
        dimensions={scene.dimensions}
        onDimensionChange={updateDimension}
        wallMaterialId={wallMaterial.id}
        roofMaterialId={roofMaterial.id}
        doorMaterialId={doorMaterial.id}
        onWallMaterialChange={(wallMaterialId) => commit((current) => ({ ...current, wallMaterialId }))}
        onRoofMaterialChange={(roofMaterialId) => commit((current) => ({ ...current, roofMaterialId }))}
        onDoorMaterialChange={(doorMaterialId) => commit((current) => ({ ...current, doorMaterialId }))}
        windows={scene.windows}
        furniture={scene.furniture}
        door={door}
        roof={scene.roof}
        car={scene.car}
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
        storagePath={boot.directory}
        onProjectNameChange={setProjectName}
        onSaveProject={saveProject}
        onNewProject={startNewProject}
        onOpenProject={openProject}
        onDeleteProject={deleteProject}
        onSettle={endGesture}
        onSelect={setSelected}
        onAddWindow={addWindow}
        onCopyWindow={copyWindow}
        onAddFurniture={addFurniture}
        onChangeWindow={updateWindow}
        onChangeFurniture={updateFurniture}
        onDoorChange={updateDoor}
        onRoofChange={updateRoof}
        gutters={scene.gutters !== false}
        onGuttersChange={updateGutters}
        pedestrianDoors={scene.pedestrianDoors || []}
        onAddPedestrian={addPedestrian}
        onChangePedestrian={updatePedestrian}
        onAddCar={addCar}
        onChangeCar={updateCar}
        onRemoveCar={removeCar}
        onRemove={removeItem}
      />
      <main className="relative min-h-0 flex-1">
        <GarageCanvas
          dimensions={scene.dimensions}
          wallMaterial={wallMaterial}
          roofMaterial={roofMaterial}
          doorMaterial={doorMaterial}
          windows={scene.windows}
          furniture={scene.furniture}
          door={door}
          roof={scene.roof}
          gutters={scene.gutters !== false}
          pedestrianDoors={scene.pedestrianDoors || []}
          car={scene.car}
          selected={selected}
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
