import { Shield } from 'lucide-react'
import { PROTECTION_TERMS } from '../badges'

// Šta znači oznaka „Mera zaštita“: uslovi koje firma ili majstor prihvata.
export function ProtectionInfo({ open = false, accepted = null }) {
  return (
    <details open={open} className="group rounded-xl bg-amber-50/70 ring-1 ring-amber-300">
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm font-semibold text-amber-950">
        <Shield size={16} />
        {accepted === null ? 'Šta je Mera zaštita' : accepted ? 'Prihvata uslove Mera zaštite' : 'Nije prihvatio uslove Mera zaštite'}
        <span aria-hidden="true" className="ml-auto text-lg leading-none text-amber-700 transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="space-y-2 px-3 pb-3 text-sm text-stone-800">
        <p className="text-stone-700">Oznaku imaju firme i majstori koji su pristali na ove uslove za svaki posao dogovoren preko Mere:</p>
        <ul className="space-y-1.5">
          {PROTECTION_TERMS.map(([title, text]) => (
            <li key={title}>
              <strong className="font-semibold text-stone-950">{title}.</strong> {text}
            </li>
          ))}
        </ul>
        <p className="text-xs text-stone-600">Ako se uslovi ne poštuju, javi Meri.</p>
      </div>
    </details>
  )
}
