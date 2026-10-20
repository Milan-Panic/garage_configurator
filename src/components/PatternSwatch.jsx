import { useEffect, useRef } from 'react'
import { drawSwatch } from '../patterns'

export function PatternSwatch({ spec }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawSwatch(canvas, spec)
  }, [spec])

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={72}
      className="h-9 w-full rounded-md border border-black/10"
    />
  )
}
