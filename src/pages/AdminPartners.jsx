import { useCallback, useEffect, useState } from 'react'
import { PriceEditor } from '../components/PriceEditor'
import { CHARGE_KIND } from '../partners'
import { PACKAGES, formatDin, packageName } from '../prices'

const EMPTY = {
  name: '',
  city: '',
  phone: '',
  email: '',
  website: '',
  delivery: '',
  packages: [],
  status: 'active',
  sponsored: false,
  freeUntil: '',
  leadFee: 0,
  monthlyFee: 0,
  commissionPct: 0,
  password: '',
}

export function AdminPartners({ token }) {
  const [data, setData] = useState({ partners: [], leads: [], charges: [] })
  const [adding, setAdding] = useState(false)
  const [created, setCreated] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const call = useCallback(
    async (url, method = 'GET', body) => {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Zahtev nije uspeo.')
      return payload
    },
    [token],
  )

  const reload = useCallback(() => call('/api/admin/partners').then(setData), [call])

  useEffect(() => {
    reload().catch(() => {})
  }, [reload])

  async function run(action) {
    setError('')
    setMessage('')
    try {
      await action()
      await reload()
    } catch (reason) {
      setError(reason.message)
    }
  }

  async function createPartner(values) {
    const payload = await call('/api/admin/partners', 'POST', values)
    setCreated({ name: payload.partner.name, email: payload.partner.email, password: payload.password })
    setAdding(false)
    await reload()
  }

  const pending = data.leads.filter((lead) => lead.status === 'pending')
  const unpaid = data.charges.filter((item) => !item.paidAt).reduce((sum, item) => sum + item.amount, 0)
  const paid = data.charges.filter((item) => item.paidAt).reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="space-y-8 border-t border-stone-300 pt-8">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-stone-950">Partnerske firme</h2>
          <button type="button" onClick={() => setAdding((current) => !current)} className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white">
            {adding ? 'Odustani' : 'Dodaj firmu'}
          </button>
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        {message && <p className="text-sm text-emerald-900">{message}</p>}
        {created && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            Firma {created.name} je dodata. Prijava na /partner: {created.email}, lozinka {created.password}. Lozinka se prikazuje samo sada.
          </p>
        )}
        {adding && (
          <div className="rounded-xl border border-stone-300 bg-white p-4">
            <PartnerForm initial={EMPTY} creating submitLabel="Dodaj firmu" onSubmit={createPartner} />
          </div>
        )}
        {data.partners.length === 0 && !adding && <p className="text-sm text-stone-600">Još nema firmi.</p>}
        {data.partners.map((partner) => (
          <details key={partner.id} className="rounded-xl border border-stone-300 bg-white p-4 text-sm">
            <summary className="cursor-pointer font-medium text-stone-950">
              {partner.name} · {partner.city} · {statusText(partner.status)} · {Object.keys(partner.prices).length} cena
              {partner.sponsored ? ' · sponzorisano' : ''}
            </summary>
            <p className="mt-2 text-stone-600">{partner.packages.map(packageName).join(' · ')}</p>
            <div className="mt-4 grid gap-6">
              <PartnerForm
                initial={{ ...EMPTY, ...partner, freeUntil: partner.freeUntil || '' }}
                submitLabel="Sačuvaj podatke"
                onSubmit={async (values) => {
                  await call(`/api/admin/partners/${partner.id}`, 'PUT', values)
                  await reload()
                }}
              />
              <div>
                <h3 className="mb-2 font-semibold text-stone-950">Cenovnik</h3>
                <PriceEditor
                  key={partner.packages.join()}
                  packages={partner.packages}
                  prices={partner.prices}
                  validUntil={partner.pricesValidUntil}
                  onSave={async (prices, validUntil) => {
                    await call(`/api/admin/partners/${partner.id}/prices`, 'PUT', { prices, validUntil })
                    await reload()
                  }}
                />
              </div>
              <DeleteButton onConfirm={() => run(() => call(`/api/admin/partners/${partner.id}`, 'DELETE'))} />
            </div>
          </details>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-stone-950">Upiti za firme</h2>
        {pending.length === 0 && <p className="text-sm text-stone-600">Nema upita na čekanju.</p>}
        {data.leads.map((lead) => (
          <article key={lead.id} className="rounded-xl border border-stone-300 bg-white p-4 text-sm">
            <p className="font-medium text-stone-950">
              {lead.code} · {lead.partner?.name} · {packageName(lead.package)} · {leadStatus(lead.status)}
            </p>
            <p className="mt-1 text-stone-700">{lead.customer?.name} · {lead.customer?.phone} · {lead.customer?.email}</p>
            <p className="mt-1 text-stone-600">
              {lead.projectName || 'Objekat'} · po cenovniku {formatDin(lead.offerTotal)}, {lead.covered} od {lead.articles} artikala
              {lead.saleAmount ? ` · prodato za ${formatDin(lead.saleAmount)}` : ''}
            </p>
            {lead.note && <p className="mt-2 text-stone-700">{lead.note}</p>}
            {lead.status === 'pending' && (
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => run(() => call(`/api/admin/leads/${lead.id}`, 'POST', { decision: 'approve' }))} className="rounded-lg bg-stone-900 px-3 py-2 font-medium text-white">
                  Odobri i pošalji firmi
                </button>
                <button type="button" onClick={() => run(() => call(`/api/admin/leads/${lead.id}`, 'POST', { decision: 'reject' }))} className="rounded-lg border border-stone-300 px-3 py-2">
                  Odbij
                </button>
              </div>
            )}
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-stone-950">Naplata od firmi</h2>
          <button
            type="button"
            onClick={() =>
              run(async () => {
                const result = await call('/api/admin/partners/billing', 'POST')
                setMessage(`Članarina za ${result.period}: ${result.created} novih zaduženja.`)
              })
            }
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          >
            Obračunaj članarinu za ovaj mesec
          </button>
        </div>
        <p className="text-sm text-stone-700">Neplaćeno {formatDin(unpaid)} · naplaćeno {formatDin(paid)}. Plaćanje se evidentira ručno, kartice nisu povezane.</p>
        {data.charges.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800">
            <span>
              {item.partnerName} · {CHARGE_KIND[item.kind]} · {item.period}{item.leadCode ? ` · ${item.leadCode}` : ''} · {formatDin(item.amount)}
            </span>
            <button type="button" onClick={() => run(() => call(`/api/admin/charges/${item.id}/paid`, 'POST'))} className="rounded-md border border-stone-300 px-2 py-1 text-xs">
              {item.paidAt ? 'Plaćeno, poništi' : 'Označi plaćeno'}
            </button>
          </div>
        ))}
      </section>
    </div>
  )
}

function PartnerForm({ initial, creating = false, submitLabel, onSubmit }) {
  const [values, setValues] = useState(initial)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const set = (key) => (event) => {
    setSaved(false)
    setValues((current) => ({ ...current, [key]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      await onSubmit(values)
      setSaved(true)
    } catch (reason) {
      setError(reason.message)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Naziv firme" value={values.name} onChange={set('name')} required />
        <Field label="Grad" value={values.city} onChange={set('city')} required />
        <Field label="Telefon" value={values.phone} onChange={set('phone')} required />
        <Field label="Imejl" type="email" value={values.email} onChange={set('email')} required />
        <Field label="Sajt" value={values.website} onChange={set('website')} />
        <Field label="Dostava" value={values.delivery} onChange={set('delivery')} />
      </div>
      <fieldset>
        <legend className="mb-1 font-medium text-stone-800">Paketi</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {PACKAGES.map((pack) => (
            <label key={pack.id} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={values.packages.includes(pack.id)}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    packages: event.target.checked ? [...current.packages, pack.id] : current.packages.filter((id) => id !== pack.id),
                  }))
                }
              />
              {pack.name}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Besplatno do" type="date" value={values.freeUntil} onChange={set('freeUntil')} />
        <Field label="Cena po odobrenom upitu, RSD" type="number" min="0" value={values.leadFee} onChange={set('leadFee')} />
        <Field label="Mesečna članarina, RSD" type="number" min="0" value={values.monthlyFee} onChange={set('monthlyFee')} />
        <Field label="Provizija na prodaju, %" type="number" min="0" max="100" step="0.1" value={values.commissionPct} onChange={set('commissionPct')} />
        {creating ? (
          <Field label="Lozinka (prazno pravi novu)" value={values.password} onChange={set('password')} />
        ) : (
          <label className="block">
            <span className="mb-1 block font-medium text-stone-800">Status</span>
            <select value={values.status} onChange={set('status')} className="w-full rounded-lg border border-stone-300 px-3 py-2">
              <option value="pending">Čeka odobrenje</option>
              <option value="active">Aktivna</option>
              <option value="paused">Pauzirana</option>
            </select>
          </label>
        )}
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={Boolean(values.sponsored)} onChange={(event) => setValues((current) => ({ ...current, sponsored: event.target.checked }))} />
        Istaknuta pozicija. Kupcu piše „Sponzorisano”.
      </label>
      {error && <p className="text-red-700">{error}</p>}
      {saved && !creating && <p className="text-emerald-900">Sačuvano.</p>}
      <button type="submit" className="rounded-lg bg-stone-900 px-3 py-2 font-medium text-white">{submitLabel}</button>
    </form>
  )
}

function Field({ label, ...rest }) {
  return (
    <label className="block">
      <span className="mb-1 block font-medium text-stone-800">{label}</span>
      <input {...rest} className="w-full rounded-lg border border-stone-300 px-3 py-2" />
    </label>
  )
}

function DeleteButton({ onConfirm }) {
  const [asking, setAsking] = useState(false)
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className="justify-self-start text-sm text-red-700">
        Obriši firmu
      </button>
    )
  }
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onConfirm} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white">Da, obriši</button>
      <button type="button" onClick={() => setAsking(false)} className="rounded-md px-3 py-1.5 text-sm text-stone-600">Odustani</button>
    </div>
  )
}

function statusText(status) {
  if (status === 'active') return 'aktivna'
  if (status === 'paused') return 'pauzirana'
  return 'čeka odobrenje'
}

function leadStatus(status) {
  if (status === 'pending') return 'čeka odobrenje'
  if (status === 'approved') return 'poslat firmi'
  if (status === 'rejected') return 'odbijen'
  if (status === 'sold') return 'prodato'
  return status
}
