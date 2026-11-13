import { useId } from 'react'
import { canopyShift, canopySpan } from '../buildings'
import { carRect, furnitureRect } from '../collide'
import { FLOOR_LEVEL, PANEL_THICKNESS, ROOF_OVERHANG, ROOF_THICKNESS } from '../config'
import { WALL_IDS, wallFrame } from '../layout'
import { roofGeometry } from '../roof'
import { roomBox, roomKind } from '../rooms'
import { openingsByWall, structureFrame, wallLength } from '../structure'

const INK = '#1c1917'
const MID = '#57534e'
const SOFT = '#a8a29e'
const FAINT = '#d6d3d1'
const PAPER = '#fffdf9'
const BRACE = '#c2410c'
const GLASS = '#2563eb'
const FONT = 'ui-sans-serif, system-ui, sans-serif'

const cm = (meters) => String(Math.round(meters * 100))
const level = (meters) => (Math.abs(meters) < 0.005 ? '±0,00' : `${meters > 0 ? '+' : '−'}${Math.abs(meters).toFixed(2).replace('.', ',')}`)
const area = (value) => `${value.toFixed(2).replace('.', ',')} m²`
const dec = (value) => value.toFixed(2).replace('.', ',')

export function GarageDrawings({ scene }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <PlanSheet scene={scene} />
        <RoofPlanSheet scene={scene} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {WALL_IDS.map((id) => (
          <ElevationSheet key={id} scene={scene} wall={id} />
        ))}
      </div>
      <SectionSheet scene={scene} />
    </div>
  )
}

/* ---------- Zajednički delovi ---------- */

function Sheet({ title, note, width, height, scale, children }) {
  return (
    <figure className="drawing-sheet overflow-hidden rounded-xl border border-stone-300 bg-white">
      <div className="flex items-baseline justify-between gap-3 border-b border-stone-200 px-3 py-2">
        <figcaption className="text-sm font-semibold text-stone-900">{title}</figcaption>
        <p className="text-right text-xs text-stone-500">{note}</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" fontFamily={FONT}>
        <rect width={width} height={height} fill={PAPER} />
        <rect x="5" y="5" width={width - 10} height={height - 10} fill="none" stroke={FAINT} />
        {children}
        <ScaleBar x={18} y={height - 20} scale={scale} />
        <text x={width - 16} y={height - 14} textAnchor="end" fontSize="9" fill={SOFT}>
          mere u cm · visinske kote u m
        </text>
      </svg>
    </figure>
  )
}

function ScaleBar({ x, y, scale }) {
  const step = scale > 90 ? 0.5 : 1
  return (
    <g>
      {[0, 1, 2, 3].map((index) => (
        <rect key={index} x={x + index * step * scale} y={y} width={step * scale} height="4" fill={index % 2 ? PAPER : INK} stroke={INK} strokeWidth="0.6" />
      ))}
      {[0, 2, 4].map((index) => (
        <text key={index} x={x + index * step * scale} y={y - 3} textAnchor="middle" fontSize="8" fill={MID}>
          {String(index * step).replace('.', ',')}
          {index === 4 ? ' m' : ''}
        </text>
      ))}
    </g>
  )
}

// Kotni lanac: osnovna linija, pomoćne linije do objekta, kose crtice i mera na svakom segmentu.
function DimChain({ values, map, at, from, vertical = false, flip = false }) {
  const points = [...new Set(values.map((value) => Math.round(value * 1000) / 1000))].sort((a, b) => a - b)
  if (points.length < 2) return null
  const pixels = points.map(map)
  const away = from == null ? 0 : Math.sign(at - from)
  const near = from == null ? at : from
  const far = at + away * 5
  const label = at + (flip ? 11 : -4)
  return (
    <g>
      {vertical ? (
        <line x1={at} y1={pixels[0]} x2={at} y2={pixels[pixels.length - 1]} stroke={MID} strokeWidth="0.7" />
      ) : (
        <line x1={pixels[0]} y1={at} x2={pixels[pixels.length - 1]} y2={at} stroke={MID} strokeWidth="0.7" />
      )}
      {pixels.map((pixel, index) =>
        vertical ? (
          <g key={index}>
            <line x1={near} y1={pixel} x2={far} y2={pixel} stroke={SOFT} strokeWidth="0.5" />
            <line x1={at - 3.5} y1={pixel + 3.5} x2={at + 3.5} y2={pixel - 3.5} stroke={INK} strokeWidth="1.3" />
          </g>
        ) : (
          <g key={index}>
            <line x1={pixel} y1={near} x2={pixel} y2={far} stroke={SOFT} strokeWidth="0.5" />
            <line x1={pixel - 3.5} y1={at + 3.5} x2={pixel + 3.5} y2={at - 3.5} stroke={INK} strokeWidth="1.3" />
          </g>
        ),
      )}
      {points.slice(1).map((value, index) => {
        const a = pixels[index]
        const b = pixels[index + 1]
        if (Math.abs(b - a) < 17) return null
        const middle = (a + b) / 2
        return vertical ? (
          <text key={index} x={label} y={middle} textAnchor="middle" fontSize="9.5" fill={INK} transform={`rotate(-90 ${label} ${middle})`}>
            {cm(value - points[index])}
          </text>
        ) : (
          <text key={index} x={middle} y={label} textAnchor="middle" fontSize="9.5" fill={INK}>
            {cm(value - points[index])}
          </text>
        )
      })}
    </g>
  )
}

// Visinska kota: trougao na liniji i vrednost u metrima.
function LevelMark({ x, y, value }) {
  return (
    <g>
      <line x1={x - 4} y1={y} x2={x + 42} y2={y} stroke={MID} strokeWidth="0.7" />
      <path d={`M${x + 8} ${y} l5 -7 l-10 0 z`} fill={INK} />
      <text x={x + 44} y={y - 3} textAnchor="end" fontSize="9.5" fill={INK}>
        {level(value)}
      </text>
    </g>
  )
}

function Hatch({ id, color = SOFT, gap = 5 }) {
  return (
    <pattern id={id} width={gap} height={gap} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2={gap} stroke={color} strokeWidth="0.9" />
    </pattern>
  )
}

function wallPoint(wall, u) {
  return { x: wall.origin[0] + wall.axis[0] * u, z: wall.origin[2] + wall.axis[2] * u }
}

function fit(view, spanX, spanY, pad) {
  return Math.min((view.w - pad.left - pad.right) / spanX, (view.h - pad.top - pad.bottom) / spanY)
}

/* ---------- Osnova ---------- */

export function PlanSheet({ scene }) {
  const uid = useId().replace(/:/g, '')
  const { width, length } = scene.dimensions
  const view = { w: 780, h: 660 }
  const pad = { left: 96, right: 96, top: 70, bottom: 96 }
  const scale = fit(view, width + 0.6, length + 0.6, pad)
  const cx = pad.left + (view.w - pad.left - pad.right) / 2
  const cy = pad.top + (view.h - pad.top - pad.bottom) / 2
  const X = (x) => cx + x * scale
  const Y = (z) => cy + z * scale
  const frame = structureFrame(scene)
  const openings = openingsByWall(scene)
  const thickness = PANEL_THICKNESS
  const left = X(-width / 2)
  const right = X(width / 2)
  const front = Y(length / 2)
  const back = Y(-length / 2)
  const units = scene.units || 1

  const wallPieces = []
  const symbols = []
  WALL_IDS.forEach((id) => {
    const wall = wallFrame(id, scene.dimensions)
    const half = wall.span / 2
    let parts = [[-half, half]]
    openings[id].forEach((opening) => {
      const a = opening.along - opening.width / 2
      const b = opening.along + opening.width / 2
      parts = parts.flatMap(([p0, p1]) => {
        if (b <= p0 || a >= p1) return [[p0, p1]]
        const next = []
        if (a - p0 > 0.01) next.push([p0, a])
        if (p1 - b > 0.01) next.push([b, p1])
        return next
      })
      symbols.push({ id, opening, start: wallPoint(wall, a), end: wallPoint(wall, b), wall })
    })
    parts.forEach(([a, b]) => {
      const start = wallPoint(wall, a)
      const end = wallPoint(wall, b)
      const nx = Math.abs(wall.normal[0]) * (thickness / 2)
      const nz = Math.abs(wall.normal[2]) * (thickness / 2)
      wallPieces.push({
        x: X(Math.min(start.x, end.x) - nx),
        y: Y(Math.min(start.z, end.z) - nz),
        w: (Math.abs(end.x - start.x) + nx * 2) * scale,
        h: (Math.abs(end.z - start.z) + nz * 2) * scale,
      })
    })
  })

  const chain = (id) => {
    const wall = wallFrame(id, scene.dimensions)
    const full = wallLength(id, scene.dimensions) / 2
    const sign = id === 'front' || id === 'back' ? wall.axis[0] : wall.axis[2]
    const marks = [-full, full]
    openings[id].forEach((opening) => marks.push((opening.along - opening.width / 2) * sign, (opening.along + opening.width / 2) * sign))
    return { marks, has: openings[id].length > 0 }
  }
  const chains = { front: chain('front'), back: chain('back'), left: chain('left'), right: chain('right') }
  const unique = (list) => [...new Set(list.map((value) => Math.round(value * 100) / 100))].sort((a, b) => a - b)
  const gridX = unique(frame.posts.filter((post) => Math.abs(post.z - (length / 2 - 0.05)) < 0.01).map((post) => post.x))
  const gridZ = unique(frame.posts.filter((post) => Math.abs(post.x + width / 2 - 0.05) < 0.01).map((post) => post.z))

  return (
    <Sheet title="Osnova" note={`Pogled odozgo, prednja strana je dole${units > 1 ? ` · jedna od ${units} jedinica u nizu` : ''}`} width={view.w} height={view.h} scale={scale}>
      <defs>
        <Hatch id={`wall${uid}`} color={MID} gap={4} />
      </defs>

      {/* Ploča i streha */}
      <rect x={X(-width / 2 - 0.7)} y={Y(-length / 2 - 0.7)} width={(width + 1.4) * scale} height={(length + 2.7) * scale} fill="none" stroke={FAINT} strokeWidth="0.8" />
      <rect
        x={X(-width / 2 - ROOF_OVERHANG)}
        y={Y(-length / 2 - ROOF_OVERHANG)}
        width={(width + ROOF_OVERHANG * 2) * scale}
        height={(length + ROOF_OVERHANG * 2) * scale}
        fill="none"
        stroke={SOFT}
        strokeWidth="0.8"
        strokeDasharray="10 3 2 3"
      />

      {/* Krovni nosači iznad, isprekidano */}
      {frame.rafters.map((segment, index) => (
        <line key={index} x1={X(segment.a[0])} y1={Y(segment.a[2])} x2={X(segment.b[0])} y2={Y(segment.b[2])} stroke={SOFT} strokeWidth="0.8" strokeDasharray="6 4" />
      ))}

      {scene.canopy?.enabled && <CanopyOnPlan scene={scene} X={X} Y={Y} scale={scale} />}

      {/* Nameštaj i vozilo */}
      {(scene.furniture || []).map((item) => {
        const rect = furnitureRect(item)
        return <rect key={item.id} x={X(rect.x0)} y={Y(rect.z0)} width={(rect.x1 - rect.x0) * scale} height={(rect.z1 - rect.z0) * scale} fill="#f5f5f4" stroke={SOFT} strokeWidth="0.8" />
      })}
      {scene.car && <CarOnPlan car={scene.car} X={X} Y={Y} scale={scale} />}

      {/* Prostorije */}
      {(scene.rooms || []).map((room) => {
        const box = roomBox(room, scene.dimensions)
        return (
          <g key={room.id}>
            <path d={`M${X(box.sx > 0 ? box.x1 : box.x0)} ${Y(box.edgeZ)} L${X(box.edgeX)} ${Y(box.edgeZ)} L${X(box.edgeX)} ${Y(box.sz > 0 ? box.z1 : box.z0)}`} fill="none" stroke={INK} strokeWidth="2.4" />
            <text x={X(box.centerX)} y={Y(box.centerZ) - 2} textAnchor="middle" fontSize="10" fontWeight="600" fill={INK}>
              {roomKind(room.kind).name}
              {room.loft ? ' + galerija' : ''}
            </text>
            <text x={X(box.centerX)} y={Y(box.centerZ) + 10} textAnchor="middle" fontSize="9" fill={MID}>
              {area(room.width * room.depth)}
            </text>
          </g>
        )
      })}

      {/* Zidovi u preseku */}
      {wallPieces.map((piece, index) => (
        <g key={index}>
          <rect x={piece.x} y={piece.y} width={piece.w} height={piece.h} fill={PAPER} />
          <rect x={piece.x} y={piece.y} width={piece.w} height={piece.h} fill={`url(#wall${uid})`} stroke={INK} strokeWidth="1.3" />
        </g>
      ))}

      {/* Otvori */}
      {symbols.map(({ id, opening, start, end, wall }, index) => {
        const x1 = X(start.x)
        const y1 = Y(start.z)
        const x2 = X(end.x)
        const y2 = Y(end.z)
        if (!opening.full) {
          const nx = wall.normal[0] * (thickness / 2) * scale
          const nz = wall.normal[2] * (thickness / 2) * scale
          return (
            <g key={index} stroke={GLASS}>
              <line x1={x1 - nx} y1={y1 - nz} x2={x2 - nx} y2={y2 - nz} strokeWidth="1" />
              <line x1={x1 + nx} y1={y1 + nz} x2={x2 + nx} y2={y2 + nz} strokeWidth="1" />
              <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="1.6" />
            </g>
          )
        }
        if (opening.width > 1.3) {
          const mx = (x1 + x2) / 2 + wall.normal[0] * 14
          const my = (y1 + y2) / 2 + wall.normal[2] * 14
          return (
            <g key={index}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth="1" strokeDasharray="7 4" />
              <text x={mx} y={my + 3} textAnchor="middle" fontSize="9" fill={MID} transform={id === 'left' || id === 'right' ? `rotate(-90 ${mx} ${my})` : undefined}>
                vrata {cm(opening.width)}/{cm(opening.height)}
              </text>
            </g>
          )
        }
        // Pešačka vrata: krilo i luk otvaranja ka unutra.
        const radius = opening.width * scale
        const tipX = x1 + wall.normal[0] * radius
        const tipY = y1 + wall.normal[2] * radius
        const sweep = wall.axis[0] * wall.normal[2] - wall.axis[2] * wall.normal[0] > 0 ? 0 : 1
        return (
          <g key={index} fill="none" stroke={INK}>
            <line x1={x1} y1={y1} x2={tipX} y2={tipY} strokeWidth="1.4" />
            <path d={`M${tipX} ${tipY} A${radius} ${radius} 0 0 ${sweep} ${x2} ${y2}`} strokeWidth="0.7" strokeDasharray="3 2" />
          </g>
        )
      })}

      {/* Ukrućenja i stubovi */}
      {frame.braces
        .filter((brace) => brace.kind === 'zid')
        .map((brace, index) => {
          const wall = wallFrame(brace.wall, scene.dimensions)
          const ax = X(brace.a[0] + wall.normal[0] * 0.2)
          const ay = Y(brace.a[2] + wall.normal[2] * 0.2)
          const bx = X(brace.b[0] + wall.normal[0] * 0.2)
          const by = Y(brace.b[2] + wall.normal[2] * 0.2)
          return (
            <g key={index} stroke={BRACE}>
              <line x1={ax} y1={ay} x2={bx} y2={by} strokeWidth="1.6" strokeDasharray="5 3" />
              <circle cx={ax} cy={ay} r="2.2" fill={BRACE} />
              <circle cx={bx} cy={by} r="2.2" fill={BRACE} />
            </g>
          )
        })}
      {frame.posts.map((post) => {
        const size = Math.max(5, 0.08 * scale)
        return <rect key={`${post.x}-${post.z}`} x={X(post.x) - size / 2} y={Y(post.z) - size / 2} width={size} height={size} fill={INK} />
      })}

      {/* Ose stubova */}
      {gridX.length <= 12 &&
        gridX.map((x, index) => (
          <g key={`gx${x}`}>
            <line x1={X(x)} y1={back - 14} x2={X(x)} y2={back - 30} stroke={SOFT} strokeWidth="0.6" strokeDasharray="8 2 1 2" />
            <circle cx={X(x)} cy={back - 38} r="8" fill={PAPER} stroke={MID} strokeWidth="0.8" />
            <text x={X(x)} y={back - 34.8} textAnchor="middle" fontSize="8.5" fill={INK}>
              {index + 1}
            </text>
          </g>
        ))}
      {gridZ.length <= 12 &&
        gridZ.map((z, index) => (
          <g key={`gz${z}`}>
            <line x1={left - 14} y1={Y(z)} x2={left - 30} y2={Y(z)} stroke={SOFT} strokeWidth="0.6" strokeDasharray="8 2 1 2" />
            <circle cx={left - 38} cy={Y(z)} r="8" fill={PAPER} stroke={MID} strokeWidth="0.8" />
            <text x={left - 38} y={Y(z) + 3.2} textAnchor="middle" fontSize="8.5" fill={INK}>
              {String.fromCharCode(65 + index)}
            </text>
          </g>
        ))}

      {/* Kotni lanci */}
      {chains.front.has && <DimChain values={chains.front.marks} map={X} at={front + 34} from={front + 6} flip />}
      <DimChain values={[-width / 2, width / 2]} map={X} at={front + 58} from={front + (chains.front.has ? 34 : 6)} flip />
      {chains.right.has && <DimChain values={chains.right.marks} map={Y} at={right + 34} from={right + 6} vertical flip />}
      <DimChain values={[-length / 2, length / 2]} map={Y} at={right + 58} from={right + (chains.right.has ? 34 : 6)} vertical flip />
      {chains.back.has && <DimChain values={chains.back.marks} map={X} at={back - 62} from={back - 48} />}
      {chains.left.has && <DimChain values={chains.left.marks} map={Y} at={left - 62} from={left - 48} vertical />}

      <text x={cx} y={front + 82} textAnchor="middle" fontSize="10" letterSpacing="2" fill={MID}>
        PREDNJA STRANA
      </text>
      <text x={view.w - 16} y={22} textAnchor="end" fontSize="10" fill={INK}>
        P = {area(width * length)} · unutra {area((width - thickness * 2) * (length - thickness * 2))}
      </text>
      <Legend x={16} y={20} />
    </Sheet>
  )
}

function Legend({ x, y }) {
  const rows = [
    { label: 'stub', width: 52, draw: <rect x="0" y="-6" width="6" height="6" fill={INK} /> },
    { label: 'dijagonala', width: 82, draw: <line x1="0" y1="-3" x2="16" y2="-3" stroke={BRACE} strokeWidth="1.6" strokeDasharray="5 3" /> },
    { label: 'nosač iznad', width: 88, draw: <line x1="0" y1="-3" x2="16" y2="-3" stroke={SOFT} strokeWidth="0.9" strokeDasharray="6 4" /> },
    { label: 'prozor', width: 60, draw: <line x1="0" y1="-3" x2="16" y2="-3" stroke={GLASS} strokeWidth="1.6" /> },
  ]
  const starts = rows.map((_, index) => rows.slice(0, index).reduce((sum, row) => sum + row.width, x))
  return (
    <g fontSize="9" fill={MID}>
      {rows.map((row, index) => (
        <g key={row.label} transform={`translate(${starts[index]} ${y})`}>
          {row.draw}
          <text x="20" y="0">
            {row.label}
          </text>
        </g>
      ))}
    </g>
  )
}

function CarOnPlan({ car, X, Y, scale }) {
  const rect = carRect(car)
  const w = (rect.x1 - rect.x0) * scale
  const h = (rect.z1 - rect.z0) * scale
  const alongZ = Math.abs(Math.sin(car.rotation || 0)) < 0.5
  return (
    <g fill="none" stroke={SOFT} strokeWidth="0.9">
      <rect x={X(rect.x0)} y={Y(rect.z0)} width={w} height={h} rx={Math.min(w, h) * 0.18} fill="#fafaf9" />
      {alongZ ? (
        <rect x={X(rect.x0) + w * 0.12} y={Y(rect.z0) + h * 0.3} width={w * 0.76} height={h * 0.42} rx="3" />
      ) : (
        <rect x={X(rect.x0) + w * 0.3} y={Y(rect.z0) + h * 0.12} width={w * 0.42} height={h * 0.76} rx="3" />
      )}
    </g>
  )
}

function CanopyOnPlan({ scene, X, Y, scale }) {
  const canopy = scene.canopy
  const wall = wallFrame(canopy.wall, scene.dimensions)
  const span = canopySpan(canopy, scene.dimensions)
  const shift = canopyShift(canopy, scene.dimensions)
  const out = [-wall.normal[0], -wall.normal[2]]
  const edge = PANEL_THICKNESS / 2
  const corner = (u, depth) => ({
    x: wall.origin[0] + wall.axis[0] * (shift + u) + out[0] * (edge + depth),
    z: wall.origin[2] + wall.axis[2] * (shift + u) + out[1] * (edge + depth),
  })
  const a = corner(-span / 2, 0)
  const b = corner(span / 2, canopy.depth)
  const x = X(Math.min(a.x, b.x))
  const y = Y(Math.min(a.z, b.z))
  const w = Math.abs(b.x - a.x) * scale
  const h = Math.abs(b.z - a.z) * scale
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={canopy.closed ? '#f5f5f4' : 'none'} stroke={canopy.closed ? INK : MID} strokeWidth={canopy.closed ? 1.6 : 0.9} strokeDasharray={canopy.closed ? undefined : '7 4'} />
      <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle" fontSize="9" fill={MID}>
        {canopy.closed ? 'aneks' : 'nadstrešnica'} {area(span * canopy.depth)}
      </text>
    </g>
  )
}

/* ---------- Plan krovne konstrukcije ---------- */

export function RoofPlanSheet({ scene }) {
  const { width, length } = scene.dimensions
  const view = { w: 780, h: 660 }
  const pad = { left: 80, right: 96, top: 60, bottom: 96 }
  const scale = fit(view, width + 0.8, length + 0.8, pad)
  const cx = pad.left + (view.w - pad.left - pad.right) / 2
  const cy = pad.top + (view.h - pad.top - pad.bottom) / 2
  const X = (x) => cx + x * scale
  const Y = (z) => cy + z * scale
  const frame = structureFrame(scene)
  const alongX = frame.bearing.includes('left')
  const marks = frame.rafters.map((segment) => (alongX ? segment.a[2] : segment.a[0]))
  const draw = (segments, style) => segments.map((segment, index) => <line key={index} x1={X(segment.a[0])} y1={Y(segment.a[2])} x2={X(segment.b[0])} y2={Y(segment.b[2])} {...style} />)
  const sizing = frame.sizing
  const front = Y(length / 2)
  const right = X(width / 2)
  const ridgeAlongLength = scene.roof.ridge === 'length'

  return (
    <Sheet title="Plan krovne konstrukcije" note={frame.truss ? 'Rešetkasti nosači, rožnjače i spregovi' : 'Nosači, rožnjače i spregovi'} width={view.w} height={view.h} scale={scale}>
      <rect x={X(-width / 2)} y={Y(-length / 2)} width={width * scale} height={length * scale} fill="none" stroke={INK} strokeWidth="1.4" />
      <rect
        x={X(-width / 2 - ROOF_OVERHANG)}
        y={Y(-length / 2 - ROOF_OVERHANG)}
        width={(width + ROOF_OVERHANG * 2) * scale}
        height={(length + ROOF_OVERHANG * 2) * scale}
        fill="none"
        stroke={SOFT}
        strokeWidth="0.8"
        strokeDasharray="10 3 2 3"
      />
      <g>{draw(frame.purlins, { stroke: SOFT, strokeWidth: 0.8 })}</g>
      <g>{draw(frame.rafters, { stroke: INK, strokeWidth: frame.truss ? 2.6 : 1.8 })}</g>
      <g>
        {draw(
          frame.braces.filter((brace) => brace.kind === 'krov'),
          { stroke: BRACE, strokeWidth: 1.4, strokeDasharray: '6 3' },
        )}
      </g>
      {scene.roof.kind === 'duo' && (
        <line
          x1={X(ridgeAlongLength ? 0 : -width / 2 - ROOF_OVERHANG)}
          y1={Y(ridgeAlongLength ? -length / 2 - ROOF_OVERHANG : 0)}
          x2={X(ridgeAlongLength ? 0 : width / 2 + ROOF_OVERHANG)}
          y2={Y(ridgeAlongLength ? length / 2 + ROOF_OVERHANG : 0)}
          stroke={INK}
          strokeWidth="1"
          strokeDasharray="12 3 2 3"
        />
      )}
      {frame.posts.map((post) => (
        <rect key={`${post.x}-${post.z}`} x={X(post.x) - 3} y={Y(post.z) - 3} width="6" height="6" fill={PAPER} stroke={INK} strokeWidth="1" />
      ))}
      {alongX ? (
        <>
          <DimChain values={marks} map={Y} at={right + 44} from={right + 12} vertical flip />
          <DimChain values={[-width / 2, width / 2]} map={X} at={front + 44} from={front + 12} flip />
        </>
      ) : (
        <>
          <DimChain values={marks} map={X} at={front + 44} from={front + 12} flip />
          <DimChain values={[-length / 2, length / 2]} map={Y} at={right + 44} from={right + 12} vertical flip />
        </>
      )}
      <g fontSize="10" fill={INK}>
        <text x={16} y={22}>
          {frame.truss ? 'Rešetka, pojas' : 'Nosač'}: {(frame.truss ? sizing.chord.profile : sizing.rafter.profile).name} · {scene.roof.kind === 'duo' ? `${frame.rafters.length / 2} pari` : `${frame.rafters.length} kom`} na {dec(sizing.spacing)} m
        </text>
        <text x={16} y={36} fill={MID}>
          Raspon {dec(sizing.span)} m · sneg {dec(sizing.snow)} kN/m² · opterećenje {dec(sizing.load)} kN/m
        </text>
      </g>
    </Sheet>
  )
}

/* ---------- Izgledi ---------- */

const WALL_TITLES = { front: 'Izgled spreda', back: 'Izgled otpozadi', left: 'Izgled sleva', right: 'Izgled zdesna' }

export function ElevationSheet({ scene, wall: wallId }) {
  const uid = useId().replace(/:/g, '')
  const { dimensions } = scene
  const { height } = dimensions
  const wall = wallFrame(wallId, dimensions)
  const span = wallLength(wallId, dimensions)
  const depth = wallId === 'front' || wallId === 'back' ? dimensions.length : dimensions.width
  const geometry = roofGeometry(dimensions, scene.roof)
  const frame = structureFrame(scene)
  const openings = openingsByWall(scene)[wallId]
  const total = height + geometry.rise
  const view = { w: 780, h: 470 }
  const pad = { left: 92, right: 92, top: 46, bottom: 104 }
  const scale = fit(view, span + ROOF_OVERHANG * 2 + 0.2, Math.max(total + ROOF_THICKNESS + 0.3, 2.8), pad)
  const cx = pad.left + (view.w - pad.left - pad.right) / 2
  const ground = view.h - pad.bottom
  // Gledano spolja, desno na crtežu je suprotno od ose zida.
  const X = (h) => cx + h * scale
  const Y = (up) => ground - up * scale
  const underAt = (h, inward) => {
    const x = wall.origin[0] - wall.axis[0] * h + wall.normal[0] * inward
    const z = wall.origin[2] - wall.axis[2] * h + wall.normal[2] * inward
    return geometry.underside(x, z) - FLOOR_LEVEL
  }
  const samples = 48
  const reach = span / 2 + ROOF_OVERHANG
  const roofTop = []
  const roofLow = []
  for (let index = 0; index <= samples; index += 1) {
    const h = -reach + (reach * 2 * index) / samples
    let top = -Infinity
    for (let step = 0; step <= 16; step += 1) top = Math.max(top, underAt(h, -ROOF_OVERHANG + ((depth + ROOF_OVERHANG * 2) * step) / 16))
    roofTop.push([X(h), Y(top + ROOF_THICKNESS)])
    roofLow.push([X(h), Y(underAt(h, -ROOF_OVERHANG))])
  }
  const wallTop = []
  for (let index = 0; index <= 24; index += 1) {
    const h = -span / 2 + (span * index) / 24
    wallTop.push([X(h), Y(underAt(h, 0))])
  }
  const join = (points) => points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const wallPolygon = `${X(-span / 2)},${ground} ${join(wallTop)} ${X(span / 2)},${ground}`
  const slopeFaces = Math.abs(roofTop[24][1] - roofLow[24][1]) > (ROOF_THICKNESS + 0.25) * scale
  const onWall = (point) => Math.abs((point[0] - wall.origin[0]) * wall.normal[0] + (point[2] - wall.origin[2]) * wall.normal[2]) < 0.08
  const toH = (point) => -((point[0] - wall.origin[0]) * wall.axis[0] + (point[2] - wall.origin[2]) * wall.axis[2])
  const hidden = (segments) => segments.filter((segment) => onWall(segment.a) && onWall(segment.b))
  const posts = frame.posts.filter((post) => onWall([post.x, 0, post.z]))
  const heights = [0, height]
  openings.filter((opening) => opening.full).forEach((opening) => heights.push(opening.height))
  if (geometry.rise > 0.05) heights.push(total)
  const marks = [-span / 2, span / 2]
  openings.forEach((opening) => marks.push(-opening.along - opening.width / 2, -opening.along + opening.width / 2))
  const ribs = []
  for (let h = -span / 2 + 0.25; h < span / 2; h += 0.25) ribs.push(h)
  const door = scene.door
  const hiddenLine = (segment, key, extra) => (
    <line key={key} x1={X(toH(segment.a))} y1={Y(segment.a[1] - FLOOR_LEVEL)} x2={X(toH(segment.b))} y2={Y(segment.b[1] - FLOOR_LEVEL)} {...extra} />
  )

  return (
    <Sheet title={WALL_TITLES[wallId]} note={`${wall.label} · isprekidano je skelet iza obloge`} width={view.w} height={view.h} scale={scale}>
      <defs>
        <Hatch id={`earth${uid}`} color={SOFT} gap={6} />
        <clipPath id={`clip${uid}`}>
          <polygon points={wallPolygon} />
        </clipPath>
      </defs>

      {/* Teren i ploča */}
      <rect x={pad.left - 60} y={ground + FLOOR_LEVEL * scale} width={view.w - pad.left - pad.right + 120} height="9" fill={`url(#earth${uid})`} />
      <line x1={pad.left - 60} y1={ground + FLOOR_LEVEL * scale} x2={view.w - pad.right + 60} y2={ground + FLOOR_LEVEL * scale} stroke={INK} strokeWidth="1.2" />
      <rect x={X(-span / 2 - 0.5)} y={ground} width={(span + 1) * scale} height={FLOOR_LEVEL * scale} fill="#e7e5e4" stroke={INK} strokeWidth="0.8" />

      {/* Obloga */}
      <polygon points={wallPolygon} fill="#fafaf9" />
      <g clipPath={`url(#clip${uid})`} stroke={FAINT} strokeWidth="0.7">
        {ribs.map((h) => (
          <line key={h} x1={X(h)} y1={Y(total + 1)} x2={X(h)} y2={ground} />
        ))}
      </g>

      {/* Skelet iza obloge */}
      <g stroke={MID} strokeWidth="0.9" strokeDasharray="5 3" fill="none">
        {posts.map((post) => (
          <rect key={`${post.x}-${post.z}`} x={X(toH([post.x, 0, post.z])) - 0.04 * scale} y={Y(post.height)} width={0.08 * scale} height={post.height * scale} />
        ))}
        {hidden(frame.girts).map((segment, index) => hiddenLine(segment, `g${index}`))}
        {hidden(frame.headers).map((segment, index) => hiddenLine(segment, `h${index}`, { strokeWidth: 1.4 }))}
      </g>
      {hidden(frame.braces).map((segment, index) => hiddenLine(segment, index, { stroke: BRACE, strokeWidth: 1.3, strokeDasharray: '6 3' }))}

      {/* Otvori */}
      {openings.map((opening, index) => {
        const x = X(-opening.along - opening.width / 2)
        const w = opening.width * scale
        const y = Y(opening.sill + opening.height)
        const h = opening.height * scale
        if (!opening.full) {
          return (
            <g key={index}>
              <rect x={x} y={y} width={w} height={h} fill="#eef4fb" stroke={INK} strokeWidth="1.2" />
              <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} fill="none" stroke={GLASS} strokeWidth="0.7" />
              <line x1={x + w * 0.25} y1={y + h * 0.75} x2={x + w * 0.45} y2={y + h * 0.3} stroke={GLASS} strokeWidth="0.6" />
              <line x1={x + w * 0.4} y1={y + h * 0.75} x2={x + w * 0.55} y2={y + h * 0.42} stroke={GLASS} strokeWidth="0.6" />
              <line x1={x - 3} y1={y + h + 2} x2={x + w + 3} y2={y + h + 2} stroke={INK} strokeWidth="1.4" />
            </g>
          )
        }
        const main = door.style !== 'none' && door.wall === wallId && Math.abs(opening.along - door.along) < 0.001 && Math.abs(opening.width - door.width) < 0.001
        if (!main) {
          return (
            <g key={index}>
              <rect x={x} y={y} width={w} height={h} fill="#f5f5f4" stroke={INK} strokeWidth="1.2" />
              <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} fill="none" stroke={SOFT} strokeWidth="0.7" />
              <path d={`M${x + 4} ${y + 4} L${x + w - 4} ${y + h / 2} L${x + 4} ${y + h - 4}`} fill="none" stroke={SOFT} strokeWidth="0.6" strokeDasharray="4 3" />
              <circle cx={x + w - 9} cy={y + h * 0.52} r="1.8" fill={INK} />
            </g>
          )
        }
        const bands = door.style === 'roller' ? Math.round(opening.height / 0.12) : door.style === 'sectional' ? Math.max(4, Math.ceil(opening.height / 0.5)) : 0
        const swing = door.style === 'single' || door.style === 'double' || door.style === 'tilt'
        return (
          <g key={index}>
            <rect x={x} y={y} width={w} height={h} fill="#f0efed" stroke={INK} strokeWidth="1.4" />
            {Array.from({ length: Math.max(0, bands - 1) }, (_, band) => (
              <line key={band} x1={x} y1={y + (h * (band + 1)) / bands} x2={x + w} y2={y + (h * (band + 1)) / bands} stroke={SOFT} strokeWidth="0.6" />
            ))}
            {door.style === 'double' && <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={INK} strokeWidth="1" />}
            {swing && <path d={`M${x} ${y} L${x + (door.style === 'double' ? w / 2 : w)} ${y + h / 2} L${x} ${y + h}`} fill="none" stroke={SOFT} strokeWidth="0.6" strokeDasharray="4 3" />}
          </g>
        )
      })}

      {/* Krov */}
      <polygon points={`${join(roofTop)} ${join([...roofLow].reverse())}`} fill={slopeFaces ? '#e7e5e4' : '#d6d3d1'} stroke={INK} strokeWidth="1.3" />
      {slopeFaces &&
        ribs
          .filter((_, index) => index % 2 === 0)
          .map((h) => {
            const index = Math.round(((h + reach) / (reach * 2)) * samples)
            return <line key={h} x1={X(h)} y1={roofTop[index][1]} x2={X(h)} y2={roofLow[index][1]} stroke={SOFT} strokeWidth="0.6" />
          })}
      <polygon points={wallPolygon} fill="none" stroke={INK} strokeWidth="1.6" />

      {/* Kote */}
      {openings.length > 0 && <DimChain values={marks} map={X} at={ground + 40} from={ground + 14} flip />}
      <DimChain values={[-span / 2, span / 2]} map={X} at={ground + 64} from={ground + (openings.length > 0 ? 40 : 14)} flip />
      <DimChain values={heights} map={Y} at={X(-reach) - 34} from={X(-reach) - 6} vertical />
      <LevelMark x={X(reach) + 10} y={ground} value={0} />
      <LevelMark x={X(reach) + 10} y={Y(height)} value={height} />
      {geometry.rise > 0.05 && <LevelMark x={X(reach) + 10} y={Y(total)} value={total} />}
      {scene.roof.kind !== 'flat' && (
        <text x={cx} y={Y(total + ROOF_THICKNESS) - 10} textAnchor="middle" fontSize="10" fill={MID}>
          {scene.roof.kind === 'mono' ? 'jedna voda' : 'dve vode'}, nagib {scene.roof.pitch}°
        </text>
      )}
    </Sheet>
  )
}

/* ---------- Presek ---------- */

export function SectionSheet({ scene }) {
  const uid = useId().replace(/:/g, '')
  const { dimensions } = scene
  const { height } = dimensions
  const geometry = roofGeometry(dimensions, scene.roof)
  const frame = structureFrame(scene)
  const alongX = frame.bearing.includes('left')
  const span = alongX ? dimensions.width : dimensions.length
  const total = height + geometry.rise
  const view = { w: 1100, h: 520 }
  const pad = { left: 110, right: 150, top: 56, bottom: 96 }
  const scale = fit(view, span + ROOF_OVERHANG * 2 + 0.4, Math.max(total + 0.6, 3), pad)
  const cx = pad.left + (view.w - pad.left - pad.right) / 2
  const ground = view.h - pad.bottom
  const X = (h) => cx + h * scale
  // Visine su apsolutne, sa pločom na FLOOR_LEVEL.
  const Y = (up) => ground - (up - FLOOR_LEVEL) * scale
  const horizontal = (point) => (alongX ? point[0] : point[2])
  const across = (point) => (alongX ? point[2] : point[0])
  const middle = frame.rafters[Math.floor(frame.rafters.length / 2)]
  const cut = middle ? across(middle.a) : 0
  const pick = (segments) => segments.filter((segment) => Math.abs(across(segment.a) - cut) < 0.06 && Math.abs(across(segment.b) - cut) < 0.06)
  const draw = (segments, style) => segments.map((segment, index) => <line key={index} x1={X(horizontal(segment.a))} y1={Y(segment.a[1])} x2={X(horizontal(segment.b))} y2={Y(segment.b[1])} {...style} />)
  const under = (h) => (alongX ? geometry.underside(h, cut) : geometry.underside(cut, h))
  const reach = span / 2 + ROOF_OVERHANG
  const roofLine = Array.from({ length: 41 }, (_, index) => -reach + (reach * 2 * index) / 40)
  const lows = [...pick(frame.chords), ...pick(frame.ties)].map((segment) => Math.min(segment.a[1], segment.b[1]))
  const lowPoint = Math.min(...lows, under(-span / 2 + 0.05) - 0.12, under(span / 2 - 0.05) - 0.12)
  const purlins = [...new Set(frame.purlins.map((segment) => Math.round(horizontal(segment.a) * 100) / 100))]
  const sizing = frame.sizing
  const profile = (frame.truss ? sizing.chord.profile : sizing.rafter.profile).name
  const car = scene.car
  const carLength = car ? Math.min(car.length, span - 1.6) : 0
  const floor = FLOOR_LEVEL
  const person = span / 2 - 0.7

  return (
    <Sheet title="Poprečni presek" note={`Presek kroz nosač, ${alongX ? 'po širini' : 'po dužini'} objekta`} width={view.w} height={view.h} scale={scale}>
      <defs>
        <Hatch id={`soil${uid}`} color={SOFT} gap={6} />
        <Hatch id={`slab${uid}`} color={MID} gap={4} />
      </defs>

      {/* Teren, ploča i tampon */}
      <rect x={pad.left - 70} y={Y(0)} width={view.w - pad.left - pad.right + 150} height="10" fill={`url(#soil${uid})`} />
      <line x1={pad.left - 70} y1={Y(0)} x2={view.w - pad.right + 80} y2={Y(0)} stroke={INK} strokeWidth="1.2" />
      <rect x={X(-span / 2 - 0.5)} y={Y(floor)} width={(span + 1) * scale} height={0.15 * scale} fill={PAPER} />
      <rect x={X(-span / 2 - 0.5)} y={Y(floor)} width={(span + 1) * scale} height={0.15 * scale} fill={`url(#slab${uid})`} stroke={INK} strokeWidth="1.2" />
      <rect x={X(-span / 2 - 0.5)} y={Y(floor) + 0.15 * scale} width={(span + 1) * scale} height={0.1 * scale} fill="#eeece8" stroke={SOFT} strokeWidth="0.6" strokeDasharray="2 2" />

      {/* Stubovi i obloga u preseku */}
      {[-1, 1].map((side) => {
        const h = side * (span / 2 - 0.05)
        const top = under(h)
        return (
          <g key={side}>
            <rect x={X(h) - 0.04 * scale} y={Y(top - 0.1)} width={0.08 * scale} height={(top - 0.1 - floor) * scale} fill={INK} />
            <rect x={X(side * (span / 2)) - (side > 0 ? 0 : 0.03 * scale)} y={Y(top)} width={0.03 * scale} height={(top - floor) * scale} fill={SOFT} />
          </g>
        )
      })}

      {/* Krovni paket */}
      <polygon
        points={`${roofLine.map((h) => `${X(h).toFixed(1)},${Y(under(h) + ROOF_THICKNESS).toFixed(1)}`).join(' ')} ${[...roofLine]
          .reverse()
          .map((h) => `${X(h).toFixed(1)},${Y(under(h)).toFixed(1)}`)
          .join(' ')}`}
        fill="#d6d3d1"
        stroke={INK}
        strokeWidth="1.1"
      />
      {purlins.map((h) => (
        <rect key={h} x={X(h) - 3} y={Y(under(h) - 0.03) - 3} width="6" height="6" fill={PAPER} stroke={INK} strokeWidth="0.9" />
      ))}
      <g>{draw(pick(frame.rafters), { stroke: INK, strokeWidth: 3 })}</g>
      <g>{draw(pick(frame.chords), { stroke: INK, strokeWidth: 3 })}</g>
      <g>{draw(pick(frame.ties), { stroke: INK, strokeWidth: 2.4 })}</g>
      <g>{draw([...pick(frame.webs), ...pick(frame.kings)], { stroke: INK, strokeWidth: 1.3 })}</g>

      {/* Zidni pojasevi u preseku */}
      {Array.from({ length: frame.girtRows }, (_, row) => {
        const up = floor + (height * (row + 1)) / (frame.girtRows + 1)
        return [-1, 1].map((side) => <rect key={`${row}${side}`} x={X(side * (span / 2 - 0.05)) - 3 - side * 7} y={Y(up) - 3} width="6" height="6" fill={PAPER} stroke={INK} strokeWidth="0.9" />)
      })}

      {/* Razmera: vozilo i čovek od 1,75 m */}
      {car && carLength > 2 && (
        <g fill="none" stroke={SOFT} strokeWidth="1">
          <path
            d={`M${X(-carLength / 2)} ${Y(floor + 0.25)} L${X(-carLength / 2)} ${Y(floor + car.height * 0.55)} L${X(-carLength * 0.28)} ${Y(floor + car.height * 0.6)} L${X(-carLength * 0.16)} ${Y(floor + car.height)} L${X(carLength * 0.14)} ${Y(floor + car.height)} L${X(carLength * 0.27)} ${Y(floor + car.height * 0.6)} L${X(carLength / 2)} ${Y(floor + car.height * 0.5)} L${X(carLength / 2)} ${Y(floor + 0.25)} Z`}
          />
          <circle cx={X(-carLength * 0.31)} cy={Y(floor + 0.32)} r={0.32 * scale} fill={PAPER} />
          <circle cx={X(carLength * 0.31)} cy={Y(floor + 0.32)} r={0.32 * scale} fill={PAPER} />
        </g>
      )}
      <g fill="none" stroke={SOFT} strokeWidth="1">
        <circle cx={X(person)} cy={Y(floor + 1.63)} r={0.12 * scale} />
        <path
          d={`M${X(person)} ${Y(floor + 1.5)} L${X(person)} ${Y(floor + 0.85)} M${X(person - 0.22)} ${Y(floor + 1.05)} L${X(person)} ${Y(floor + 1.4)} L${X(person + 0.22)} ${Y(floor + 1.05)} M${X(person - 0.15)} ${Y(floor)} L${X(person)} ${Y(floor + 0.85)} L${X(person + 0.15)} ${Y(floor)}`}
        />
      </g>

      {/* Kote */}
      <DimChain values={[-span / 2, span / 2]} map={X} at={Y(0) + 46} from={Y(0) + 16} flip />
      <DimChain values={[floor, lowPoint]} map={Y} at={X(-span / 4)} vertical flip />
      <DimChain values={[floor, floor + height, ...(geometry.rise > 0.05 ? [floor + total] : [])]} map={Y} at={X(-reach) - 36} from={X(-reach) - 6} vertical />
      <LevelMark x={X(reach) + 12} y={Y(floor)} value={0} />
      <LevelMark x={X(reach) + 12} y={Y(floor + height)} value={height} />
      {geometry.rise > 0.05 && <LevelMark x={X(reach) + 12} y={Y(floor + total)} value={total} />}
      <g fontSize="10" fill={INK}>
        <text x={16} y={22}>
          {frame.truss ? `Rešetkasti nosač visine ${dec(frame.trussDepth)} m, pojas ${profile}` : `Krovni nosač ${profile}`} · svetla visina {dec(lowPoint - floor)} m
        </text>
        <text x={16} y={36} fill={MID}>
          Ploča 15 cm na tamponu · stubova {frame.posts.length} · zidni pojasevi u {frame.girtRows} {frame.girtRows === 1 ? 'redu' : 'reda'}
        </text>
      </g>
    </Sheet>
  )
}
