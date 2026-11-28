import { useEffect, useMemo, useState } from 'react'
import { Eye, Ruler } from 'lucide-react'
import { modelPrice, sceneViewProps } from '../modelView'
import { formatRange } from '../pricing'
import { viewsLabel } from '../views'
import { GarageView } from './GarageView'

const SHOT_VERSION = 1

// Slike modela se prave u pregledaču, jedna po jedna, kroz jedan skriveni 3D
// prikaz. Tako katalog sa desetinama modela ne otvara desetine 3D platna.
const shots = new Map()
const listeners = new Set()

function shotKey(model) {
  let hash = 0
  const text = JSON.stringify(model.scene)
  for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) | 0
  return `mera-shot-${SHOT_VERSION}-${model.id}-${hash}`
}

function readShot(model) {
  const key = shotKey(model)
  if (shots.has(key)) return shots.get(key)
  try {
    const stored = localStorage.getItem(key)
    if (stored) shots.set(key, stored)
    return stored
  } catch {
    return null
  }
}

function storeShot(model, image) {
  const key = shotKey(model)
  shots.set(key, image)
  try {
    localStorage.setItem(key, image)
  } catch {
    // Pun localStorage: slika ostaje samo do zatvaranja strane.
  }
  listeners.forEach((listener) => listener())
}

function useShotVersion() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const listener = () => setTick((value) => value + 1)
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, [])
}

// Jedan skriveni prikaz koji redom slika modele koji još nemaju sliku.
export function ShotQueue({ models }) {
  useShotVersion()
  const next = models.find((model) => !readShot(model))
  if (!next) return null
  return (
    <div aria-hidden="true" className="pointer-events-none fixed top-0 -left-[2000px] h-[300px] w-[450px]">
      <GarageView key={next.id} {...sceneViewProps(next.scene)} theta={0.7} background="#e7e5e4" onShot={(image) => storeShot(next, image)} className="h-[300px] w-[450px]" />
    </div>
  )
}

export function ModelCard({ model, views, onOpen, compact = false }) {
  useShotVersion()
  const image = readShot(model)
  const price = useMemo(() => modelPrice(model.scene), [model])
  const label = viewsLabel(views)
  const { width, length } = model.scene.dimensions
  const units = model.scene.units || 1
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-stone-300 bg-white">
      <button type="button" onClick={() => onOpen(model)} className="relative block aspect-[3/2] w-full bg-stone-200" aria-label={`Otvori model ${model.name}`}>
        {image ? <img src={image} alt={model.name} className="h-full w-full object-cover" loading="lazy" /> : <span className="absolute inset-0 animate-pulse bg-stone-200" />}
        <span className="absolute top-2 left-2 rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-semibold text-stone-800">
          {label ? (
            <span className="flex items-center gap-1">
              <Eye size={12} /> {label}
            </span>
          ) : (
            'Novo'
          )}
        </span>
      </button>
      <div className="flex flex-1 flex-col p-3">
        <h3 className={`font-display leading-tight font-bold text-stone-950 ${compact ? 'text-lg' : 'text-xl'}`}>{model.name}</h3>
        {!compact && <p className="mt-1 flex-1 text-sm leading-snug text-stone-600">{model.description}</p>}
        <p className="mt-2 flex items-baseline justify-between gap-2 border-t border-stone-200 pt-2 text-sm">
          <span className="flex items-center gap-1 text-stone-600">
            <Ruler size={13} />
            {units > 1 ? `${units} × ` : ''}
            {fmt(width)} × {fmt(length)} m
          </span>
          <span className="font-semibold text-stone-950 tabular-nums">{formatRange(price)}</span>
        </p>
        <button type="button" onClick={() => onOpen(model)} className="mt-3 rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700">
          Otvori i prilagodi
        </button>
      </div>
    </article>
  )
}

function fmt(value) {
  return String(Math.round(value * 10) / 10).replace('.', ',')
}
