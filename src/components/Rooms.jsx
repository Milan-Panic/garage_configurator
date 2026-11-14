import { FLOOR_FINISHES, findMaterial } from '../materials'
import { PARTITION, roomBox, roomKind } from '../rooms'
import { PatternMesh } from './PatternMesh'
import { Bar, Box } from './parts'

const PANEL = { color: '#eceeed', roughness: 0.5, metalness: 0.18 }
const LEAF = { color: '#d8c6a5', roughness: 0.6, metalness: 0.02 }
const TILES = findMaterial(FLOOR_FINISHES, 'keramika')
const RAIL = { color: '#3f4650', roughness: 0.45, metalness: 0.6 }

// Galerija iznad prostorije: ograda na dve otvorene strane i strme stepenice.
function Loft({ box, room }) {
  const deck = box.floor + box.height + 0.05
  const postsAlong = (from, to) => {
    const count = Math.max(1, Math.ceil(Math.abs(to - from) / 1.1))
    return Array.from({ length: count + 1 }, (_, index) => from + ((to - from) * index) / count)
  }
  const edgeZ = box.edgeZ + box.sz * 0.03
  const edgeX = box.edgeX + box.sx * 0.03
  const wallZ = box.sz > 0 ? box.z1 : box.z0
  // Stepenice silaze niz pregradu koja gleda u stranu, uz spoljni zid.
  const stairZ = wallZ - box.sz * 0.45
  const stairFoot = box.edgeX - box.sx * (box.height * 0.55)
  const steps = Math.max(6, Math.round(box.height / 0.22))
  return (
    <group>
      {postsAlong(box.x0, box.x1).map((x) => (
        <Box key={`x${x}`} position={[x, deck + 0.5, edgeZ]} size={[0.04, 1, 0.04]} {...RAIL} />
      ))}
      {postsAlong(box.z0, box.z1)
        .filter((z) => Math.abs(z - stairZ) > 0.5)
        .map((z) => (
          <Box key={`z${z}`} position={[edgeX, deck + 0.5, z]} size={[0.04, 1, 0.04]} {...RAIL} />
        ))}
      {[0.5, 1].map((level) => (
        <group key={level}>
          <Box position={[box.centerX, deck + level, edgeZ]} size={[room.width, 0.035, 0.035]} {...RAIL} />
          <Box position={[edgeX, deck + level, box.centerZ - box.sz * 0.45]} size={[0.035, 0.035, Math.max(0.1, room.depth - 0.9)]} {...RAIL} />
        </group>
      ))}
      {[-1, 1].map((side) => (
        <Bar key={side} from={[stairFoot, box.floor + 0.02, stairZ + side * 0.33]} to={[edgeX, deck, stairZ + side * 0.33]} thickness={[0.04, 0.12]} {...RAIL} />
      ))}
      {Array.from({ length: steps }, (_, index) => {
        const t = (index + 0.5) / steps
        return <Box key={index} position={[stairFoot + (edgeX - stairFoot) * t, box.floor + (deck - box.floor) * t, stairZ]} size={[0.22, 0.03, 0.62]} color="#8a6744" roughness={0.6} />
      })}
    </group>
  )
}

// Pregradni zid sa otvorom za vrata. `along` je osa po kojoj zid ide.
function Partition({ axis, fixed, low, high, floor, height, door }) {
  const place = (center, level, length, tall, thickness = PARTITION) => ({
    position: axis === 'x' ? [center, level, fixed] : [fixed, level, center],
    size: axis === 'x' ? [length, tall, thickness] : [thickness, tall, length],
  })
  if (!door) return <Box {...place((low + high) / 2, floor + height / 2, high - low, height)} {...PANEL} />
  const doorLow = door.center - door.width / 2
  const doorHigh = door.center + door.width / 2
  return (
    <group>
      {doorLow - low > 0.01 && <Box {...place((low + doorLow) / 2, floor + height / 2, doorLow - low, height)} {...PANEL} />}
      {high - doorHigh > 0.01 && <Box {...place((doorHigh + high) / 2, floor + height / 2, high - doorHigh, height)} {...PANEL} />}
      {height - door.height > 0.01 && <Box {...place(door.center, floor + (door.height + height) / 2, door.width, height - door.height)} {...PANEL} />}
      <Box {...place(door.center, floor + door.height / 2, door.width - 0.04, door.height - 0.02, 0.04)} {...LEAF} />
      <Box {...place(door.center + door.width / 2 - 0.1, floor + 1.02, 0.11, 0.025, 0.1)} color="#44403c" roughness={0.35} metalness={0.7} />
    </group>
  )
}

export function Rooms({ rooms = [], dimensions, selectedId, showCeiling = true, onSelect }) {
  return (
    <group>
      {rooms.map((room) => {
        const box = roomBox(room, dimensions)
        const kind = roomKind(room.kind)
        const onDepthWall = room.doorSide !== 'side'
        const span = onDepthWall ? [box.x0, box.x1] : [box.z0, box.z1]
        const reach = span[1] - span[0] - box.doorWidth - 0.24
        const door = {
          center: span[0] + 0.12 + box.doorWidth / 2 + Math.max(0, reach) * room.doorOffset,
          width: box.doorWidth,
          height: box.doorHeight,
        }
        return (
          <group
            key={room.id}
            onPointerDown={(event) => {
              if (!onSelect) return
              event.stopPropagation()
              onSelect(room.id)
            }}
          >
            <Partition axis="x" fixed={box.edgeZ + box.sz * (PARTITION / 2)} low={box.x0} high={box.x1} floor={box.floor} height={box.height} door={onDepthWall ? door : null} />
            <Partition axis="z" fixed={box.edgeX + box.sx * (PARTITION / 2)} low={box.z0} high={box.z1} floor={box.floor} height={box.height} door={onDepthWall ? null : door} />
            {kind.tiled && (
              <PatternMesh position={[box.centerX, box.floor + 0.006, box.centerZ]} size={[room.width - PARTITION, 0.008, room.depth - PARTITION]} spec={TILES} shadows="receive" />
            )}
            {showCeiling && <Box position={[box.centerX, box.floor + box.height + 0.025, box.centerZ]} size={[room.width, 0.05, room.depth]} {...(room.loft ? { color: '#c9a877', roughness: 0.7, metalness: 0 } : PANEL)} />}
            {showCeiling && room.loft && <Loft box={box} room={room} />}
            {selectedId === room.id && (
              <mesh position={[box.centerX, box.floor + box.height / 2, box.centerZ]}>
                <boxGeometry args={[room.width + 0.06, box.height + 0.06, room.depth + 0.06]} />
                <meshBasicMaterial color="#f5b800" wireframe />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}
