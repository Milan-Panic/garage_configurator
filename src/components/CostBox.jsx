import { Check, CircleDashed } from 'lucide-react'
import { costBreakdown, formatSpan } from '../pricing'

// Šta je u ceni, a šta kupac plaća pored nje. Stoji svuda gde je raspon cene,
// da na kraju ne bude iznenađenja.
export function CostBox({ scene, quote, tone = 'light', compact = false }) {
  const { included, extras } = costBreakdown(scene, quote)
  const dark = tone === 'dark'
  const muted = dark ? 'text-stone-400' : 'text-stone-500'
  const text = dark ? 'text-stone-200' : 'text-stone-800'
  return (
    <div className={`grid gap-3 text-xs ${compact ? '' : 'sm:grid-cols-2'}`}>
      <div>
        <p className={`mb-1 font-semibold ${text}`}>Uključeno u cenu</p>
        <ul className="space-y-0.5">
          {included.map((name) => (
            <li key={name} className={`flex gap-1.5 ${text}`}>
              <Check size={13} className="mt-0.5 shrink-0 text-emerald-500" />
              {name}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className={`mb-1 font-semibold ${text}`}>Nije uključeno, mogući troškovi</p>
        <ul className="space-y-1">
          {extras.map((item) => (
            <li key={item.name} className={`flex gap-1.5 ${text}`}>
              <CircleDashed size={13} className="mt-0.5 shrink-0 text-amber-500" />
              <span>
                {item.name}
                {item.span && <span className="font-semibold tabular-nums"> · okvirno {formatSpan(item.span)}</span>}
                {item.note && <span className={`block ${muted}`}>{item.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className={`${compact ? '' : 'sm:col-span-2'} ${muted}`}>
        Cene su okvirne, sa PDV-om. Tačnu cenu daje firma u ponudi, posle izlaska na teren.
      </p>
    </div>
  )
}
