import { Check } from 'lucide-react'

const when = (value) =>
  new Date(value).toLocaleString('sr-Latn-RS', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })

// Praćenje upita: poslat, prosleđen, pročitan, odgovoren. Kupac vidi gde mu je upit.
export function TrackSteps({ track, who = 'firma', protectedBy = false }) {
  if (!track) return null
  if (track.rejectedAt) {
    return <p className="mt-2 text-xs text-stone-600">Mera nije prosledila ovaj upit ({when(track.rejectedAt)}). Pogledaj poruku na imejlu ili izaberi drugog izvođača.</p>
  }
  const steps = [
    ['Poslat', track.sentAt],
    [who === 'firma' ? 'Prosleđen firmi' : 'Prosleđen majstoru', track.forwardedAt],
    ['Pročitan', track.readAt],
    [who === 'firma' ? 'Firma se javila' : 'Majstor odgovorio', track.answeredAt],
  ]
  const waiting = track.forwardedAt && !track.answeredAt
  return (
    <div className="mt-2">
      <ol className="grid grid-cols-4 gap-1 text-[11px]">
        {steps.map(([label, at], index) => (
          <li key={label} className="flex flex-col items-start gap-0.5">
            <span className="flex w-full items-center gap-1">
              <span className={`grid size-4 shrink-0 place-items-center rounded-full ${at ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-400'}`}>
                {at ? <Check size={10} strokeWidth={3} /> : <span className="size-1 rounded-full bg-current" />}
              </span>
              {index < steps.length - 1 && <span className={`h-0.5 flex-1 rounded ${steps[index + 1][1] ? 'bg-emerald-500' : 'bg-stone-200'}`} />}
            </span>
            <span className={at ? 'font-semibold text-stone-900' : 'text-stone-500'}>{label}</span>
            {at && <span className="text-stone-500">{when(at)}</span>}
          </li>
        ))}
      </ol>
      {waiting && protectedBy && <p className="mt-1 text-[11px] text-amber-900">Uz Mera zaštitu {who === 'firma' ? 'firma se obavezala' : 'majstor se obavezao'} da se javi istog radnog dana.</p>}
    </div>
  )
}
