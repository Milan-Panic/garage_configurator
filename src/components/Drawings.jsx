import { FLOOR_LEVEL } from '../config'
import { wallFrame } from '../layout'
import { roofGeometry } from '../roof'
import { structurePosts } from '../estimate'

const INK = '#1c1917'
const MUTED = '#78716c'
const SHEET = '#fffcf8'

export function GarageDrawings({ scene }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <PlanSheet scene={scene} />
      <FrontSheet scene={scene} />
      <SideSheet scene={scene} />
    </div>
  )
}

function PlanSheet({ scene }) {
  const { width, length } = scene.dimensions
  const view = { w: 560, h: 460, pad: 72 }
  const scale = Math.min((view.w - view.pad * 2) / width, (view.h - view.pad * 2) / length)
  const ox = view.w / 2
  const oy = view.h / 2
  const X = (x) => ox + x * scale
  const Y = (z) => oy + z * scale
  const door = doorOnPlan(scene.door, scene.dimensions)
  const posts = structurePosts(scene.dimensions, scene.roof, scene.door, scene.pedestrianDoors || [])
  const left = X(-width / 2)
  const right = X(width / 2)
  const front = Y(length / 2)
  const back = Y(-length / 2)

  return (
    <Sheet title="Tlocrt" note="Pogled odozgo. Prednja strana je dole.">
      <svg viewBox={`0 0 ${view.w} ${view.h}`} className="h-auto w-full">
        <rect width={view.w} height={view.h} fill={SHEET} />
        <line x1={left} y1={back} x2={right} y2={back} stroke={INK} strokeWidth="2" />
        <line x1={left} y1={back} x2={left} y2={front} stroke={INK} strokeWidth="2" />
        <line x1={right} y1={back} x2={right} y2={front} stroke={INK} strokeWidth="2" />
        <line x1={left} y1={front} x2={right} y2={front} stroke={INK} strokeWidth="2" />
        {door && (
          <>
            <line x1={X(door.a.x)} y1={Y(door.a.z)} x2={X(door.b.x)} y2={Y(door.b.z)} stroke={SHEET} strokeWidth="5" />
            <line x1={X(door.a.x)} y1={Y(door.a.z)} x2={X(door.b.x)} y2={Y(door.b.z)} stroke={MUTED} strokeDasharray="5 4" />
          </>
        )}
        {posts.map((post) => (
          <rect
            key={`${post.x}-${post.z}`}
            x={X(post.x) - 4}
            y={Y(post.z) - 4}
            width="8"
            height="8"
            fill={INK}
          />
        ))}
        {scene.windows.map((item) => {
          const spot = windowOnPlan(item, scene.dimensions)
          if (!spot) return null
          return (
            <line
              key={item.id}
              x1={X(spot.x1)}
              y1={Y(spot.z1)}
              x2={X(spot.x2)}
              y2={Y(spot.z2)}
              stroke="#2563eb"
              strokeWidth="3"
            />
          )
        })}
        {(scene.pedestrianDoors || []).map((item) => {
          const spot = windowOnPlan(item, scene.dimensions)
          if (!spot) return null
          return (
            <line
              key={item.id}
              x1={X(spot.x1)}
              y1={Y(spot.z1)}
              x2={X(spot.x2)}
              y2={Y(spot.z2)}
              stroke="#b45309"
              strokeWidth="3"
            />
          )
        })}
        <Dim x1={left} y1={front + 28} x2={right} y2={front + 28} label={meters(width)} />
        <Dim x1={right + 28} y1={front} x2={right + 28} y2={back} label={meters(length)} vertical />
        {door && door.a.z === door.b.z && (
          <Dim x1={X(door.a.x)} y1={Y(door.a.z) + 36} x2={X(door.b.x)} y2={Y(door.b.z) + 36} label={`otvor ${meters(door.width)}`} />
        )}
        {door && door.a.x === door.b.x && (
          <text
            x={X(door.a.x) - 14}
            y={Y((door.a.z + door.b.z) / 2)}
            textAnchor="middle"
            fontSize="12"
            fill={INK}
            transform={`rotate(-90 ${X(door.a.x) - 14} ${Y((door.a.z + door.b.z) / 2)})`}
          >
            {`otvor ${meters(door.width)}`}
          </text>
        )}
        <text x={ox} y={front + 16} textAnchor="middle" fontSize="12" fill={MUTED}>
          prednja strana
        </text>
      </svg>
    </Sheet>
  )
}

function FrontSheet({ scene }) {
  const { width, height } = scene.dimensions
  const geometry = roofGeometry(scene.dimensions, scene.roof)
  const rise = geometry.rise
  const total = height + rise
  const view = { w: 560, h: 420, pad: 64 }
  const scale = Math.min((view.w - view.pad * 2) / width, (view.h - view.pad * 2) / Math.max(total, 2.4))
  const ground = view.h - view.pad
  const ox = view.w / 2
  const X = (x) => ox + x * scale
  const Y = (metersUp) => ground - metersUp * scale
  const door = scene.door.style !== 'none' && scene.door.wall === 'front' ? scene.door : null
  const roofLine = sampleLine(13, (t) => {
    const x = -width / 2 + width * t
    return { x: X(x), y: Y(geometry.underside(x, scene.dimensions.length / 2) - FLOOR_LEVEL) }
  })
  const doorLeft = door ? X(-(door.along + door.width / 2)) : 0
  const doorRight = door ? X(-(door.along - door.width / 2)) : 0
  const doorTop = door ? Y(door.height) : ground
  const frontWindows = scene.windows.filter((item) => item.wall === 'front')

  return (
    <Sheet title="Prednja strana" note={door ? 'Isprekidano je otvor vrata.' : 'Vrata nisu na prednjem zidu. Otvor je na tlocrtu.'}>
      <svg viewBox={`0 0 ${view.w} ${view.h}`} className="h-auto w-full">
        <rect width={view.w} height={view.h} fill={SHEET} />
        <line x1={view.pad} y1={ground} x2={view.w - view.pad} y2={ground} stroke={MUTED} />
        <polygon
          points={`${X(-width / 2)},${ground} ${roofLine.map((point) => `${point.x},${point.y}`).join(' ')} ${X(width / 2)},${ground}`}
          fill="none"
          stroke={INK}
          strokeWidth="2"
        />
        {door && (
          <rect
            x={Math.min(doorLeft, doorRight)}
            y={doorTop}
            width={Math.abs(doorRight - doorLeft)}
            height={ground - doorTop}
            fill="none"
            stroke={INK}
            strokeDasharray="6 4"
          />
        )}
        {frontWindows.map((item) => (
          <rect
            key={item.id}
            x={X(-(item.along)) - (item.width * scale) / 2}
            y={Y(item.sill + item.height)}
            width={item.width * scale}
            height={item.height * scale}
            fill="none"
            stroke="#2563eb"
            strokeWidth="1.5"
          />
        ))}
        {scene.door.style === 'roller' && door && (
          <text x={(doorLeft + doorRight) / 2} y={(doorTop + ground) / 2} textAnchor="middle" fontSize="13" fill={MUTED}>
            rolo
          </text>
        )}
        <Dim x1={X(-width / 2)} y1={ground + 26} x2={X(width / 2)} y2={ground + 26} label={meters(width)} />
        <Dim x1={X(-width / 2) - 28} y1={ground} x2={X(-width / 2) - 28} y2={Y(height)} label={meters(height)} vertical />
        {rise > 0.05 && (
          <Dim x1={X(width / 2) + 28} y1={ground} x2={X(width / 2) + 28} y2={Y(total)} label={`slemen ${meters(total)}`} vertical />
        )}
        {door && (
          <>
            <Dim x1={Math.min(doorLeft, doorRight)} y1={ground + 48} x2={Math.max(doorLeft, doorRight)} y2={ground + 48} label={meters(door.width)} />
            <Dim x1={Math.max(doorLeft, doorRight) + 16} y1={ground} x2={Math.max(doorLeft, doorRight) + 16} y2={doorTop} label={meters(door.height)} vertical />
          </>
        )}
      </svg>
    </Sheet>
  )
}

function SideSheet({ scene }) {
  const { length, height } = scene.dimensions
  const geometry = roofGeometry(scene.dimensions, scene.roof)
  const rise = geometry.rise
  const total = height + rise
  const view = { w: 560, h: 420, pad: 64 }
  const scale = Math.min((view.w - view.pad * 2) / length, (view.h - view.pad * 2) / Math.max(total, 2.4))
  const ground = view.h - view.pad
  const left = view.pad
  const X = (fromFront) => left + fromFront * scale
  const Y = (metersUp) => ground - metersUp * scale
  const roofLine = sampleLine(17, (t) => {
    const z = scene.dimensions.length / 2 - length * t
    return { x: X(length * t), y: Y(geometry.underside(-scene.dimensions.width / 2, z) - FLOOR_LEVEL) }
  })
  const sideWindows = scene.windows.filter((item) => item.wall === 'left')
  const sideDoor = scene.door.style !== 'none' && scene.door.wall === 'left' ? scene.door : null

  return (
    <Sheet title="Leva strana" note="Prednja strana je levo. Nagib krova se vidi na ovoj projekciji.">
      <svg viewBox={`0 0 ${view.w} ${view.h}`} className="h-auto w-full">
        <rect width={view.w} height={view.h} fill={SHEET} />
        <line x1={view.pad - 8} y1={ground} x2={view.w - 36} y2={ground} stroke={MUTED} />
        <polygon
          points={`${X(0)},${ground} ${roofLine.map((point) => `${point.x},${point.y}`).join(' ')} ${X(length)},${ground}`}
          fill="none"
          stroke={INK}
          strokeWidth="2"
        />
        {sideDoor && (
          <rect
            x={X(scene.dimensions.length / 2 + sideDoor.along) - (sideDoor.width * scale) / 2}
            y={Y(sideDoor.height)}
            width={sideDoor.width * scale}
            height={sideDoor.height * scale}
            fill="none"
            stroke={INK}
            strokeDasharray="6 4"
          />
        )}
        {sideWindows.map((item) => {
          const wall = wallFrame('left', scene.dimensions)
          const z = wall.origin[2] + wall.axis[2] * item.along
          const fromFront = scene.dimensions.length / 2 - z
          return (
            <rect
              key={item.id}
              x={X(fromFront) - (item.width * scale) / 2}
              y={Y(item.sill + item.height)}
              width={item.width * scale}
              height={item.height * scale}
              fill="none"
              stroke="#2563eb"
              strokeWidth="1.5"
            />
          )
        })}
        <Dim x1={X(0)} y1={ground + 26} x2={X(length)} y2={ground + 26} label={meters(length)} />
        <Dim x1={X(0) - 28} y1={ground} x2={X(0) - 28} y2={Y(height)} label={meters(height)} vertical />
        {scene.roof.kind !== 'flat' && (
          <text x={X(length / 2)} y={Y(total) - 10} textAnchor="middle" fontSize="13" fill={INK}>
            {scene.roof.kind === 'mono' ? 'jedna voda' : 'dve vode'} {scene.roof.pitch}°
          </text>
        )}
      </svg>
    </Sheet>
  )
}

function Sheet({ title, note, children }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-stone-300 bg-white">
      <div className="border-b border-stone-200 px-3 py-2">
        <figcaption className="text-sm font-medium text-stone-900">{title}</figcaption>
        <p className="text-xs text-stone-500">{note}</p>
      </div>
      {children}
    </figure>
  )
}

function Dim({ x1, y1, x2, y2, label, vertical = false }) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={MUTED} strokeWidth="1" />
      <line x1={x1 - (vertical ? 4 : 0)} y1={y1 - (vertical ? 0 : 4)} x2={x1 + (vertical ? 4 : 0)} y2={y1 + (vertical ? 0 : 4)} stroke={MUTED} />
      <line x1={x2 - (vertical ? 4 : 0)} y1={y2 - (vertical ? 0 : 4)} x2={x2 + (vertical ? 4 : 0)} y2={y2 + (vertical ? 0 : 4)} stroke={MUTED} />
      <text
        x={mx}
        y={my}
        textAnchor="middle"
        fontSize="12"
        fill={INK}
        transform={vertical ? `rotate(-90 ${mx} ${my})` : undefined}
        dy={vertical ? 0 : -6}
      >
        {label}
      </text>
    </g>
  )
}

function sampleLine(count, at) {
  return Array.from({ length: count }, (_, index) => at(index / (count - 1)))
}

function doorOnPlan(door, dimensions) {
  if (!door || door.style === 'none' || !Number.isFinite(door.width)) return null
  const { width, length } = dimensions
  const at = (u) => {
    if (door.wall === 'back') return { x: u, z: -length / 2 }
    if (door.wall === 'left') return { x: -width / 2, z: -u }
    if (door.wall === 'right') return { x: width / 2, z: u }
    return { x: -u, z: length / 2 }
  }
  return {
    a: at(door.along - door.width / 2),
    b: at(door.along + door.width / 2),
    width: door.width,
  }
}

function windowOnPlan(item, dimensions) {
  const wall = wallFrame(item.wall, dimensions)
  const x = wall.origin[0] + wall.axis[0] * item.along
  const z = wall.origin[2] + wall.axis[2] * item.along
  const halfU = item.width / 2
  return {
    x1: x - wall.axis[0] * halfU,
    z1: z - wall.axis[2] * halfU,
    x2: x + wall.axis[0] * halfU,
    z2: z + wall.axis[2] * halfU,
  }
}

function meters(value) {
  return `${value.toFixed(2).replace('.', ',')} m`
}
