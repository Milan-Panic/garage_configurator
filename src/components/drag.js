import { useEffect, useLayoutEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

export function usePlaneDrag(onDrag, onGestureEnd) {
  const { camera, gl, controls } = useThree()
  const drag = useRef(null)
  const onDragRef = useRef(onDrag)
  const endRef = useRef(onGestureEnd)
  const controlsRef = useRef(controls)

  useLayoutEffect(() => {
    onDragRef.current = onDrag
    endRef.current = onGestureEnd
    controlsRef.current = controls
  })

  useEffect(() => {
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const hit = new THREE.Vector3()
    const element = gl.domElement

    function intersect(event, plane) {
      const rect = element.getBoundingClientRect()
      ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(ndc, camera)
      return raycaster.ray.intersectPlane(plane, hit) ? hit.clone() : null
    }

    function onPointerMove(event) {
      const current = drag.current
      if (!current) return
      const point = intersect(event, current.plane)
      if (!point) return
      onDragRef.current(point, current.start, current.extra)
    }

    function onPointerUp() {
      if (!drag.current) return
      drag.current = null
      if (controlsRef.current) controlsRef.current.enabled = true
      element.style.cursor = 'auto'
      endRef.current?.()
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      if (controlsRef.current) controlsRef.current.enabled = true
    }
  }, [camera, gl])

  function startDrag(event, plane, extra) {
    event.stopPropagation()
    const hit = new THREE.Vector3()
    if (!event.ray?.intersectPlane(plane, hit)) return
    if (controlsRef.current) controlsRef.current.enabled = false
    gl.domElement.style.cursor = 'grabbing'
    drag.current = { plane, start: hit.clone(), extra }
  }

  return { startDrag }
}
