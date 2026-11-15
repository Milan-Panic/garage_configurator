import { useState } from 'react'
import { Check } from 'lucide-react'
import { openCheckout } from '../billing/checkout'
import { accessLabel, activeSubscription, formatDate } from '../billing/entitlements'
import { saveCompany, subscriptionOrder, useBilling } from '../billing/paymentService'
import { DIY, SUBSCRIPTIONS, YEARLY_PAID_MONTHS, diyPrice, footprintArea, subscriptionPrice } from '../billing/plans'
import { navigate } from '../nav'
import { formatDin } from '../prices'

const FREE_ITEMS = ['3D konfigurator bez ograničenja', 'Orijentaciona cena dok menjaš objekat', 'Zbir po poslovima', 'Upiti majstorima i firmama, bez naknade', 'Čuvanje projekata u pregledaču']

const DIY_ITEMS = [
  'Crteži sa kotama: osnova, krov, sve fasade i presek',
  'Spisak profila po pozicijama, sa dužinama',
  'Raspored rezanja po šipkama od 6 m, sa otpadom',
  'Table, opšivke, oluk, okov, samorezi i ankeri',
  'Betonska ploča: mere, beton i armatura',
  'Redosled montaže i spisak alata',
  'Lista za nabavku po vrsti dobavljača',
  'PDF za štampu, koliko god puta treba',
]

export function PlansPage({ scene, projectName, billing }) {
  const [period, setPeriod] = useState('month')
  const state = useBilling()
  const subscription = activeSubscription(state)
  const { access } = billing
  const area = footprintArea(scene.dimensions, scene.units)
  const price = diyPrice(area)
  const yearly = period === 'year'

  return (
    <div className="relative h-full overflow-y-auto">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <h1 className="text-4xl leading-none font-bold text-stone-950 md:text-5xl">Paketi</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-stone-700">
          Konfigurator, orijentaciona cena i upiti majstorima su besplatni. Plaća se dokumentacija po kojoj objekat možeš sam da
          napraviš ili da je daš majstoru: crteži, spisak profila, raspored rezanja i lista za nabavku.
        </p>

        <div className="mt-6 inline-grid grid-cols-2 gap-1 rounded-lg bg-stone-300/60 p-1" role="group" aria-label="Period plaćanja pretplate">
          {[
            ['month', 'Mesečno'],
            ['year', 'Godišnje, 2 meseca gratis'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={period === id}
              onClick={() => setPeriod(id)}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${period === id ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-white/70'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Plan name="Besplatno" price="0 RSD" note="bez naloga i bez roka" items={FREE_ITEMS}>
            <button type="button" onClick={() => navigate('/konfigurator')} className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-700">
              Otvori konfigurator
            </button>
          </Plan>

          <Plan name={DIY.name} price={formatDin(price)} note={`jednokratno za jedan projekat, važi ${DIY.days} dana`} items={DIY_ITEMS} featured>
            <table className="w-full text-sm tabular-nums">
              <caption className="pb-1 text-left text-xs text-stone-500">Cena prati površinu osnove</caption>
              <tbody>
                {DIY.tiers.map((tier) => (
                  <tr key={tier.label} className={tier.price === price ? 'font-bold text-stone-950' : 'text-stone-600'}>
                    <td className="py-0.5">{tier.label}</td>
                    <td className="py-0.5 text-right">{formatDin(tier.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-sm leading-relaxed text-stone-700">
              Tvoj projekat „{projectName}” ima {fmt(area)} m². Posle kupovine širina i dužina se ne mogu menjati, a sve ostalo možeš.
            </p>
            {access.source === 'diy' ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">{accessLabel(access)}</p>
            ) : access.full ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">Ovaj projekat je otključan pretplatom.</p>
            ) : (
              <button type="button" onClick={billing.onBuyDiy} className="btn-tape w-full px-4 py-2.5 text-sm">
                {access.expired ? 'Obnovi paket' : 'Kupi za ovaj projekat'}
              </button>
            )}
          </Plan>

          {SUBSCRIPTIONS.map((plan) => {
            const current = subscription?.plan.id === plan.id
            const amount = subscriptionPrice(plan.id, period)
            return (
              <Plan
                key={plan.id}
                name={plan.name}
                price={formatDin(amount)}
                note={yearly ? `godišnje, plaćaš ${YEARLY_PAID_MONTHS} meseci (${formatDin(amount / 12)} mesečno)` : 'mesečno'}
                items={[
                  plan.projects === Infinity ? 'Neograničen broj projekata' : `Do ${plan.projects} projekata mesečno sa svim iz paketa Uradi sam`,
                  'Mere se ne zaključavaju',
                  plan.branding ? 'PDF sa tvojim logom i podacima firme' : 'PDF sa oznakom Mera',
                  'Za majstore, firme i investitore sa više objekata',
                ]}
              >
                {current ? (
                  <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
                    Aktivan do {formatDate(subscription.paidUntil)}
                    {plan.projects !== Infinity && access.quota ? ` Iskorišćeno ${access.quota.used} od ${plan.projects}.` : ''}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => openCheckout(subscriptionOrder(plan.id, period))}
                    className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-700"
                  >
                    {subscription ? `Pređi na ${plan.name}` : `Pretplati se na ${plan.name}`}
                  </button>
                )}
              </Plan>
            )
          })}
        </div>

        {subscription?.plan.branding && <CompanyForm company={state.company} />}

        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-stone-600">
          Plaćanje je trenutno probno: kupovina se beleži samo u ovom pregledaču i novac se ne naplaćuje. Cene paketa su privremene.
        </p>
      </div>
    </div>
  )
}

function Plan({ name, price, note, items, featured = false, children }) {
  return (
    <section className={`flex flex-col rounded-lg bg-white p-5 ${featured ? 'border-[1.5px] border-stone-900' : 'border border-stone-300'}`}>
      <h2 className="text-3xl leading-none font-bold text-stone-950">{name}</h2>
      <p className="font-display mt-3 text-4xl leading-none font-bold text-stone-950 tabular-nums">{price}</p>
      <p className="mt-1 text-sm text-stone-600">{note}</p>
      <ul className="mt-4 flex-1 space-y-1.5 border-t border-stone-200 pt-4 text-sm leading-snug text-stone-800">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <Check size={15} className="mt-0.5 shrink-0 text-accent-500" />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-5 space-y-3">{children}</div>
    </section>
  )
}

// Podaci koje paket Pro stavlja u zaglavlje PDF-a umesto oznake Mera.
function CompanyForm({ company }) {
  function pickLogo(event) {
    const file = event.target.files?.[0]
    if (!file || file.size > 300_000) return
    const reader = new FileReader()
    reader.onload = () => saveCompany({ logo: String(reader.result) })
    reader.readAsDataURL(file)
  }

  return (
    <section className="mt-8 max-w-2xl rounded-lg border border-stone-300 bg-white p-5">
      <h2 className="text-2xl leading-none font-bold text-stone-950">Podaci firme za PDF</h2>
      <p className="mt-1.5 text-sm text-stone-600">Stoje u zaglavlju dokumentacije umesto oznake Mera. Čuvaju se samo u ovom pregledaču.</p>
      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-stone-800">Naziv firme</span>
          <input value={company.name} maxLength={60} onChange={(event) => saveCompany({ name: event.target.value })} className="w-full rounded-lg border border-stone-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-stone-800">Adresa, telefon, PIB</span>
          <input value={company.details} maxLength={120} onChange={(event) => saveCompany({ details: event.target.value })} className="w-full rounded-lg border border-stone-300 px-3 py-2" />
        </label>
        <div className="flex items-center gap-3 text-sm">
          {company.logo && <img src={company.logo} alt="Logo firme" className="h-11 w-auto rounded border border-stone-200" />}
          <label className="cursor-pointer rounded-lg bg-stone-100 px-3 py-2 font-medium text-stone-800 hover:bg-stone-200">
            {company.logo ? 'Zameni logo' : 'Dodaj logo (do 300 KB)'}
            <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="sr-only" onChange={pickLogo} />
          </label>
          {company.logo && (
            <button type="button" onClick={() => saveCompany({ logo: '' })} className="text-stone-600 underline underline-offset-2">
              Ukloni
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function fmt(value) {
  return value.toFixed(1).replace('.', ',')
}
