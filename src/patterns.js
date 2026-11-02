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
  'trapez-wood': paintTrapezWood,
  'facade-panel': paintFacadePanel,
  stucco: paintStucco,
  stone: paintStone,
  slats: paintSlats,
  osb: paintOsb,
  'standing-seam': paintStandingSeam,
  sedum: paintSedum,
  'sectional-ribbed': paintSectionalRibbed,
  'sectional-wood': paintSectionalWood,
  cassette: paintCassette,
  chevron: paintChevron,
  concrete: paintConcrete,
  epoxy: paintEpoxy,
  flake: paintFlake,
  'floor-tiles': paintFloorTiles,
  ceramic: paintCeramic,
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

function paintTrapezWood(ctx, w, h, spec) {
  paintWoodGrain(ctx, w, h, spec, true)
  const shadow = ctx.createLinearGradient(0, 0, w, 0)
  const stops = [
    [0, 0.42],
    [0.14, 0.18],
    [0.32, 0],
    [0.46, 0],
    [0.58, 0.1],
    [0.74, 0.32],
    [0.88, 0.46],
    [1, 0.42],
  ]
  for (const [offset, alpha] of stops) shadow.addColorStop(offset, `rgba(0,0,0,${alpha})`)
  ctx.fillStyle = shadow
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = 'rgba(255,255,255,0.1)'
  ctx.fillRect(w * 0.36, 0, w * 0.08, h)
}

function paintWoodGrain(ctx, w, h, spec, vertical) {
  const base = hexToRgb(spec.color)
  ctx.fillStyle = rgb(base)
  ctx.fillRect(0, 0, w, h)
  const lines = 26
  for (let index = 0; index < lines; index += 1) {
    const offset = hash(index, 5) * (vertical ? w : h)
    const tone = 0.72 + hash(index, 9) * 0.4
    ctx.strokeStyle = rgb(shade(base, tone))
    ctx.lineWidth = 1 + hash(index, 3) * 2
    ctx.beginPath()
    const span = vertical ? h : w
    for (let step = 0; step <= span; step += 6) {
      const sway = Math.sin(step / (18 + index) + index) * 2.5
      if (vertical) ctx.lineTo(offset + sway, step)
      else ctx.lineTo(step, offset + sway)
    }
    ctx.stroke()
  }
}

function paintFacadePanel(ctx, w, h, spec) {
  const base = hexToRgb(spec.color)
  ctx.fillStyle = rgb(base)
  ctx.fillRect(0, 0, w, h)
  for (let y = 0; y < h; y += 2) {
    ctx.fillStyle = `rgba(255,255,255,${0.015 + hash(y, 4) * 0.02})`
    ctx.fillRect(0, y, w, 1)
  }
  ctx.fillStyle = rgb(shade(base, 0.45))
  ctx.fillRect(0, h - 4, w, 4)
  ctx.fillStyle = rgb(shade(base, 1.25))
  ctx.fillRect(0, h - 5, w, 1)
}

function paintStucco(ctx, w, h, spec) {
  const base = hexToRgb(spec.color)
  const image = ctx.createImageData(w, h)
  const data = image.data
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const noise = hash(x * 1.7, y * 2.3)
      const factor = 0.93 + noise * 0.1
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

function paintStone(ctx, w, h, spec) {
  ctx.fillStyle = spec.mortar
  ctx.fillRect(0, 0, w, h)
  const base = hexToRgb(spec.color)
  const rows = 4
  const rowH = h / rows
  for (let row = 0; row < rows; row += 1) {
    let x = -hash(row, 1) * 30
    let col = 0
    while (x < w) {
      const stoneW = 40 + hash(row, col) * 70
      const tone = 0.78 + hash(col + 3, row + 11) * 0.4
      ctx.fillStyle = rgb(shade(base, tone))
      ctx.beginPath()
      const top = row * rowH + 3 + hash(col, row + 2) * 4
      const bottom = (row + 1) * rowH - 3 - hash(col + 1, row) * 4
      ctx.moveTo(x + 4, top)
      ctx.lineTo(x + stoneW - 4, top + hash(col, 7) * 5)
      ctx.lineTo(x + stoneW - 2, bottom)
      ctx.lineTo(x + 2, bottom - hash(col, 8) * 5)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.fillRect(x + 6, top + 2, stoneW * 0.5, 3)
      x += stoneW
      col += 1
    }
  }
  // šav na ivicama tile-a da se ne vidi rez
  ctx.fillStyle = spec.mortar
  ctx.fillRect(0, 0, 3, h)
}

function paintSlats(ctx, w, h, spec) {
  ctx.fillStyle = '#1d1b1a'
  ctx.fillRect(0, 0, w, h)
  const base = hexToRgb(spec.color)
  const count = 6
  const size = w / count
  for (let index = 0; index < count; index += 1) {
    const tone = 0.88 + hash(index, 2) * 0.2
    const gradient = ctx.createLinearGradient(index * size, 0, index * size + size, 0)
    gradient.addColorStop(0, rgb(shade(base, tone * 0.8)))
    gradient.addColorStop(0.4, rgb(shade(base, tone * 1.08)))
    gradient.addColorStop(1, rgb(shade(base, tone * 0.85)))
    ctx.fillStyle = gradient
    ctx.fillRect(index * size + 3, 0, size - 6, h)
  }
}

function paintOsb(ctx, w, h, spec) {
  const base = hexToRgb(spec.color)
  ctx.fillStyle = rgb(base)
  ctx.fillRect(0, 0, w, h)
  for (let index = 0; index < 900; index += 1) {
    const x = hash(index, 1) * w
    const y = hash(index, 2) * h
    const length = 8 + hash(index, 3) * 26
    const width = 3 + hash(index, 4) * 6
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(hash(index, 5) * Math.PI)
    ctx.fillStyle = rgb(shade(base, 0.72 + hash(index, 6) * 0.5))
    ctx.fillRect(-length / 2, -width / 2, length, width)
    ctx.restore()
  }
  ctx.fillStyle = 'rgba(60,40,20,0.35)'
  ctx.fillRect(0, 0, w, 2)
  ctx.fillRect(0, 0, 2, h)
}

function paintStandingSeam(ctx, w, h, spec) {
  const base = hexToRgb(spec.color)
  const gradient = ctx.createLinearGradient(0, 0, w, 0)
  gradient.addColorStop(0, rgb(shade(base, 0.98)))
  gradient.addColorStop(0.5, rgb(shade(base, 1.05)))
  gradient.addColorStop(1, rgb(shade(base, 0.96)))
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = rgb(shade(base, 0.5))
  ctx.fillRect(w - 6, 0, 3, h)
  ctx.fillStyle = rgb(shade(base, 1.4))
  ctx.fillRect(w - 3, 0, 3, h)
}

function paintSedum(ctx, w, h, spec) {
  const base = hexToRgb(spec.color)
  ctx.fillStyle = rgb(shade(base, 0.7))
  ctx.fillRect(0, 0, w, h)
  const tints = [
    [0.9, 1, 0.8],
    [1.15, 1.1, 0.7],
    [1.2, 0.85, 0.75],
    [0.8, 0.95, 0.9],
  ]
  for (let index = 0; index < 2400; index += 1) {
    const x = hash(index, 11) * w
    const y = hash(index, 12) * h
    const tint = tints[Math.floor(hash(index, 13) * tints.length)]
    const factor = 0.8 + hash(index, 14) * 0.5
    ctx.fillStyle = rgb(base.map((channel, k) => Math.min(255, Math.round(channel * tint[k] * factor))))
    ctx.beginPath()
    ctx.arc(x, y, 1.5 + hash(index, 15) * 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
}

function paintSectionalRibbed(ctx, w, h, spec) {
  paintSectional(ctx, w, h, spec)
  const base = hexToRgb(spec.color)
  ctx.fillStyle = rgb(shade(base, 0.7))
  ctx.fillRect(0, h * 0.48, w, 2)
  ctx.fillStyle = rgb(shade(base, 1.2))
  ctx.fillRect(0, h * 0.48 + 2, w, 1)
}

function paintSectionalWood(ctx, w, h, spec) {
  paintWoodGrain(ctx, w, h, spec, false)
  const base = hexToRgb(spec.color)
  ctx.fillStyle = rgb(shade(base, 0.45))
  ctx.fillRect(0, h - 4, w, 4)
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.fillRect(0, 0, w, 3)
}

function paintCassette(ctx, w, h, spec) {
  const base = hexToRgb(spec.color)
  ctx.fillStyle = rgb(base)
  ctx.fillRect(0, 0, w, h)
  const inset = Math.min(w, h) * 0.16
  ctx.fillStyle = rgb(shade(base, 0.82))
  ctx.fillRect(inset, inset, w - inset * 2, 3)
  ctx.fillRect(inset, inset, 3, h - inset * 2)
  ctx.fillStyle = rgb(shade(base, 1.08))
  ctx.fillRect(inset, h - inset - 3, w - inset * 2, 3)
  ctx.fillRect(w - inset - 3, inset, 3, h - inset * 2)
  ctx.fillStyle = rgb(shade(base, 0.55))
  ctx.fillRect(0, h - 4, w, 4)
}

function paintChevron(ctx, w, h, spec) {
  const base = hexToRgb(spec.color)
  ctx.fillStyle = '#4a3422'
  ctx.fillRect(0, 0, w, h)
  const boards = 8
  const step = h / boards
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, w / 2, h)
  ctx.clip()
  for (let index = -boards; index < boards * 2; index += 1) {
    ctx.fillStyle = rgb(shade(base, 0.82 + hash(index, 1) * 0.3))
    ctx.beginPath()
    ctx.moveTo(0, index * step)
    ctx.lineTo(w / 2, index * step - w / 2)
    ctx.lineTo(w / 2, index * step - w / 2 + step - 2)
    ctx.lineTo(0, index * step + step - 2)
    ctx.fill()
  }
  ctx.restore()
  ctx.save()
  ctx.beginPath()
  ctx.rect(w / 2, 0, w / 2, h)
  ctx.clip()
  for (let index = -boards; index < boards * 2; index += 1) {
    ctx.fillStyle = rgb(shade(base, 0.82 + hash(index, 2) * 0.3))
    ctx.beginPath()
    ctx.moveTo(w / 2, index * step - w / 2)
    ctx.lineTo(w, index * step)
    ctx.lineTo(w, index * step + step - 2)
    ctx.lineTo(w / 2, index * step - w / 2 + step - 2)
    ctx.fill()
  }
  ctx.restore()
  ctx.fillStyle = '#3a291b'
  ctx.fillRect(w / 2 - 1, 0, 2, h)
}

function paintConcrete(ctx, w, h, spec) {
  const base = hexToRgb(spec.color)
  const image = ctx.createImageData(w, h)
  const data = image.data
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const cloud = (wave(x, w, 2) + wave(y, h, 3)) * 0.02
      const factor = 0.95 + hash(x, y) * 0.07 + cloud
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

function paintEpoxy(ctx, w, h, spec) {
  const base = hexToRgb(spec.color)
  const gradient = ctx.createLinearGradient(0, 0, w, h)
  gradient.addColorStop(0, rgb(shade(base, 1.04)))
  gradient.addColorStop(0.5, rgb(base))
  gradient.addColorStop(1, rgb(shade(base, 0.97)))
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)
}

function paintFlake(ctx, w, h, spec) {
  paintEpoxy(ctx, w, h, spec)
  const palette = ['#e9e6df', '#2b2d30', '#9aa1a6', '#c7c1b5', '#555a5e']
  for (let index = 0; index < 700; index += 1) {
    ctx.fillStyle = palette[Math.floor(hash(index, 21) * palette.length)]
    const size = 1.5 + hash(index, 22) * 2.5
    ctx.fillRect(hash(index, 23) * w, hash(index, 24) * h, size, size * 0.7)
  }
}

function paintFloorTiles(ctx, w, h, spec) {
  const base = hexToRgb(spec.color)
  ctx.fillStyle = rgb(shade(base, 0.6))
  ctx.fillRect(0, 0, w, h)
  const half = w / 2
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      ctx.fillStyle = rgb(shade(base, (row + col) % 2 === 0 ? 1 : 1.12))
      ctx.fillRect(col * half + 1, row * half + 1, half - 2, half - 2)
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      for (let dot = 0; dot < 4; dot += 1) {
        for (let k = 0; k < 4; k += 1) {
          ctx.fillRect(col * half + half * (0.15 + dot * 0.23), row * half + half * (0.15 + k * 0.23), 4, 4)
        }
      }
    }
  }
}

function paintCeramic(ctx, w, h, spec) {
  paintCourses(ctx, w, h, spec, 2, 2, false)
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
