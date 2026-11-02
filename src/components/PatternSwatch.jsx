import { useEffect, useRef } from 'react'
import { drawSwatch } from '../patterns'

export function PatternSwatch({ spec, width = 640, height = 72, className = 'h-9 w-full rounded-md border border-black/10' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawSwatch(canvas, spec)
  }, [spec])

  return <canvas ref={canvasRef} width={width} height={height} className={className} aria-hidden="true" />
}
