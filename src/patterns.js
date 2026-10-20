const PX_PER_METER = 220

const painters = {
  trapez: paintTrapez,
  sandwich: paintSandwich,
  brick: paintBrick,
  render: paintRender,
  block: paintBlock,
  plank: (ctx, w, h, spec) => paintPlanks(ctx, w, h, spec, false),
  'plank-vertical': (ctx, w, h, spec) => paintPlanks(ctx, w, h, spec, true),
  'metal-tile': paintMetalTile,
  'clay-tile': paintClayTile,
  'concrete-tile': paintConcreteTile,
  shingle: paintShingle,
  membrane: paintMembrane,
  wave: paintWave,
  sectional: paintSectional,
  roller: paintRoller,
}

export function createTileCanvas(spec) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(12, Math.round(spec.tile[0] * PX_PER_METER))
  canvas.height = Math.max(12, Math.round(spec.tile[1] * PX_PER_METER))
  const ctx = canvas.getContext('2d')
  const paint = painters[spec.pattern] ?? paintTrapez
  paint(ctx, canvas.width, canvas.height, spec)
  return canvas
}

export function drawSwatch(canvas, spec) {
  const ctx = canvas.getContext('2d')
  const tile = createTileCanvas(spec)
  const pattern = ctx.createPattern(tile, 'repeat')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = pattern
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}

function paintTrapez(ctx, w, h, spec) {
  const base = hexToRgb(spec.color)
  const gradient = ctx.createLinearGradient(0, 0, w, 0)
  const stops = [
    [0, 0.52],
    [0.14, 0.74],
    [0.32, 1.05],
    [0.46, 1.28],
    [0.58, 0.95],
    [0.74, 0.6],
    [0.88, 0.48],
    [1, 0.52],
  ]
  for (const [offset, factor] of stops) gradient.addColorStop(offset, rgb(shade(base, factor)))
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)
}

function paintSandwich(ctx, w, h, spec) {
  const base = hexToRgb(spec.color)
  ctx.fillStyle = rgb(base)
  ctx.fillRect(0, 0, w, h)
  const rib = Math.max(3, Math.round(h / 48))
  for (let y = 0; y < h; y += rib) {
    ctx.fillStyle = rgb(shade(base, (y / rib) % 2 === 0 ? 1.08 : 0.9))
    ctx.fillRect(0, y, w, 1)
  }
  ctx.fillStyle = rgb(shade(base, 0.72))
  ctx.fillRect(0, 0, w, 3)
  ctx.fillRect(0, h - 3, w, 3)
}

function paintBrick(ctx, w, h, spec) {
  paintCourses(ctx, w, h, spec, 2, 2, true)
}

function paintBlock(ctx, w, h, spec) {
  paintCourses(ctx, w, h, spec, 2, 2, false)
}

function paintCourses(ctx, w, h, spec, cols, rows, stagger) {
  ctx.fillStyle = spec.mortar
  ctx.fillRect(0, 0, w, h)
  const cellW = w / cols
  const cellH = h / rows
  const gapX = Math.max(2, cellW * 0.07)
  const gapY = Math.max(2, cellH * 0.1)
  const base = hexToRgb(spec.color)
  for (let row = 0; row < rows; row += 1) {
    const shift = stagger && row % 2 ? cellW / 2 : 0
    for (let col = -1; col <= cols; col += 1) {
      const tone = 0.9 + hash(col + 4, row + 2) * 0.16
      ctx.fillStyle = rgb(shade(base, tone))
      ctx.fillRect(col * cellW + shift + gapX / 2, row * cellH + gapY / 2, cellW - gapX, cellH - gapY)
    }
  }
}

function paintRender(ctx, w, h, spec) {
  const base = hexToRgb(spec.color)
  const image = ctx.createImageData(w, h)
  const data = image.data
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const scratch = Math.sin((x / w) * Math.PI * 2 * 28 + wave(x, w, 3))
      const grain = wave(x, w, 11) * wave(y, h, 7)
      const factor = 0.9 + scratch * 0.07 + grain * 0.05
      const color = shade(base, factor)
      const index = (y * w + x) * 4
      data[index] = color[0]
      data[index + 1] = color[1]
      data[index + 2] = color[2]
      data[index + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
}

function paintPlanks(ctx, w, h, spec, vertical) {
  const count = 4
  const span = vertical ? w : h
  const size = span / count
  const base = hexToRgb(spec.color)
  ctx.fillStyle = '#5c4632'
  ctx.fillRect(0, 0, w, h)
  for (let index = 0; index < count; index += 1) {
    const tone = 0.78 + hash(index, vertical ? 3 : 8) * 0.36
    ctx.fillStyle = rgb(shade(base, tone))
    if (vertical) ctx.fillRect(index * size, 0, size - 2, h)
    else ctx.fillRect(0, index * size, w, size - 2)
    ctx.fillStyle = 'rgba(70, 42, 22, 0.18)'
    for (let line = 4; line < (vertical ? h : w); line += 7) {
      const jitter = hash(index, line) * 4
      if (vertical) ctx.fillRect(index * size + 3 + jitter, line, 1, 5)
      else ctx.fillRect(line, index * size + 3 + jitter, 8, 1)
    }
  }
}

function paintMetalTile(ctx, w, h, spec) {
  paintTiles(ctx, w, h, spec, 2, 2, (x, y, tw, th, color) => {
    ctx.fillStyle = color
    ctx.fillRect(x + 1, y + 1, tw - 2, th - 2)
    ctx.fillStyle = 'rgba(255,255,255,0.16)'
    ctx.fillRect(x + 2, y + 2, tw - 4, th * 0.18)
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    ctx.fillRect(x + 2, y + th * 0.78, tw - 4, th * 0.16)
  })
}

function paintClayTile(ctx, w, h, spec) {
  paintTiles(ctx, w, h, spec, 2, 2, (x, y, tw, th, color) => {
    const radius = Math.min(tw, th) * 0.18
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(x + 1, y + 1, tw - 2, th - 2, [radius, radius, 2, 2])
    ctx.fill()
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.fillRect(x + tw * 0.12, y + th * 0.72, tw * 0.76, Math.max(2, th * 0.12))
  })
}

function paintConcreteTile(ctx, w, h, spec) {
  paintTiles(ctx, w, h, spec, 2, 1, (x, y, tw, th, color) => {
    ctx.fillStyle = color
    ctx.fillRect(x + 1, y + 1, tw - 2, th - 2)
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.fillRect(x + 3, y + 3, tw * 0.35, th - 6)
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.fillRect(x + 2, y + th - 5, tw - 4, 3)
  })
}

function paintTiles(ctx, w, h, spec, cols, rows, draw) {
  ctx.fillStyle = '#6d6258'
  ctx.fillRect(0, 0, w, h)
  const cellW = w / cols
  const cellH = h / rows
  const base = hexToRgb(spec.color)
  for (let row = 0; row < rows; row += 1) {
    const shift = row % 2 ? cellW / 2 : 0
    for (let col = -1; col <= cols; col += 1) {
      const tone = 0.92 + hash(col + 1, row + 6) * 0.14
      draw(col * cellW + shift, row * cellH, cellW, cellH, rgb(shade(base, tone)))
    }
  }
}

function paintShingle(ctx, w, h, spec) {
  ctx.fillStyle = '#242220'
  ctx.fillRect(0, 0, w, h)
  const base = hexToRgb(spec.color)
  const cols = 3
  const rows = 2
  const cellW = w / cols
  const cellH = h / rows
  for (let row = 0; row < rows; row += 1) {
    const shift = row % 2 ? cellW / 2 : 0
    for (let col = -1; col <= cols; col += 1) {
      const x = col * cellW + shift
      const y = row * cellH
      ctx.fillStyle = rgb(shade(base, 0.86 + hash(col, row) * 0.28))
      ctx.fillRect(x + 1, y + 1, cellW - 3, cellH - 3)
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.fillRect(x + 1, y + cellH - 4, cellW - 3, 2)
    }
  }
  grainFill(ctx, w, h, 0.08)
}

function paintMembrane(ctx, w, h, spec) {
  const base = hexToRgb(spec.color)
  const image = ctx.createImageData(w, h)
  const data = image.data
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const grain = wave(x, w, 23) * wave(y, h, 19)
      const color = shade(base, 0.85 + grain * 0.3)
      const index = (y * w + x) * 4
      data[index] = color[0]
      data[index + 1] = color[1]
      data[index + 2] = color[2]
      data[index + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fillRect(0, 0, w, 3)
  ctx.fillRect(0, 0, 3, h)
}

function paintWave(ctx, w, h, spec) {
  const base = hexToRgb(spec.color)
  const image = ctx.createImageData(w, h)
  const data = image.data
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const waveValue = Math.sin((x / w) * Math.PI * 2)
      const color = shade(base, 0.62 + (waveValue * 0.5 + 0.5) * 0.7)
      const index = (y * w + x) * 4
      data[index] = color[0]
      data[index + 1] = color[1]
      data[index + 2] = color[2]
      data[index + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
}

function paintSectional(ctx, w, h, spec) {
  const base = hexToRgb(spec.color)
  const gradient = ctx.createLinearGradient(0, 0, 0, h)
  gradient.addColorStop(0, rgb(shade(base, 1.16)))
  gradient.addColorStop(0.12, rgb(shade(base, 1.02)))
  gradient.addColorStop(0.78, rgb(base))
  gradient.addColorStop(1, rgb(shade(base, 0.62)))
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = rgb(shade(base, 0.45))
  ctx.fillRect(0, h - 4, w, 4)
}

function paintRoller(ctx, w, h, spec) {
  const base = hexToRgb(spec.color)
  const gradient = ctx.createLinearGradient(0, 0, 0, h)
  gradient.addColorStop(0, rgb(shade(base, 0.55)))
  gradient.addColorStop(0.35, rgb(shade(base, 1.2)))
  gradient.addColorStop(0.7, rgb(base))
  gradient.addColorStop(1, rgb(shade(base, 0.5)))
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)
}

function grainFill(ctx, w, h, alpha) {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`
  for (let i = 0; i < 80; i += 1) {
    const x = Math.floor(hash(i, 1) * w)
    const y = Math.floor(hash(i, 2) * h)
    ctx.fillRect(x, y, 2, 1)
  }
}

function wave(position, size, bands) {
  return Math.sin((position / size) * Math.PI * 2 * bands)
}

function hash(x, y) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return value - Math.floor(value)
}

function hexToRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}

function shade(color, factor) {
  return color.map((channel) => Math.max(0, Math.min(255, Math.round(channel * factor))))
}

function rgb(color) {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`
}
