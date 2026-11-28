import { useState } from 'react'
import { Camera, Star, X } from 'lucide-react'
import { formatRating, reviewsLabel } from '../badges'

const MIN_AVERAGE = 5

// Fotografija se smanjuje u pregledaču na najviše 1600 px i šalje kao JPEG, da upload bude brz i na mobilnoj mreži.
async function shrinkPhoto(file) {
  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.naturalWidth * scale)
    canvas.height = Math.round(image.naturalHeight * scale)
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.82)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function Stars({ value, size = 14 }) {
  return (
    <span className="inline-flex" aria-label={`Ocena ${value} od 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= value ? 'fill-amber-400 text-amber-500' : 'text-stone-300'} />
      ))}
    </span>
  )
}

// Ocena posle potvrđenog posla: zvezdice, kratak komentar, grad i fotografija objekta.
export function ReviewForm({ kind, jobId, who, onDone }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [city, setCity] = useState('')
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (!rating) return setProblem('Izaberi broj zvezdica.')
    setBusy(true)
    setProblem('')
    try {
      const response = await fetch('/api/customer/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, jobId, rating, comment, city, photo }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Ocena nije sačuvana.')
      onDone?.(payload.review)
    } catch (error) {
      setProblem(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-2 space-y-2 rounded-lg bg-stone-50 p-3 text-sm ring-1 ring-stone-200">
      <p className="font-semibold text-stone-900">Oceni {who}</p>
      <div className="flex gap-1" role="radiogroup" aria-label="Ocena">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} od 5`} onClick={() => setRating(n)} className="p-0.5">
            <Star size={26} className={n <= rating ? 'fill-amber-400 text-amber-500' : 'text-stone-300'} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={600}
        rows={2}
        placeholder="Kako je prošlo? Rok, dogovor, kvalitet."
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
      />
      <input value={city} onChange={(event) => setCity(event.target.value)} maxLength={60} placeholder="Mesto gde je objekat, npr. Čačak" className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2" />
      <div className="flex items-center gap-2">
        {photo ? (
          <span className="relative">
            <img src={photo} alt="Fotografija objekta" className="h-16 w-24 rounded-md object-cover" />
            <button type="button" onClick={() => setPhoto(null)} aria-label="Ukloni fotografiju" className="absolute -top-1.5 -right-1.5 rounded-full bg-white p-0.5 shadow ring-1 ring-stone-300">
              <X size={12} />
            </button>
          </span>
        ) : (
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800 hover:bg-stone-100">
            <Camera size={15} />
            Dodaj fotografiju objekta
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) shrinkPhoto(file).then(setPhoto).catch(() => setProblem('Fotografija nije mogla da se učita.'))
              }}
            />
          </label>
        )}
        <span className="text-xs text-stone-500">Fotografija ide u galeriju završenih objekata.</span>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="rounded-lg bg-stone-900 px-4 py-2 font-medium text-white disabled:opacity-50">
          {busy ? 'Šaljem…' : 'Pošalji ocenu'}
        </button>
        {problem && <span className="text-xs text-red-700">{problem}</span>}
      </div>
    </form>
  )
}

// Ocene na profilu: prosek tek od 5 ocena, svaka sa imenom, mestom i fotografijom.
export function ReviewList({ list }) {
  if (!list || list.count === 0) {
    return <p className="text-sm text-stone-600">Još nema ocena. Ocenu ostavlja samo kupac koji je potvrdio da je posao završen.</p>
  }
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm text-stone-700">
        {list.average ? (
          <>
            <Stars value={Math.round(list.average)} size={16} />
            <strong className="text-stone-950">{formatRating(list.average)}</strong> od 5 · {reviewsLabel(list.count)}
          </>
        ) : (
          <>
            {reviewsLabel(list.count)}. Prosečna ocena se prikazuje od {MIN_AVERAGE} ocena.
          </>
        )}
      </p>
      <ul className="space-y-3">
        {list.items.map((item) => (
          <li key={item.id} className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3">
            {item.photo && (
              <a href={item.photo} target="_blank" rel="noreferrer" className="shrink-0">
                <img src={item.photo} alt={`Objekat, ${item.city}`} loading="lazy" className="h-20 w-28 rounded-lg object-cover" />
              </a>
            )}
            <div className="min-w-0 text-sm">
              <Stars value={item.rating} />
              {item.comment && <p className="mt-1 text-stone-800">{item.comment}</p>}
              <p className="mt-1 text-xs text-stone-500">
                {item.name}, {item.city} · {new Date(item.createdAt).toLocaleDateString('sr-Latn-RS', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
