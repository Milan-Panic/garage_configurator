import { useCallback, useRef, useState } from 'react'

const HISTORY_LIMIT = 50

function sameScene(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function useHistory(initialScene) {
  const [history, setHistory] = useState({ past: [], present: initialScene, future: [] })
  const transacting = useRef(false)

  const commit = useCallback((recipe) => {
    transacting.current = false
    setHistory((current) => {
      const next = recipe(current.present)
      if (sameScene(next, current.present)) return current
      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: next,
        future: [],
      }
    })
  }, [])

  const transient = useCallback((recipe) => {
    const recording = !transacting.current
    transacting.current = true
    setHistory((current) => {
      const next = recipe(current.present)
      if (sameScene(next, current.present)) return current
      if (!recording) return { ...current, present: next }
      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: next,
        future: [],
      }
    })
  }, [])

  const endGesture = useCallback(() => {
    transacting.current = false
  }, [])

  const undo = useCallback(() => {
    transacting.current = false
    setHistory((current) => {
      if (current.past.length === 0) return current
      const previous = current.past[current.past.length - 1]
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      }
    })
  }, [])

  const redo = useCallback(() => {
    transacting.current = false
    setHistory((current) => {
      if (current.future.length === 0) return current
      const [next, ...future] = current.future
      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: next,
        future,
      }
    })
  }, [])

  const replace = useCallback((scene) => {
    transacting.current = false
    setHistory({ past: [], present: scene, future: [] })
  }, [])

  return {
    scene: history.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    commit,
    transient,
    endGesture,
    undo,
    redo,
    replace,
  }
}
