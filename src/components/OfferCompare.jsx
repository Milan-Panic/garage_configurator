import { ListChecks } from 'lucide-react'
import { yearsLabel } from '../badges'
import { navigate } from '../nav'
import { formatDin } from '../prices'
import { TrustBadge } from './TrustBadge'
import { ProtectionInfo } from './Protection'

// Ponuda firme u istim kolonama kao sve ostale, da kupac poredi jabuke sa jabukama.
export function OfferTerms({ offer }) {
  const { partner } = offer
  const terms = partner.terms || {}
  const rows = [
    ['Ukupno, sa PDV-om', formatDin(offer.total)],
    ['Garancija: konstrukcija / pokrivač / montaža', [terms.warrantyStructure, terms.warrantyCover, terms.warrantyWork].map((value) => (value ? yearsLabel(value) : '—')).join(' / ')],
    ['Rok montaže', terms.installDays ? `oko ${terms.installDays} dana` : 'nije upisan'],
    ['Avans', terms.deposit || 'nije upisan'],
  ]
  return (
    <span className="mt-1.5 block space-y-1">
      <span className="grid gap-x-3 gap-y-0.5 text-xs sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <span key={label} className="flex justify-between gap-2 border-b border-stone-200/70 pb-0.5">
            <span className="text-stone-500">{label}</span>
            <span className="text-right font-medium text-stone-800">{value}</span>
          </span>
        ))}
      </span>
      <span className="flex flex-wrap items-center gap-2">
        <TrustBadge jobs={partner.completedJobs} verified={partner.verified} protectedBy={partner.protected} reviews={partner.reviews} />
        <span
          role="link"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation()
            navigate(`/firma/${partner.id}`)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') navigate(`/firma/${partner.id}`)
          }}
          className="cursor-pointer text-xs text-stone-700 underline"
        >
          Profil firme
        </span>
      </span>
    </span>
  )
}

const CHECKLIST = [
  ['Debljina lima', 'Lim od 0,5 mm i od 0,7 mm izgleda isto na slici, a razlikuju se u ceni i trajanju.'],
  ['Vrsta panela', 'Sendvič panel sa vunom ili sa stiroporom, i koliko je debeo.'],
  ['Konstrukcija i ankeri', 'Profili, debljina zida profila i kako se objekat vezuje za ploču.'],
  ['Betonska ploča', 'Da li je ploča u ponudi, koliko je debela i da li ima armaturu.'],
  ['Oluci i opšivke', 'Često se izostave iz ponude, pa se dodaju na kraju.'],
  ['Prevoz', 'Da li je u ceni i do koje udaljenosti.'],
  ['Montaža', 'Ko montira, za koliko dana i da li je to u ceni.'],
  ['Garancija', 'Na šta tačno i koliko godina: konstrukcija, pokrivač, montaža.'],
  ['PDV', 'Da li je cena sa PDV-om. Razlika je 20%.'],
]

// Vodič „Kako uporediti ponude“: lista materijala iz računice je argument u pregovoru.
export function OfferGuide() {
  return (
    <details className="group rounded-xl bg-white ring-1 ring-stone-200">
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm font-semibold text-stone-900">
        <ListChecks size={16} className="text-stone-500" />
        Kako uporediti ponude
        <span aria-hidden="true" className="ml-auto text-lg leading-none text-stone-400 transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="space-y-2 px-3 pb-3 text-sm">
        <p className="text-stone-600">
          Dve ponude sa istom merom nisu iste ako se razlikuju u ovim stavkama. Pitaj svaku firmu za sve, i uporedi sa spiskom materijala iz računice: to je tvoj argument
          kad se cenkaš.
        </p>
        <ol className="list-decimal space-y-1.5 pl-5 text-stone-700">
          {CHECKLIST.map(([title, text]) => (
            <li key={title}>
              <strong className="font-semibold text-stone-900">{title}.</strong> {text}
            </li>
          ))}
        </ol>
        <p className="text-xs text-stone-500">Avans daj samo uz avansni račun i pisanu ponudu sa rokom. Bolje je avans po fazama nego ceo iznos unapred.</p>
        <ProtectionInfo />
      </div>
    </details>
  )
}
