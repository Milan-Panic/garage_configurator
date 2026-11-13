import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { FLOOR_LEVEL } from '../config'
import { usePlaneDrag } from './drag'
import { Box, Cyl, paint } from './parts'

const FLOOR_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), -FLOOR_LEVEL)

export function Car({ item, selected, clash = false, base = 0, onSelect, onChange, onGestureEnd }) {
  function handleDrag(point, start, extra) {
    onChange({
      x: extra.x + (point.x - start.x),
      z: extra.z + (point.z - start.z),
    })
  }

  const { startDrag } = usePlaneDrag(handleDrag, onGestureEnd)

  return (
    <group position={[item.x, FLOOR_LEVEL, item.z]} rotation={[0, item.rotation, 0]}>
      <group
        onPointerOver={(event) => {
          event.stopPropagation()
          document.body.style.cursor = 'grab'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
        onPointerDown={(event) => {
          onSelect()
          startDrag(event, FLOOR_PLANE, { x: item.x, z: item.z })
        }}
      >
        <group position={[0, base, 0]}>
          <CarModel length={item.length} width={item.width} height={item.height} kind={item.kind} color={item.color} />
        </group>
        {(selected || clash) && (
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[item.width + 0.1, 0.02, item.length + 0.1]} />
            <meshBasicMaterial color={clash ? '#dc2626' : '#f97316'} wireframe />
          </mesh>
        )}
      </group>
    </group>
  )
}

// Silueta po tipu: mere su udeli dužine (0 je zadnji kraj, 1 prednji) i visine.
const SHAPES = {
  hatch: { rearBase: 0.02, roofRear: 0.12, roofFront: 0.58, cowl: 0.75, belt: 0.58, nose: 0.5, tail: 0.6, axleRear: 0.17, axleFront: 0.8 },
  sedan: { rearBase: 0.17, roofRear: 0.32, roofFront: 0.6, cowl: 0.75, belt: 0.59, nose: 0.5, tail: 0.57, axleRear: 0.2, axleFront: 0.81 },
  wagon: { rearBase: 0.02, roofRear: 0.07, roofFront: 0.6, cowl: 0.75, belt: 0.58, nose: 0.5, tail: 0.6, axleRear: 0.2, axleFront: 0.81 },
  suv: { rearBase: 0.02, roofRear: 0.08, roofFront: 0.6, cowl: 0.74, belt: 0.6, nose: 0.54, tail: 0.62, axleRear: 0.19, axleFront: 0.81 },
  van: { rearBase: 0.01, roofRear: 0.03, roofFront: 0.8, cowl: 0.91, belt: 0.5, nose: 0.42, tail: 0.52, axleRear: 0.2, axleFront: 0.84 },
  pickup: { rearBase: 0.42, roofRear: 0.45, roofFront: 0.63, cowl: 0.76, belt: 0.56, nose: 0.5, tail: 0.54, axleRear: 0.2, axleFront: 0.82, bed: true },
}

const GLASS = paint('#16222b', 0.06, 0.7)
const TRIM = paint('#15171a', 0.6, 0.3)
const TIRE = paint('#131416', 0.88, 0.05)
const RIM = paint('#c9cdd2', 0.28, 0.85)

function carGeometry(length, width, height, kind) {
  const shape = SHAPES[kind] ?? SHAPES.sedan
  const rear = -length / 2
  const front = length / 2
  const at = (fraction) => rear + length * fraction
  const wheelR = Math.min(0.38, Math.max(0.26, height * 0.215))
  const clearance = Math.min(0.24, wheelR * 0.62)
  const arch = wheelR + 0.06
  const dip = Math.sqrt(Math.max(0.0001, arch * arch - (wheelR - clearance) ** 2))
  const lift = Math.asin(Math.min(1, (wheelR - clearance) / arch))
  const belt = height * shape.belt
  const nose = height * shape.nose
  const tail = height * shape.tail
  const axles = [at(shape.axleRear), at(shape.axleFront)]
  const deckStart = Math.max(at(shape.rearBase), rear + 0.12)
  const longDeck = deckStart - rear > 0.3

  const body = new THREE.Shape()
  body.moveTo(rear + 0.06, clearance)
  axles.forEach((axle) => {
    body.lineTo(axle - dip, clearance)
    body.absarc(axle, wheelR, arch, Math.PI + lift, -lift, true)
  })
  body.lineTo(front - 0.08, clearance)
  body.quadraticCurveTo(front, clearance, front, clearance + 0.12)
  body.lineTo(front, nose - 0.1)
  body.quadraticCurveTo(front, nose, front - 0.14, nose + 0.01)
  body.lineTo(at(shape.cowl), belt)
  body.lineTo(deckStart, belt)
  if (longDeck) body.lineTo(rear + 0.12, tail)
  const rearTop = longDeck ? tail : belt
  body.quadraticCurveTo(rear, rearTop, rear, rearTop - 0.12)
  body.lineTo(rear, clearance + 0.1)
  body.quadraticCurveTo(rear, clearance, rear + 0.06, clearance)

  const bodyWidth = width * 0.97
  const bevel = 0.05
  const bodyGeometry = new THREE.ExtrudeGeometry(body, {
    depth: bodyWidth - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: 0.04,
    bevelOffset: -0.04,
    bevelSegments: 3,
    curveSegments: 14,
  })

  const base = belt - 0.03
  const top = height - 0.04
  const b0 = at(shape.rearBase)
  const b1 = at(shape.cowl)
  const r0 = at(shape.roofRear)
  const r1 = at(shape.roofFront)
  const cabin = new THREE.Shape()
  cabin.moveTo(b0, base)
  cabin.lineTo(b1, base)
  cabin.lineTo(r1, top)
  cabin.lineTo(r0, top)
  cabin.closePath()
  const cabinWidth = width * 0.84
  const glassGeometry = new THREE.ExtrudeGeometry(cabin, { depth: cabinWidth, bevelEnabled: false })

  // Bočna stranica kabine: lim sa isečenim prozorima, staklo se vidi kroz njih.
  const side = new THREE.Shape()
  side.moveTo(b0, base)
  side.lineTo(b1, base)
  side.lineTo(r1, top)
  side.lineTo(r0, top)
  side.closePath()
  const pillar = 0.07
  const low = base + 0.07
  const high = top - 0.07
  const span = top - base
  const leftAt = (y) => b0 + ((r0 - b0) * (y - base)) / span
  const rightAt = (y) => b1 + ((r1 - b1) * (y - base)) / span
  const split = r0 + (r1 - r0) * (shape.bed ? 0.5 : 0.52)
  const panes = [
    [
      [leftAt(low) + pillar, low],
      [split - pillar / 2, low],
      [split - pillar / 2, high],
      [leftAt(high) + pillar, high],
    ],
    [
      [split + pillar / 2, low],
      [rightAt(low) - pillar, low],
      [rightAt(high) - pillar, high],
      [split + pillar / 2, high],
    ],
  ]
  panes.forEach((points) => {
    if (points[1][0] - points[0][0] < 0.12 || points[2][0] - points[3][0] < 0.08) return
    const hole = new THREE.Path()
    hole.moveTo(points[0][0], points[0][1])
    points.slice(1).forEach(([x, y]) => hole.lineTo(x, y))
    hole.closePath()
    side.holes.push(hole)
  })
  const sideGeometry = new THREE.ExtrudeGeometry(side, { depth: 0.03, bevelEnabled: false })

  return {
    shape,
    bodyGeometry,
    glassGeometry,
    sideGeometry,
    bodyWidth,
    bevel,
    cabinWidth,
    wheelR,
    clearance,
    axles,
    belt,
    nose,
    tail: rearTop,
    top,
    roof: { from: r0, to: r1 },
    cowl: b1,
    split,
    rear,
    front,
    deck: { from: rear + 0.14, to: b0 - 0.08 },
  }
}

export function CarModel({ length, width, height, kind = 'sedan', color = '#1d4e89' }) {
  const model = useMemo(() => carGeometry(length, width, height, kind), [length, width, height, kind])
  useEffect(
    () => () => {
      model.bodyGeometry.dispose()
      model.glassGeometry.dispose()
      model.sideGeometry.dispose()
    },
    [model],
  )
  const skin = paint(color, 0.3, 0.55)
  const { wheelR, clearance, belt, nose, tail, top, rear, front, cabinWidth } = model
  const wheelW = Math.min(0.24, width * 0.125)
  const trackX = width / 2 - wheelW / 2 - 0.015
  // Ekstruzija ide po lokalnoj Z osi; okret za −90° je polaže popreko auta.
  const across = [0, -Math.PI / 2, 0]

  return (
    <group>
      <mesh geometry={model.bodyGeometry} material={skin} rotation={across} position={[model.bodyWidth / 2 - model.bevel, 0, 0]} castShadow receiveShadow />
      <mesh geometry={model.glassGeometry} material={GLASS} rotation={across} position={[cabinWidth / 2, 0, 0]} castShadow />
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={model.sideGeometry} material={skin} rotation={across} position={[side * (cabinWidth / 2 + 0.004) + 0.015, 0, 0]} />
      ))}
      <Box position={[0, top + 0.012, (model.roof.from + model.roof.to) / 2]} size={[cabinWidth + 0.04, 0.05, model.roof.to - model.roof.from + 0.05]} color={color} roughness={0.3} metalness={0.55} />
      <Box position={[0, clearance + 0.09, 0]} size={[width * 0.68, 0.2, length * 0.92]} color="#101113" roughness={0.9} shadow={false} />

      {model.shape.bed && model.deck.to - model.deck.from > 0.4 && (
        <Box position={[0, belt + 0.004, (model.deck.from + model.deck.to) / 2]} size={[width * 0.78, 0.02, model.deck.to - model.deck.from]} color="#17181a" roughness={0.85} shadow={false} />
      )}

      {/* Farovi, maska i branik */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box position={[side * width * 0.33, nose - 0.09, front - 0.03]} size={[width * 0.22, 0.09, 0.08]} color="#f6f1dc" roughness={0.15} metalness={0.2} extra={{ emissive: '#fff1b8', emissiveIntensity: 0.55 }} shadow={false} />
          <Box position={[side * width * 0.35, tail - 0.11, rear + 0.03]} size={[width * 0.2, 0.09, 0.08]} color="#b91c1c" roughness={0.25} extra={{ emissive: '#7f1d1d', emissiveIntensity: 0.7 }} shadow={false} />
          <Box position={[side * (cabinWidth / 2 + 0.1), belt + 0.07, model.cowl - 0.1]} size={[0.14, 0.09, 0.07]} color={color} roughness={0.3} metalness={0.55} />
          <Box position={[side * (model.bodyWidth / 2 + 0.001), (belt + clearance) / 2 + 0.06, model.split]} size={[0.006, belt - clearance - 0.16, 0.012]} color="#0c0d0e" roughness={0.8} shadow={false} />
          <Box position={[side * (model.bodyWidth / 2 + 0.001), (belt + clearance) / 2 + 0.06, model.cowl - 0.06]} size={[0.006, belt - clearance - 0.16, 0.012]} color="#0c0d0e" roughness={0.8} shadow={false} />
          <Box position={[side * (model.bodyWidth / 2 + 0.008), belt - 0.1, model.split + 0.16]} size={[0.02, 0.025, 0.13]} color="#d4d4d8" roughness={0.25} metalness={0.85} shadow={false} />
        </group>
      ))}
      <Box position={[0, nose - 0.1, front + 0.004]} size={[width * 0.4, 0.09, 0.02]} color="#0f1012" roughness={0.6} metalness={0.4} shadow={false} />
      <Box position={[0, clearance + 0.1, front + 0.004]} size={[width * 0.72, 0.11, 0.02]} color="#0f1012" roughness={0.7} shadow={false} />
      <Box position={[0, clearance + 0.24, front + 0.012]} size={[0.46, 0.1, 0.01]} color="#f5f5f4" roughness={0.5} shadow={false} />
      <Box position={[0, clearance + 0.1, rear - 0.004]} size={[width * 0.72, 0.11, 0.02]} color="#0f1012" roughness={0.7} shadow={false} />
      <Box position={[0, Math.max(clearance + 0.26, tail - 0.26), rear - 0.012]} size={[0.46, 0.1, 0.01]} color="#f5f5f4" roughness={0.5} shadow={false} />

      {model.axles.flatMap((z) =>
        [-1, 1].map((side) => (
          <group key={`${z}${side}`} position={[side * trackX, wheelR, z]}>
            <mesh geometry={WHEEL_TIRE} material={TIRE} rotation={[0, 0, Math.PI / 2]} scale={[wheelR * 2, wheelW, wheelR * 2]} castShadow />
            <mesh geometry={WHEEL_TIRE} material={RIM} rotation={[0, 0, Math.PI / 2]} scale={[wheelR * 1.3, wheelW + 0.012, wheelR * 1.3]} />
            {[0, 1, 2, 3, 4].map((spoke) => (
              <mesh key={spoke} material={TRIM} geometry={SPOKE} rotation={[(spoke / 5) * Math.PI * 2, 0, 0]} scale={[wheelW + 0.02, wheelR * 0.62, wheelR * 0.2]} position={[0, Math.cos((spoke / 5) * Math.PI * 2) * wheelR * 0.33, Math.sin((spoke / 5) * Math.PI * 2) * wheelR * 0.33]} />
            ))}
            <Cyl position={[0, 0, 0]} size={[wheelR * 0.36, wheelW + 0.03]} axis="x" color="#8d9197" roughness={0.3} metalness={0.8} shadow={false} />
          </group>
        )),
      )}
    </group>
  )
}

const WHEEL_TIRE = new THREE.CylinderGeometry(0.5, 0.5, 1, 28)
const SPOKE = new THREE.BoxGeometry(1, 1, 1)
