import { useCallback, useEffect, useState } from 'react'
import { PriceEditor } from '../components/PriceEditor'
import { CHARGE_KIND } from '../partners'
import { PACKAGES, formatDin, packageName } from '../prices'

const TOKEN_KEY = 'mera-partner-token'

export function PartnerPage() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [data, setData] = useState(null)
  const [mode, setMode] = useState('login')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setData(null)
  }, [])

  const load = useCallback(async () => {
    const response = await fetch('/api/partner/me', { headers: { Authorization: `Bearer ${token}` } })
    if (response.status === 401) {
      signOut()
      return
    }
    setData(await response.json())
  }, [token, signOut])

  useEffect(() => {
    if (token) load().catch(() => {})
  }, [token, load])

  async function login(event) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/partner/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    })
    const payload = await response.json()
    if (!response.ok) {
      setError(payload.error || 'Prijava nije uspela.')
      return
    }
    localStorage.setItem(TOKEN_KEY, payload.token)
    setToken(payload.token)
  }

  async function register(event) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/partner/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        city: form.get('city'),
        phone: form.get('phone'),
        email: form.get('email'),
        website: form.get('website'),
        delivery: form.get('delivery'),
        password: form.get('password'),
        packages: form.getAll('packages'),
      }),
    })
    const payload = await response.json()
    if (!response.ok) {
      setError(payload.error || 'Prijava firme nije poslata.')
      return
    }
    setMode('login')
    setNotice('Prijava je poslata. Možeš odmah da se prijaviš i uneseš cene, a kupci ih vide kad administrator odobri firmu.')
  }

  async function savePrices(prices, validUntil) {
    const response = await fetch('/api/partner/prices', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ prices, validUntil }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Cenovnik nije sačuvan.')
    await load()
  }

  async function reportSale(id, amount) {
    const response = await fetch(`/api/partner/leads/${id}/sale`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Prodaja nije prijavljena.')
    await load()
  }

  const partner = data?.partner
  const unpaid = (data?.charges || []).filter((item) => !item.paidAt).reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm font-medium tracking-wide text-stone-500 uppercase">Za firme</p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-950">Partnerski nalog</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-700">
          Unesi cene za artikle koje prodaješ. Kupac tada vidi tvoju komplet ponudu izračunatu za svoj objekat, a do tebe stiže upit sa spiskom stavki.
        </p>

        {!token && (
          <div className="mt-8 max-w-md">
            <div className="mb-3 flex gap-2">
              <button type="button" aria-pressed={mode === 'login'} onClick={() => setMode('login')} className={tabClass(mode === 'login')}>Prijava</button>
              <button type="button" aria-pressed={mode === 'register'} onClick={() => setMode('register')} className={tabClass(mode === 'register')}>Postani partner</button>
            </div>
            {notice && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-950">{notice}</p>}
            {mode === 'login' ? (
              <form onSubmit={login} className="space-y-3 rounded-xl border border-stone-300 bg-white p-4">
                <Input name="email" label="Imejl" type="email" />
                <Input name="password" label="Lozinka" type="password" />
                {error && <p className="text-sm text-red-700">{error}</p>}
                <button type="submit" className="rounded-lg bg-stone-900 px-4 py-3 text-sm font-medium text-white">Prijavi se</button>
              </form>
            ) : (
              <form onSubmit={register} className="space-y-3 rounded-xl border border-stone-300 bg-white p-4">
                <Input name="name" label="Naziv firme" />
                <Input name="city" label="Grad" />
                <Input name="phone" label="Telefon" />
                <Input name="email" label="Imejl" type="email" />
                <Input name="website" label="Sajt" required={false} />
                <Input name="delivery" label="Dostava (npr. cela Vojvodina, preko 50.000 RSD besplatno)" required={false} />
                <Input name="password" label="Lozinka" type="password" />
                <fieldset className="text-sm">
                  <legend className="mb-1 font-medium text-stone-800">Paketi koje možeš da isporučiš komplet</legend>
                  {PACKAGES.map((pack) => (
                    <label key={pack.id} className="flex items-start gap-2 py-0.5">
                      <input type="checkbox" name="packages" value={pack.id} className="mt-1" />
                      <span>{pack.name}<span className="block text-xs text-stone-500">{pack.detail}</span></span>
                    </label>
                  ))}
                </fieldset>
                {error && <p className="text-sm text-red-700">{error}</p>}
                <button type="submit" className="rounded-lg bg-stone-900 px-4 py-3 text-sm font-medium text-white">Pošalji prijavu</button>
              </form>
            )}
          </div>
        )}

        {partner && (
          <div className="mt-8 space-y-8">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-stone-700">{partner.name} · {partner.city} · {statusText(partner.status)}</p>
              <button type="button" onClick={signOut} className="text-sm text-stone-600">Odjava</button>
            </div>
            {partner.status !== 'active' && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">Kupci još ne vide tvoju ponudu. Prikazuje se kad administrator aktivira firmu.</p>
            )}

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-stone-950">Upiti kupaca</h2>
              {data.leads.length === 0 && <p className="text-sm text-stone-600">Još nema odobrenih upita.</p>}
              {data.leads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} onSale={reportSale} />
              ))}
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-stone-950">Cenovnik</h2>
              <div className="rounded-xl border border-stone-300 bg-white p-4">
                <PriceEditor packages={partner.packages} prices={partner.prices} validUntil={partner.pricesValidUntil} onSave={savePrices} />
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-stone-950">Zaduženja</h2>
              <p className="text-sm text-stone-700">{terms(partner)}</p>
              <p className="text-sm text-stone-700">Neplaćeno: {formatDin(unpaid)}</p>
              {data.charges.map((item) => (
                <p key={item.id} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800">
                  {CHARGE_KIND[item.kind]} · {item.period}{item.leadCode ? ` · ${item.leadCode}` : ''} · {formatDin(item.amount)} · {item.paidAt ? 'plaćeno' : 'nije plaćeno'}
                </p>
              ))}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

function LeadCard({ lead, onSale }) {
  const [amount, setAmount] = useState('')
  const [problem, setProblem] = useState('')
  return (
    <article className="rounded-xl border border-stone-300 bg-white p-4 text-sm">
      <p className="font-medium text-stone-950">{lead.code} · {packageName(lead.package)} · {lead.projectName || 'Objekat'}</p>
      <p className="mt-1 text-stone-700">{lead.customer?.name} · {lead.customer?.phone} · {lead.customer?.email}</p>
      <p className="mt-1 text-stone-600">Po tvom cenovniku {formatDin(lead.offerTotal)}, {lead.covered} od {lead.articles} artikala.</p>
      {lead.note && <p className="mt-2 text-stone-700">{lead.note}</p>}
      <details className="mt-2">
        <summary className="cursor-pointer text-stone-700">Stavke</summary>
        <ul className="mt-1 space-y-0.5 text-stone-600">
          {lead.items.map((item, index) => (
            <li key={`${item.name}-${index}`}>
              {item.name}: {String(item.quantity).replace('.', ',')} {item.unit}{item.total ? ` · ${formatDin(item.total)}` : ' · nema u cenovniku'}
            </li>
          ))}
        </ul>
      </details>
      {lead.status === 'sold' ? (
        <p className="mt-2 text-emerald-900">Prodaja je prijavljena: {formatDin(lead.saleAmount)}.</p>
      ) : (
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            setProblem('')
            onSale(lead.id, Number(amount.replace(/\./g, '').replace(',', '.'))).catch((reason) => setProblem(reason.message))
          }}
        >
          <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Iznos prodaje, RSD" aria-label="Iznos prodaje" className="rounded-lg border border-stone-300 px-3 py-2" />
          <button type="submit" className="rounded-lg border border-stone-300 px-3 py-2">Prijavi prodaju</button>
        </form>
      )}
      {problem && <p className="mt-2 text-red-700">{problem}</p>}
    </article>
  )
}

function Input({ name, label, type = 'text', required = true }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-stone-800">{label}</span>
      <input name={name} type={type} required={required} className="w-full rounded-lg border border-stone-300 px-3 py-2" />
    </label>
  )
}

function tabClass(active) {
  return `rounded-lg px-3 py-2 text-sm font-medium ${active ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'}`
}

function statusText(status) {
  if (status === 'active') return 'aktivna'
  if (status === 'paused') return 'pauzirana'
  return 'čeka odobrenje'
}

function terms(partner) {
  if (partner.freeUntil && partner.freeUntil >= new Date().toISOString().slice(0, 10)) return `Besplatno do ${partner.freeUntil}.`
  const parts = []
  if (partner.leadFee > 0) parts.push(`${formatDin(partner.leadFee)} po odobrenom upitu`)
  if (partner.monthlyFee > 0) parts.push(`${formatDin(partner.monthlyFee)} mesečno`)
  if (partner.commissionPct > 0) parts.push(`${String(partner.commissionPct).replace('.', ',')}% provizije na prijavljenu prodaju`)
  return parts.length > 0 ? `Uslovi: ${parts.join(', ')}.` : 'Uslovi još nisu dogovoreni.'
}
