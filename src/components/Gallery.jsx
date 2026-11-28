import { navigate } from '../nav'
import { Stars } from './Reviews'

export function GalleryGrid({ items }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const profile = `/${item.kind === 'partner' ? 'firma' : 'majstor'}/${item.targetId}`
        return (
          <li key={item.id} className="overflow-hidden rounded-xl bg-white ring-1 ring-stone-200">
            <a href={item.photo} target="_blank" rel="noreferrer">
              <img src={item.photo} alt={`Završen objekat, ${item.city}`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
            </a>
            <div className="p-2.5 text-sm">
              <Stars value={item.rating} size={12} />
              {item.comment && <p className="mt-1 line-clamp-2 text-stone-700">{item.comment}</p>}
              <p className="mt-1 text-xs text-stone-500">
                {item.name}, {item.city} ·{' '}
                <a href={profile} onClick={(event) => { event.preventDefault(); navigate(profile) }} className="underline">
                  {item.targetName || 'izvođač'}
                </a>
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
