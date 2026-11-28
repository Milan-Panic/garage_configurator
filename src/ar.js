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

// WebXR sesija u posebnom rendereru: prsten pokazuje tlo, dodir postavlja objekat.
export async function startWebXR(source, overlay, { onPlaced, onEnd } = {}) {
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

  const model = buildingCopy(source)
  model.visible = false
  scene.add(model)

  const reticle = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf5b800 }))
  reticle.matrixAutoUpdate = false
  reticle.visible = false
  scene.add(reticle)

  let session
  try {
    session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
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

  session.addEventListener('select', () => {
    if (!reticle.visible) return
    model.position.setFromMatrixPosition(reticle.matrix)
    model.visible = true
    onPlaced?.()
  })

  renderer.setAnimationLoop((time, frame) => {
    if (frame) {
      const hits = frame.getHitTestResults(hitSource)
      if (hits.length) {
        const pose = hits[0].getPose(renderer.xr.getReferenceSpace())
        reticle.visible = Boolean(pose)
        if (pose) reticle.matrix.fromArray(pose.transform.matrix)
      } else reticle.visible = false
    }
    renderer.render(scene, camera)
  })

  session.addEventListener('end', () => {
    hitSource.cancel?.()
    renderer.setAnimationLoop(null)
    renderer.dispose()
    renderer.domElement.remove()
    onEnd?.()
  })

  return {
    rotate(step) {
      model.rotation.y += step
    },
    end() {
      session.end().catch(() => {})
    },
  }
}
