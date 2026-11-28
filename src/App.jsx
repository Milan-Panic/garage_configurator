import { useEffect, useMemo, useRef, useState } from 'react'
import { ControlPanel } from './components/ControlPanel'
import { GarageCanvas } from './components/GarageCanvas'
import { SiteHeader } from './components/SiteHeader'
import { navigate, usePath } from './nav'
import { HomePage } from './pages/HomePage'
import { ModelsPage } from './pages/ModelsPage'
import { StartQuiz } from './components/StartQuiz'
import { ProfilePage } from './pages/ProfilePage'
import { recordModelView } from './views'
import { CraftsmenPage } from './pages/CraftsmenPage'
import { PricesPage } from './pages/PricesPage'
import { WorkshopPage } from './pages/WorkshopPage'
import { AdminPage } from './pages/AdminPage'
import { PartnerPage } from './pages/PartnerPage'
import { PermitsPage } from './pages/PermitsPage'
import { OfferPage } from './pages/OfferPage'
import { PlansPage } from './pages/PlansPage'
import { AccountPage, ResetPasswordPage } from './pages/AccountPage'
import { CheckoutHost } from './components/CheckoutModal'
import { AccountHost } from './components/AccountModal'
import { openCheckout } from './billing/checkout'
import { projectAccess } from './billing/entitlements'
import { diyOrder, loadBilling, unlockProject, useBilling } from './billing/paymentService'
import { diyPrice, footprintArea } from './billing/plans'
import { loadAccount, readAccount, requireAccount, useAccount } from './account'
import { readDraft, writeDraft } from './draft'
import { clampDimension } from './config'
import { settleCar, settleFurniture } from './collide'
import { DOOR_MATERIALS, doorMaterialsFor, sceneMaterials } from './materials'
import { useHistory } from './history'
import { buildEstimate } from './estimate'
import { applyOffers, useOfferPartners } from './partners'
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
  emptyLibrary,
  isSceneDirty,
  loadLibrary,
  persistLibrary,
  projectNameOrDefault,
  upsertProject,
} from './projects'
import { MAX_ROOMS, freeCorner, normalizeRooms, roomKind } from './rooms'
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
const CONTINUOUS = new Set(['along', 'sill', 'width', 'height', 'depth', 'length', 'x', 'z', 'open', 'pitch', 'sockets', 'lights', 'distance', 'solar', 'elevation', 'doorOffset', 'altitude', 'count', 'offset', 'units'])

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

  // Trenutni crtež dolazi iz pregledača (radi i bez naloga), a sačuvani projekti sa naloga.
  useEffect(() => {
    let cancelled = false
    async function start() {
      const account = await loadAccount()
      await loadBilling(Boolean(account.user))
      const library = account.user ? await loadLibrary() : emptyLibrary()
      const draft = readDraft()
      let scene = initialScene
      let name = ''
      let activeId = null
      if (draft) {
        const restored = normalizeScene(draft.scene)
        // Netaknut početni objekat ostaje „nov”, a ne „nesačuvan”.
        scene = scenesEqual(restored, normalizeScene(initialScene)) ? initialScene : restored
        name = draft.name
        activeId = library.projects.some((project) => project.id === draft.projectId) ? draft.projectId : null
      } else {
        const active = library.projects.find((project) => project.id === library.activeId)
        if (active) {
          scene = active.scene
          name = active.name
          activeId = active.id
        }
      }
      if (cancelled) return
      adoptIds(scene)
      setBoot({ library: { ...library, activeId }, scene, name, owner: account.user?.id ?? null })
    }
    start().catch(() => {
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
        <StatusScreen message="Učitavam projekte…" />
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
    <div className="app-shell flex h-dvh flex-col overflow-hidden bg-[var(--page)]">
      <SiteHeader />
      <div className="min-h-0 flex-1">{children}</div>
      <CheckoutHost />
      <AccountHost />
    </div>
  )
}

function StatusScreen({ message }) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center text-stone-600">
      <span className="flex items-center gap-3">
        <span className="size-2 animate-pulse rounded-full bg-accent-500" />
        {message}
      </span>
    </div>
  )
}

const QUIZ_KEY = 'mera-quiz-done'

function Configurator({ boot }) {
  const { scene, canUndo, canRedo, commit, transient, endGesture, undo, redo, replace } = useHistory(boot.scene)
  const [selected, setSelected] = useState(null)
  // Kviz se sam otvara samo prvi put, na praznom crtežu.
  // Telefon: panel sa podešavanjima je sklopljen dok se ne dodirne tab, pa 3D prikaz ima više mesta.
  const [panelOpen, setPanelOpen] = useState(false)
  const [quizOpen, setQuizOpen] = useState(() => {
    try {
      return !localStorage.getItem(QUIZ_KEY) && scenesEqual(boot.scene, initialScene)
    } catch {
      return false
    }
  })
  const [library, setLibrary] = useState(boot.library)
  const [projectName, setProjectName] = useState(boot.name)
  const [saveError, setSaveError] = useState('')
  const [saveNotice, setSaveNotice] = useState(null)
  const [prices, setPrices] = useState(() => mergePrices(null))
  const partners = useOfferPartners()
  const billingState = useBilling()
  const access = useMemo(() => projectAccess(billingState, library.activeId), [billingState, library.activeId])
  const lockRef = useRef(access.lock)
  lockRef.current = access.lock
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
  const catalog = useMemo(() => applyOffers(prices, partners, scene.offers), [prices, partners, scene.offers])
  const quote = useMemo(() => orientationQuote(fullScene, estimate, catalog), [fullScene, estimate, catalog])
  const total = quoteTotal(quote)
  const path = usePath()
  const resetMatch = /^\/nalog\/nova-lozinka\/([a-f0-9]{48})$/.exec(path)
  const profileMatch = /^\/(firma|majstor)\/([^/]+)$/.exec(path)
  const account = useAccount()
  const userId = account.user?.id ?? null
  // Za koji nalog je biblioteka učitana; kad se promeni prijava, biblioteka se učitava ponovo.
  const libraryOwner = useRef(boot.owner)
  const activeProject = library.projects.find((project) => project.id === library.activeId) ?? null
  const dirty = isSceneDirty(activeProject, projectName, scene)
  const saveMessage =
    saveNotice && scenesEqual(saveNotice.scene, scene) && saveNotice.name === projectName
      ? saveNotice.message
      : ''

  // Kad se mere zaključaju kupovinom, istorija se prazni: „poništi” ne sme da vrati stare mere.
  const lockedProject = access.lock ? library.activeId : null
  useEffect(() => {
    if (lockedProject) replace(sceneRef.current)
  }, [lockedProject, replace])

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

  // Trenutni crtež se pamti u pregledaču posle svake izmene, sa nalogom ili bez njega.
  useEffect(() => {
    const handle = setTimeout(() => writeDraft({ scene, name: projectName, projectId: library.activeId }), 400)
    return () => clearTimeout(handle)
  }, [scene, projectName, library.activeId])

  // Prijava ili odjava iz zaglavlja ili sa profila.
  useEffect(() => {
    if (libraryOwner.current === userId) return
    if (userId) {
      refreshLibrary(userId).catch(() => setSaveError('Projekti sa naloga se ne mogu učitati.'))
      loadBilling(true)
      return
    }
    libraryOwner.current = null
    loadBilling(false)
    // Posle odjave sačuvan projekat ne ostaje otvoren na ovom računaru.
    const hadProject = Boolean(libraryRef.current.activeId)
    libraryRef.current = emptyLibrary()
    setLibrary(libraryRef.current)
    if (hadProject) {
      adoptIds(initialScene)
      replace(initialScene)
      setSelected(null)
      setProjectName('')
    }
    setSaveNotice(null)
    // refreshLibrary i replace su stabilni za ovaj nalog; efekat prati samo promenu prijave.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function refreshLibrary(owner) {
    libraryOwner.current = owner
    const loaded = await loadLibrary()
    const current = libraryRef.current
    const next = {
      projects: loaded.projects,
      activeId: loaded.projects.some((project) => project.id === current.activeId) ? current.activeId : null,
    }
    libraryRef.current = next
    setLibrary(next)
    return next
  }

  // Čuvanje, upit i kupovina traže nalog. Crtež ostaje isti dok se korisnik prijavljuje.
  async function ensureAccount(reason) {
    const user = readAccount().user ?? (await requireAccount(reason))
    if (!user) return false
    if (libraryOwner.current !== user.id) await refreshLibrary(user.id)
    return true
  }

  function storeLibrary(next) {
    const serial = ++saveSerial.current
    libraryRef.current = next
    setLibrary(next)
    // Bez naloga nema biblioteke na serveru; trenutni crtež je već u pregledaču.
    if (!libraryOwner.current) return Promise.resolve(false)
    return persistLibrary(next)
      .then(() => {
        if (serial !== saveSerial.current) return false
        setSaveError('')
        return true
      })
      .catch((error) => {
        if (serial === saveSerial.current) setSaveError(error.status === 401 ? 'Prijava je istekla. Prijavi se ponovo da sačuvaš izmene.' : 'Nije moguće sačuvati projekat. Proveri vezu sa serverom.')
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

  // Vraća sačuvan zapis, ili null ako korisnik nije hteo da se prijavi ili čuvanje nije uspelo.
  async function saveProject(reason = 'Projekti se čuvaju na nalogu. Prijavi se ili napravi nalog, a crtež ostaje kakav jeste.') {
    if (!(await ensureAccount(reason))) return null
    const updating = Boolean(libraryRef.current.activeId)
    const snap = snapshotProject()
    setProjectName(snap.record.name)
    const saved = await storeLibrary(snap.library)
    if (!saved) return null
    setSaveNotice({
      message: updating ? 'Izmene su sačuvane.' : 'Projekat je sačuvan na nalogu.',
      scene: snap.record.scene,
      name: snap.record.name,
    })
    return snap.record
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
      if (!window.confirm('Trenutni projekat nije sačuvan. Da li da ga zamenim ovim primerom?')) return
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

  function closeQuiz() {
    try {
      localStorage.setItem(QUIZ_KEY, '1')
    } catch {
      // Bez localStorage kviz se pokaže opet sledeći put.
    }
    setQuizOpen(false)
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

  // Deo scene koji je sam objekat (lokacija, krovni prozori) ili prost broj (jedinice u nizu).
  function updatePart(key, patch) {
    if (key === 'units' && lockRef.current) return
    apply(patch, (current) => ({ ...current, [key]: key === 'units' ? patch.units : { ...current[key], ...patch } }))
  }

  function updateCanopy(patch) {
    apply(patch, (current) => ({ ...current, canopy: { ...current.canopy, ...patch } }))
  }

  function updateElectric(patch) {
    apply(patch, (current) => ({ ...current, electric: { ...current.electric, ...patch } }))
  }

  function updateDimension(key, value) {
    // Paket „Uradi sam” zaključava osnovu. Visina ostaje slobodna.
    if (lockRef.current && key !== 'height') return
    transient((current) => {
      const dimensions = { ...current.dimensions, [key]: clampDimension(key, value) }
      const nextDoor = clampDoor(current.door?.width ? current.door : { ...current.door, ...defaultDoorSize(dimensions) }, dimensions)
      return {
        ...current,
        dimensions,
        windows: current.windows.map((item) => clampWindow(item, dimensions)),
        door: nextDoor,
        pedestrianDoors: (current.pedestrianDoors || []).map((item) => clampPedestrian(item, dimensions, nextDoor)),
        furniture: current.furniture.map((item) => clampFurniture(item, dimensions)),
        car: current.car ? clampCar(current.car, dimensions) : null,
        rooms: normalizeRooms(current.rooms, dimensions),
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
        item.id === id ? settleFurniture(current, item, clampFurniture({ ...item, ...patch }, current.dimensions)) : item,
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
      const leafless = next.style === 'none' || next.style === 'opening'
      if (leafless) next.motor = false
      let { doorMaterialId, doorColor } = current
      const spec = DOOR_MATERIALS.find((entry) => entry.id === doorMaterialId)
      if (!leafless && spec && !spec.styles.includes(next.style)) {
        const options = doorMaterialsFor(next.style)
        const light = spec.color && parseInt(spec.color.slice(1, 3), 16) > 200
        const match = options.find((entry) => light === parseInt(entry.color.slice(1, 3), 16) > 200) ?? options[0]
        doorMaterialId = match.id
        if (!match.tintable) doorColor = null
      }
      return { ...current, door: next, doorMaterialId, doorColor }
    })
  }

  function addRoom(kindId) {
    const kind = roomKind(kindId)
    const existing = sceneRef.current.rooms || []
    if (!freeCorner(existing) || existing.length >= MAX_ROOMS) return
    const id = createId('room')
    commit((current) => {
      const rooms = current.rooms || []
      const corner = freeCorner(rooms)
      if (!corner || rooms.length >= MAX_ROOMS) return current
      const next = [...rooms, { id, kind: kind.id, corner, width: kind.width, depth: kind.depth, doorSide: 'depth', doorOffset: 0.5 }]
      return { ...current, rooms: normalizeRooms(next, current.dimensions) }
    })
    setSelected({ kind: 'room', id })
  }

  function updateRoom(id, patch) {
    apply(patch, (current) => {
      const rooms = current.rooms || []
      // Ugao koji je već zauzet menja mesto sa ovom prostorijom.
      const swapped = patch.corner
        ? rooms.map((room) => (room.id !== id && room.corner === patch.corner ? { ...room, corner: rooms.find((entry) => entry.id === id)?.corner ?? room.corner } : room))
        : rooms
      const edited = swapped.map((room) => (room.id === id ? { ...room, ...patch } : room))
      // Prostorija koja se menja ima prednost: ostale se skupljaju oko nje.
      const ordered = [...edited.filter((room) => room.id === id), ...edited.filter((room) => room.id !== id)]
      const fitted = normalizeRooms(ordered, current.dimensions)
      return { ...current, rooms: edited.map((room) => fitted.find((entry) => entry.id === room.id)).filter(Boolean) }
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
          elevation: current.car?.elevation ?? 0,
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
      car: current.car ? settleCar(current, current.car, clampCar({ ...current.car, ...patch }, current.dimensions)) : null,
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
    } else if (target.kind === 'room') {
      commit((current) => ({
        ...current,
        rooms: (current.rooms || []).filter((item) => item.id !== target.id),
      }))
    } else if (target.kind === 'car') {
      removeCar()
      return
    } else {
      return
    }
    setSelected((current) => (current?.id === target.id ? null : current))
  }

  // Kupovina se vezuje za sačuvan projekat na nalogu, pa se projekat prvo čuva.
  async function buyDiy() {
    const record = await saveProject('Paket se vezuje za projekat na tvom nalogu. Prijavi se ili napravi nalog da nastaviš.')
    if (!record) return
    openCheckout(diyOrder({ projectId: record.id, projectName: record.name, dimensions: record.scene.dimensions, units: record.scene.units }))
  }

  async function unlockFromSubscription() {
    const record = await saveProject()
    if (!record) return
    unlockProject(record.id).catch((error) => setSaveError(error.message))
  }

  function openFromAccount(id) {
    openProject(id)
    navigate('/konfigurator')
  }

  const billing = {
    access,
    price: diyPrice(footprintArea(scene.dimensions, scene.units)),
    onBuyDiy: buyDiy,
    onUnlock: unlockFromSubscription,
  }

  const pages = ['/konfigurator', '/modeli', '/majstori', '/dozvole', '/cene', '/radionica', '/partner', '/admin', '/ponuda', '/paketi', '/nalog']

  return (
    <>
      {path === '/majstori' && (
        <CraftsmenPage
          scene={fullScene}
          projectName={projectNameOrDefault(projectName)}
          billing={billing}
          onSaveProject={() => saveProject('Upit ide uz projekat sačuvan na tvom nalogu. Tamo pratiš i odgovor majstora. Prijavi se ili napravi nalog.')}
        />
      )}
      {path === '/nalog' && <AccountPage projects={library.projects} activeProjectId={library.activeId} onOpenProject={openFromAccount} onDeleteProject={deleteProject} />}
      {resetMatch && <ResetPasswordPage token={resetMatch[1]} />}
      {path === '/paketi' && <PlansPage scene={fullScene} projectName={projectNameOrDefault(projectName)} billing={billing} />}
      {path === '/dozvole' && <PermitsPage />}
      {path === '/modeli' && <ModelsPage onStartFrom={startFrom} onQuiz={() => setQuizOpen(true)} />}
      {path === '/ponuda' && <OfferPage scene={fullScene} projectName={projectNameOrDefault(projectName)} estimate={estimate} catalog={catalog} billing={billing} />}
      {path === '/cene' && <PricesPage />}
      {path === '/radionica' && <WorkshopPage />}
      {path === '/partner' && <PartnerPage />}
      {path === '/admin' && <AdminPage />}
      {profileMatch && <ProfilePage key={path} kind={profileMatch[1] === 'firma' ? 'partner' : 'craftsman'} id={decodeURIComponent(profileMatch[2])} />}
      {!pages.includes(path) && !resetMatch && !profileMatch && <HomePage onStartFrom={startFrom} onQuiz={() => setQuizOpen(true)} />}
      {quizOpen && (
        <StartQuiz
          onClose={closeQuiz}
          onPick={(source, model) => {
            closeQuiz()
            recordModelView(model.id)
            startFrom(source)
          }}
        />
      )}
      {path === '/konfigurator' && (
        <div className="flex h-full flex-col md:flex-row">
          <ControlPanel
            scene={fullScene}
            estimate={estimate}
            quote={quote}
            total={total}
            catalog={catalog}
            onDimensionChange={updateDimension}
            onSceneChange={updateScene}
            onElectricChange={updateElectric}
            onCanopyChange={updateCanopy}
            onPartChange={updatePart}
            partners={partners}
            billing={billing}
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
            onAddRoom={addRoom}
            onChangeRoom={updateRoom}
            onRemove={removeItem}
            mobileOpen={panelOpen}
            onMobileOpenChange={setPanelOpen}
          />
          <main
            className="relative min-h-[40dvh] flex-1 md:min-h-0"
            onPointerDown={(event) => {
              if (panelOpen && event.target.tagName === 'CANVAS') setPanelOpen(false)
            }}
          >
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
              canopy={scene.canopy}
              car={scene.car}
              scene={fullScene}
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
