import * as THREE from 'three'

// Objekat u dvorištu kroz kameru telefona, u pravoj veličini.
// Android (Chrome): WebXR sa prepoznavanjem tla. iPhone (Safari): Quick Look sa USDZ fajlom.

export async function arSupport() {
  if (typeof document === 'undefined') return null
  const link = document.createElement('a')
  if (link.relList?.supports?.('ar')) return 'quicklook'
  if (navigator.xr?.isSessionSupported) {
    const ok = await navigator.xr.isSessionSupported('immersive-ar').catch(() => false)
    if (ok) return 'webxr'
  }
  return null
}

// Kopija objekta bez opreme, pomoćnih okvira i nevidljivih delova.
export function buildingCopy(source) {
  const copy = source.clone(true)
  const drop = []
  copy.traverse((child) => {
    if (!child.visible) drop.push(child)
    else if (child.isMesh && child.material?.wireframe) drop.push(child)
  })
  drop.forEach((child) => child.parent?.remove(child))
  copy.position.set(0, 0, 0)
  return copy
}

export async function openQuickLook(source) {
  const { USDZExporter } = await import('three/examples/jsm/exporters/USDZExporter.js')
  const data = await new USDZExporter().parseAsync(buildingCopy(source))
  const url = URL.createObjectURL(new Blob([data], { type: 'model/vnd.usdz+zip' }))
  const link = document.createElement('a')
  link.rel = 'ar'
  link.href = url
  link.appendChild(document.createElement('img'))
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

// Visina telefona iznad tla dok se ne prepozna pravo tlo.
const PHONE_HEIGHT = 1.4
const YELLOW = 0xf5b800

// Providan objekat dok se bira mesto, pun kad se postavi. Materijali su kopije, pa 3D prikaz na strani ostaje isti.
function ownMaterials(root) {
  root.traverse((child) => {
    if (!child.isMesh) return
    child.material = Array.isArray(child.material) ? child.material.map((m) => m.clone()) : child.material.clone()
    for (const m of [child.material].flat()) m.userData.base = { transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite }
  })
}

function setGhost(root, ghost) {
  root.traverse((child) => {
    if (!child.isMesh) return
    for (const m of [child.material].flat()) {
      const base = m.userData.base
      m.transparent = ghost || base.transparent
      m.opacity = ghost ? Math.min(base.opacity, 0.55) : base.opacity
      m.depthWrite = ghost ? false : base.depthWrite
      m.needsUpdate = true
    }
  })
}

// WebXR sesija: krug pokazuje mesto na tlu, prvi dodir je prvi ugao prednje strane,
// drugi dodir određuje pravac prednje strane. Objekat staje iza te linije, dalje od korisnika.
export async function startWebXR(source, overlay, { onState, onEnd } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.xr.enabled = true
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.domElement.style.cssText = 'position:fixed;inset:0;z-index:60'
  document.body.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9670, 1.6))
  const sun = new THREE.DirectionalLight(0xffffff, 1.6)
  sun.position.set(6, 12, 4)
  scene.add(sun)
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 200)

  // Objekat pomeren tako da je levi ugao prednje strane u nuli, prednja strana duž +x, objekat ide u -z.
  const building = buildingCopy(source)
  ownMaterials(building)
  const box = new THREE.Box3().setFromObject(building)
  const width = box.max.x - box.min.x
  building.position.set(-box.min.x, 0, -box.max.z)
  const pivot = new THREE.Group()
  pivot.add(building)
  pivot.visible = false
  scene.add(pivot)
  setGhost(building, true)

  const reticleMaterial = new THREE.MeshBasicMaterial({ color: YELLOW, transparent: true, depthTest: false })
  const reticle = new THREE.Group()
  reticle.add(new THREE.Mesh(new THREE.RingGeometry(0.16, 0.22, 40).rotateX(-Math.PI / 2), reticleMaterial))
  reticle.add(new THREE.Mesh(new THREE.CircleGeometry(0.035, 20).rotateX(-Math.PI / 2), reticleMaterial))
  reticle.visible = false
  reticle.renderOrder = 10
  scene.add(reticle)

  const markMaterial = new THREE.MeshBasicMaterial({ color: YELLOW, depthTest: false })
  const corner = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 24), markMaterial)
  const cornerEnd = corner.clone()
  const edge = new THREE.Mesh(new THREE.BoxGeometry(1, 0.015, 0.05), markMaterial)
  for (const mark of [corner, cornerEnd, edge]) {
    mark.visible = false
    mark.renderOrder = 11
    scene.add(mark)
  }

  let session
  try {
    session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay', 'anchors'],
      domOverlay: overlay ? { root: overlay } : undefined,
    })
  } catch (error) {
    renderer.dispose()
    renderer.domElement.remove()
    throw error
  }
  renderer.xr.setReferenceSpaceType('local')
  await renderer.xr.setSession(session)
  const viewer = await session.requestReferenceSpace('viewer')
  const hitSource = await session.requestHitTestSource({ space: viewer })

  // Dodir na dugme u sloju preko kamere ne sme da postavi objekat.
  const guard = (event) => {
    if (event.target?.closest?.('button')) event.preventDefault()
  }
  overlay?.addEventListener('beforexrselect', guard)

  let phase = 'first'
  let floorY = null
  let found = false
  let aimOk = false
  let anchor = null
  let lastState = ''
  const aim = new THREE.Vector3()
  const target = new THREE.Vector3()
  const first = new THREE.Vector3()
  const camPos = new THREE.Vector3()
  const forward = new THREE.Vector3()
  const quat = new THREE.Quaternion()
  const matrix = new THREE.Matrix4()
  const up = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const toCam = new THREE.Vector3()

  function emit() {
    const state = { phase, found, aimOk, width }
    const key = `${phase}|${found}|${aimOk}`
    if (key !== lastState) {
      lastState = key
      onState?.(state)
    }
  }

  // Objekat od prvog ugla prema krugu: prednja strana je duž te linije, a objekat ide dalje od korisnika.
  function layout() {
    dir.set(aim.x - first.x, 0, aim.z - first.z)
    if (dir.lengthSq() < 0.04) return false
    dir.normalize()
    let yaw = Math.atan2(-dir.z, dir.x)
    pivot.position.copy(first)
    toCam.set(camPos.x - first.x, 0, camPos.z - first.z)
    if (Math.sin(yaw) * toCam.x + Math.cos(yaw) * toCam.z < 0) {
      yaw += Math.PI
      pivot.position.addScaledVector(dir, width)
    }
    pivot.rotation.set(0, yaw, 0)
    edge.position.copy(first).addScaledVector(dir, width / 2)
    edge.rotation.set(0, Math.atan2(-dir.z, dir.x), 0)
    edge.scale.set(width, 1, 1)
    cornerEnd.position.copy(first).addScaledVector(dir, width)
    return true
  }

  function freeAnchor() {
    anchor?.delete?.()
    anchor = null
    pivot.matrixAutoUpdate = true
  }

  session.addEventListener('select', (event) => {
    if (phase === 'first' && aimOk) {
      first.copy(aim)
      corner.position.copy(first)
      corner.visible = true
      phase = 'second'
    } else if (phase === 'second' && aimOk && layout()) {
      setGhost(building, false)
      phase = 'placed'
      reticle.visible = edge.visible = cornerEnd.visible = false
      // Sidro drži objekat na mestu dok telefon bolje upoznaje prostor.
      const ref = renderer.xr.getReferenceSpace()
      if (event.frame?.createAnchor && ref) {
        pivot.updateMatrix()
        const p = pivot.position
        const q = pivot.quaternion
        event.frame
          .createAnchor(new XRRigidTransform({ x: p.x, y: p.y, z: p.z }, { x: q.x, y: q.y, z: q.z, w: q.w }), ref)
          .then((created) => {
            if (phase === 'placed') anchor = created
            else created.delete?.()
          })
          .catch(() => {})
      }
    }
    emit()
  })

  renderer.setAnimationLoop((time, frame) => {
    const ref = renderer.xr.getReferenceSpace()
    const pose = frame && ref ? frame.getViewerPose(ref) : null
    if (pose) {
      const { position: p, orientation: o } = pose.transform
      camPos.set(p.x, p.y, p.z)
      quat.set(o.x, o.y, o.z, o.w)
      forward.set(0, 0, -1).applyQuaternion(quat)
      if (floorY === null) floorY = p.y - PHONE_HEIGHT

      // Pravo tlo: samo vodoravne površine dovoljno ispod telefona, ne zid ni sto.
      let hit = null
      for (const result of frame.getHitTestResults(hitSource)) {
        const hitPose = result.getPose(ref)
        if (!hitPose) continue
        matrix.fromArray(hitPose.transform.matrix)
        up.setFromMatrixColumn(matrix, 1)
        if (up.y < 0.9) continue
        target.setFromMatrixPosition(matrix)
        if (target.y > p.y - 0.8) continue
        hit = target
        break
      }
      let ok = false
      if (hit) {
        floorY = found ? THREE.MathUtils.lerp(floorY, hit.y, 0.1) : hit.y
        found = true
        ok = true
      } else if (forward.y < -0.08) {
        // Tlo nije prepoznato u ovom kadru: krug ide na procenjeno tlo, tamo gde telefon gleda.
        const t = (floorY - p.y) / forward.y
        if (t > 0 && t < 40) {
          target.copy(camPos).addScaledVector(forward, t)
          ok = true
        }
      }
      if (ok) {
        target.y = floorY
        if (aimOk) aim.lerp(target, 0.35)
        else aim.copy(target)
      }
      aimOk = ok

      if (phase !== 'placed') {
        reticle.visible = aimOk
        reticle.position.copy(aim)
        reticleMaterial.opacity = found ? 1 : 0.6
        reticleMaterial.color.set(found ? YELLOW : 0xffffff)
      }
      if (phase === 'second') {
        const shown = aimOk && layout()
        pivot.visible = edge.visible = cornerEnd.visible = shown
      } else if (phase === 'first') {
        pivot.visible = false
      }
      if (phase === 'placed' && anchor) {
        const anchorPose = frame.getPose(anchor.anchorSpace, ref)
        if (anchorPose) {
          pivot.matrixAutoUpdate = false
          pivot.matrix.fromArray(anchorPose.transform.matrix)
        }
      }
      emit()
    }
    renderer.render(scene, camera)
  })

  session.addEventListener('end', () => {
    overlay?.removeEventListener('beforexrselect', guard)
    freeAnchor()
    hitSource.cancel?.()
    renderer.setAnimationLoop(null)
    renderer.dispose()
    renderer.domElement.remove()
    onEnd?.()
  })

  return {
    width,
    reset() {
      freeAnchor()
      phase = 'first'
      setGhost(building, true)
      pivot.visible = corner.visible = edge.visible = cornerEnd.visible = false
      emit()
    },
    end() {
      session.end().catch(() => {})
    },
  }
}
