import { Lock } from 'lucide-react'
import { DIY } from '../billing/plans'
import { navigate } from '../nav'
import { formatDin } from '../prices'

const SAMPLE = [
  ['Stubovi, kutija 80×80×3', '8 kom'],
  ['Venci, kutija 80×40×3', '4 kom'],
  ['Zidni pojasevi, kutija 60×40×2', '12 kom'],
  ['Krovni nosači, kutija 100×50×3', '7 kom'],
  ['Samorezi 4,8×35 sa podloškom', '640 kom'],
]

/*
  Stoji na mestu detalja koji se plaćaju: nekoliko zamućenih primer redova
  i poziv koji odgovara stanju (kupovina, obnova ili otvaranje iz pretplate).
  `billing` je { access, price, onBuyDiy, onUnlock } iz App.jsx.
*/
export function LockedPreview({ title, text, billing, rows = SAMPLE, compact = false }) {
  const { access, price, onBuyDiy, onUnlock } = billing
  const subscriber = access.source === 'starter' || access.source === 'pro'

  return (
    <div className="no-print overflow-hidden rounded-lg bg-white ring-1 ring-stone-300">
      <ul aria-hidden="true" className="divide-y divide-stone-100 opacity-70 blur-[3px] select-none">
        {rows.slice(0, compact ? 3 : 5).map(([name, amount]) => (
          <li key={name} className="flex justify-between gap-3 px-3 py-2 text-sm text-stone-800">
            <span>{name}</span>
            <span className="font-medium tabular-nums">{amount}</span>
          </li>
        ))}
      </ul>
      <div className="space-y-2.5 border-t border-stone-300 bg-stone-50 p-3">
        <p className="flex items-center gap-2 font-semibold text-stone-950">
          <Lock size={15} className="shrink-0" />
          {title}
        </p>
        <p className="text-sm leading-relaxed text-stone-600">{text}</p>
        {subscriber ? (
          access.canUnlock ? (
            <>
              <button type="button" onClick={onUnlock} className="btn-tape w-full px-3 py-2.5 text-sm">
                Otvori ovaj projekat iz pretplate
              </button>
              <p className="text-xs text-stone-500">
                Iskorišćeno {access.quota.used} od {access.quota.limit} projekata u poslednjih 30 dana.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-amber-950">
                Iskoristio si svih {access.quota.limit} projekata u poslednjih 30 dana. Paket Pro nema ograničenje.
              </p>
              <button type="button" onClick={() => navigate('/paketi')} className="btn-tape w-full px-3 py-2.5 text-sm">
                Pogledaj pakete
              </button>
            </>
          )
        ) : (
          <>
            <button type="button" onClick={onBuyDiy} className="btn-tape w-full px-3 py-2.5 text-sm">
              {access.expired ? 'Obnovi paket' : 'Otključaj paket Uradi sam'}, {formatDin(price)}
            </button>
            <p className="text-xs leading-relaxed text-stone-500">
              {access.expired ? 'Paket je istekao, projekat je i dalje sačuvan. ' : ''}
              Jednokratno za ovaj projekat, važi {DIY.days} dana.{' '}
              <a
                href="/paketi"
                onClick={(event) => {
                  event.preventDefault()
                  navigate('/paketi')
                }}
                className="font-semibold text-stone-800 underline underline-offset-2"
              >
                Svi paketi
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
