import { GalleryGrid } from '../components/Gallery'
import { useGallery } from '../gallery'
import { navigate } from '../nav'

// Galerija završenih objekata: fotografije šalju kupci uz ocenu, posle potvrđenog posla.
export function GalleryPage() {
  const items = useGallery()
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <h1 className="text-4xl leading-none font-bold text-stone-950 md:text-5xl">Završeni objekti</h1>
        <p className="mt-3 max-w-2xl text-stone-700">
          Fotografije šalju kupci kad ocene posao. Svaka je od objekta koji je kupac potvrdio kao završen preko Mere, uz ime izvođača.
        </p>
        <div className="mt-8">
          {items === null && <p className="text-stone-500">Učitavam fotografije…</p>}
          {items?.length === 0 && (
            <div className="rounded-xl bg-white p-6 ring-1 ring-stone-200">
              <p className="font-semibold text-stone-900">Još nema fotografija.</p>
              <p className="mt-1 text-sm text-stone-600">Prve stižu kad kupci potvrde završene poslove. Do tada pogledaj gotove modele.</p>
              <button type="button" onClick={() => navigate('/modeli')} className="mt-4 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white">
                Gotovi modeli
              </button>
            </div>
          )}
          {items?.length > 0 && <GalleryGrid items={items} />}
        </div>
      </div>
    </div>
  )
}
