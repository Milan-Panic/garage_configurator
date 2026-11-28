import { useMemo, useState } from 'react'
import { CATEGORIES, MODELS } from '../catalog'
import { ModelCard, ShotQueue } from '../components/ModelCard'
import { modelPrice } from '../modelView'
import { recordModelView, useModelViews } from '../views'

const SIZES = [
  { id: 'all', name: 'Sve veličine', test: () => true },
  { id: 'small', name: 'Do 20 m²', test: (area) => area <= 20 },
  { id: 'medium', name: '20–60 m²', test: (area) => area > 20 && area <= 60 },
  { id: 'large', name: 'Preko 60 m²', test: (area) => area > 60 },
]

const SORTS = [
  { id: 'popular', name: 'Najotvaraniji' },
  { id: 'cheap', name: 'Najjeftiniji' },
  { id: 'size', name: 'Najmanji' },
]

export function ModelsPage({ onStartFrom, onQuiz }) {
  const views = useModelViews()
  const [category, setCategory] = useState('all')
  const [size, setSize] = useState('all')
  const [sort, setSort] = useState('popular')
  const prices = useMemo(() => Object.fromEntries(MODELS.map((model) => [model.id, modelPrice(model.scene)])), [])

  const shown = useMemo(() => {
    const test = SIZES.find((entry) => entry.id === size).test
    const list = MODELS.filter((model) => (category === 'all' || model.category === category) && test(model.scene.dimensions.width * model.scene.dimensions.length * (model.scene.units || 1)))
    const area = (model) => model.scene.dimensions.width * model.scene.dimensions.length * (model.scene.units || 1)
    if (sort === 'cheap') return [...list].sort((a, b) => prices[a.id] - prices[b.id])
    if (sort === 'size') return [...list].sort((a, b) => area(a) - area(b))
    return [...list].sort((a, b) => (views[b.id] || 0) - (views[a.id] || 0))
  }, [category, size, sort, views, prices])

  function open(model) {
    recordModelView(model.id)
    onStartFrom(model.scene)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <h1 className="text-4xl leading-none font-bold text-stone-950 md:text-5xl">Gotovi modeli</h1>
        <p className="mt-3 max-w-2xl text-stone-700">
          Izaberi objekat koji liči na ono što ti treba, pa ga otvori u konfiguratoru i promeni mere, boje, vrata i opremu. Cene su okvirne, sa PDV-om, za materijal.
        </p>
        {onQuiz && (
          <button type="button" onClick={onQuiz} className="mt-4 rounded-lg border border-stone-900 px-4 py-2 text-sm font-semibold text-stone-900 hover:bg-stone-900 hover:text-white">
            Ne znaš šta da izabereš? Odgovori na 3 pitanja
          </button>
        )}

        <div className="mt-6 flex flex-wrap gap-1.5" role="group" aria-label="Namena">
          {[{ id: 'all', name: 'Sve' }, ...CATEGORIES].map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={category === entry.id}
              onClick={() => setCategory(entry.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${category === entry.id ? 'bg-stone-900 text-white' : 'bg-white text-stone-700 ring-1 ring-stone-300 hover:ring-stone-500'}`}
            >
              {entry.name}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-stone-600">Veličina</span>
            <select value={size} onChange={(event) => setSize(event.target.value)} className="rounded-lg border border-stone-300 bg-white px-2 py-1.5">
              {SIZES.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-stone-600">Redosled</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-lg border border-stone-300 bg-white px-2 py-1.5">
              {SORTS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
          <span className="text-stone-500">{shown.length} modela</span>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((model) => (
            <ModelCard key={model.id} model={model} views={views[model.id]} onOpen={open} />
          ))}
        </div>
        {shown.length === 0 && <p className="mt-6 text-stone-600">Nema modela za ovaj izbor. Probaj drugu veličinu.</p>}
        <p className="mt-8 text-sm text-stone-500">Ne vidiš ono što ti treba? Otvori najsličniji model i prilagodi ga, ili kreni od nule u konfiguratoru.</p>
      </div>
      <ShotQueue models={shown} />
    </div>
  )
}
