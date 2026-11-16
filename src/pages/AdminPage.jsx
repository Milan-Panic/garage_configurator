import { useEffect, useState } from 'react'
import { resetBilling, shiftClock, useBilling } from '../billing/paymentService'
import { formatDin } from '../prices'
import { AdminPartners } from './AdminPartners'
import { skillName } from './craftsmen'

const TOKEN_KEY = 'mera-admin-token'

export function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [admin, setAdmin] = useState(null)
  const [inquiries, setInquiries] = useState([])
  const [fees, setFees] = useState([])
  const [craftsmen, setCraftsmen] = useState([])
  const [mail, setMail] = useState([])
  const [mailReady, setMailReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return undefined
    let stop = false
    async function load() {
      const response = await fetch('/api/admin/inquiries', { headers: { Authorization: `Bearer ${token}` } })
      const payload = await response.json()
      if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY)
        if (!stop) {
          setToken('')
          setAdmin(null)
        }
        return
      }
      if (!stop) {
        setAdmin(payload.admin)
        setInquiries(payload.inquiries || [])
        setFees(payload.fees || [])
        setCraftsmen(payload.craftsmen || [])
        setMail(payload.mail || [])
        setMailReady(Boolean(payload.mailReady))
      }
    }
    load().catch(() => {})
    const timer = setInterval(() => load().catch(() => {}), 4000)
    return () => {
      stop = true
      clearInterval(timer)
    }
  }, [token])

  async function login(event) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/admin/login', {
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
    setAdmin(payload.admin)
  }

  async function decide(id, decision) {
    const response = await fetch(`/api/admin/inquiries/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ decision }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Odluka nije sačuvana.')
    const fresh = await fetch('/api/admin/inquiries', { headers: { Authorization: `Bearer ${token}` } })
    const next = await fresh.json()
    setInquiries(next.inquiries || [])
    setFees(next.fees || [])
    setMail(next.mail || [])
  }

  async function saveCommission(id, commissionPct) {
    const response = await fetch(`/api/admin/craftsmen/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ commissionPct }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Provizija nije sačuvana.')
    setCraftsmen(payload.craftsmen || [])
  }

  const pending = inquiries.filter((item) => item.status === 'pending')
  const feeSum = fees.reduce((sum, item) => sum + (item.feeAmount || 0), 0)

  return (
    <div className="relative h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-4xl leading-none font-bold text-stone-950 md:text-5xl">Odobrenje upita</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-700">
          Upit prvo stiže ovde. Odobrenje šalje majstoru poruku sa linkom na Radionicu. Odbijen upit majstor ne vidi.
        </p>

        {!token && (
          <form onSubmit={login} className="mt-8 max-w-md space-y-3 rounded-xl border border-stone-300 bg-white p-4">
            <h2 className="font-semibold text-stone-950">Prijava</h2>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-stone-800">Imejl</span>
              <input name="email" type="email" required defaultValue="milan.88.panic@gmail.com" className="w-full rounded-lg border border-stone-300 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-stone-800">Lozinka</span>
              <input name="password" type="password" required className="w-full rounded-lg border border-stone-300 px-3 py-2" />
            </label>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button type="submit" className="rounded-lg bg-stone-900 px-4 py-3 text-sm font-medium text-white">Prijavi se</button>
          </form>
        )}

        {token && admin && (
          <div className="mt-8 space-y-8">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-stone-700">{admin.name} · {admin.email}</p>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem(TOKEN_KEY)
                  setToken('')
                  setAdmin(null)
                }}
                className="text-sm text-stone-600"
              >
                Odjava
              </button>
            </div>
            {!mailReady && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
                Pošta se beleži ovde i u sandučetu na serveru. Da stigne na {admin.email}, u Docker okruženje treba SMTP nalog.
              </p>
            )}

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-stone-950">Čeka odobrenje</h2>
              {pending.length === 0 && <p className="text-sm text-stone-600">Nema upita na čekanju.</p>}
              {pending.map((item) => (
                <InquiryCard key={item.id} item={item} onDecide={decide} />
              ))}
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-stone-950">Provizija po majstoru</h2>
              <p className="max-w-2xl text-sm text-stone-700">
                Dogovara se sa svakim majstorom i naplaćuje od njega. Kupac je ne vidi i ne plaća. Računa se na cenu koju majstor unese kad prihvati
                upit, a važi za upite prihvaćene posle izmene.
              </p>
              <div className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
                {craftsmen.map((item) => (
                  <CommissionRow key={item.id} item={item} onSave={saveCommission} />
                ))}
              </div>
            </section>

            <DemoBilling />

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-stone-950">Naknade po starom modelu</h2>
              <p className="text-sm text-stone-700">Istorija uplata kupaca dok je važilo 10% na upit: {formatDin(feeSum)} od {fees.length} uplata. Novih više nema.</p>
              {fees.map((item) => (
                <p key={item.id} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800">
                  {skillName(item.skill)} · {item.customerName} · naknada {formatDin(item.feeAmount)} · cena majstora {formatDin(item.craftsmanPrice)}
                </p>
              ))}
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-stone-950">Svi upiti</h2>
              {inquiries.filter((item) => item.status !== 'pending').map((item) => (
                <InquiryCard key={item.id} item={item} />
              ))}
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-stone-950">Pošta</h2>
              {mail.length === 0 && <p className="text-sm text-stone-600">Još nema poruka.</p>}
              {mail.map((item) => (
                <article key={`${item.createdAt}-${item.subject}-${item.to}`} className="rounded-lg border border-stone-200 bg-white p-3 text-sm">
                  <p className="font-medium text-stone-950">{item.subject}</p>
                  <p className="text-stone-600">{item.to} · {item.sent ? 'poslato' : item.error}</p>
                  <pre className="mt-2 whitespace-pre-wrap text-stone-700">{item.body}</pre>
                </article>
              ))}
            </section>

            <AdminPartners token={token} />
          </div>
        )}
      </div>
    </div>
  )
}

function CommissionRow({ item, onSave }) {
  const [value, setValue] = useState(String(item.commissionPct))
  const [note, setNote] = useState('')
  const changed = Number(value.replace(',', '.')) !== item.commissionPct

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        setNote('')
        onSave(item.id, Number(value.replace(',', '.')))
          .then(() => setNote('Sačuvano'))
          .catch((reason) => setNote(reason.message))
      }}
      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm"
    >
      <span className="min-w-0 flex-1">
        <span className="font-medium text-stone-950">{item.shop}</span>
        <span className="text-stone-600"> · {item.profession}, {item.city}</span>
      </span>
      <label className="flex items-center gap-1.5">
        <span className="sr-only">Provizija za {item.shop}, u procentima</span>
        <input value={value} onChange={(event) => setValue(event.target.value)} inputMode="decimal" className="w-16 rounded-lg border border-stone-300 px-2 py-1 text-right tabular-nums" />
        %
      </label>
      <button type="submit" disabled={!changed} className="rounded-lg bg-stone-900 px-3 py-1.5 font-medium text-white disabled:opacity-30">
        Sačuvaj
      </button>
      {note && <span className="w-full text-xs text-stone-600">{note}</span>}
    </form>
  )
}

// Alat za probu naplate: kupovine žive samo u ovom pregledaču.
function DemoBilling() {
  const state = useBilling()
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-stone-950">Demo kupovine paketa</h2>
      <p className="max-w-2xl text-sm text-stone-700">
        U ovom pregledaču: {state.purchases.length} kupovina paketa Uradi sam, pretplata {state.subscription ? state.subscription.plan : 'nema'}, sat
        pomeren za {state.clockOffsetDays} dana.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => shiftClock(31)} className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white">
          Pomeri sat 31 dan unapred
        </button>
        <button type="button" onClick={() => shiftClock(0)} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
          Vrati sat
        </button>
        <button type="button" onClick={resetBilling} className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-red-700">
          Poništi sve demo kupovine
        </button>
      </div>
    </section>
  )
}

function InquiryCard({ item, onDecide }) {
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')

  async function send(decision) {
    setProblem('')
    setBusy(true)
    try {
      await onDecide(item.id, decision)
    } catch (reason) {
      setProblem(reason.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="rounded-xl border border-stone-300 bg-white p-4 text-sm">
      <p className="font-medium text-stone-950">
        {skillName(item.skill)} · {item.projectName || 'Objekat'} · {statusText(item.status)}
      </p>
      <p className="mt-1 text-stone-700">
        {item.customer?.name} · {item.customer?.phone} · {item.customer?.email}
      </p>
      <p className="mt-1 text-stone-600">
        {item.craftsman?.shop}, {item.craftsman?.city}
        {item.craftsman?.email ? ` · ${item.craftsman.email}` : ''}
      </p>
      {item.orientationTotal > 0 && <p className="mt-1 text-stone-600">Orijentaciono {formatDin(item.orientationTotal)}</p>}
      {item.note && <p className="mt-2 text-stone-700">{item.note}</p>}
      {item.craftsmanPrice != null && (
        <p className="mt-2 text-stone-800">
          Cena majstora {formatDin(item.craftsmanPrice)}. Provizija od majstora {formatDin(item.feeAmount || 0)}.
        </p>
      )}
      {Array.isArray(item.views) && item.views.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {item.views.map((file) => (
            <img key={file} src={`/api/inquiry-views/${file}`} alt="" className="h-24 w-full rounded-md object-cover" />
          ))}
        </div>
      )}
      {item.status === 'pending' && onDecide && (
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={busy} onClick={() => send('approve')} className="rounded-lg bg-stone-900 px-3 py-2 font-medium text-white">Odobri i pošalji majstoru</button>
          <button type="button" disabled={busy} onClick={() => send('reject')} className="rounded-lg border border-stone-300 px-3 py-2">Odbij</button>
        </div>
      )}
      {problem && <p className="mt-2 text-red-700">{problem}</p>}
    </article>
  )
}

function statusText(status) {
  if (status === 'pending') return 'čeka odobrenje'
  if (status === 'rejected') return 'odbijen'
  if (status === 'withdrawn') return 'povučen'
  if (status === 'sent') return 'poslat majstoru'
  if (status === 'accepted') return 'majstor prihvatio, kontakt otvoren'
  if (status === 'declined') return 'majstor odbio'
  if (status === 'paid') return 'kontakt otvoren (stari model)'
  return status
}
