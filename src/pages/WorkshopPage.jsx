import { useEffect, useState } from 'react'
import { formatDin } from '../prices'
import { SKILLS, skillName } from './craftsmen'

const TOKEN_KEY = 'mera-workshop-token'

export function WorkshopPage() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [craftsman, setCraftsman] = useState(null)
  const [inquiries, setInquiries] = useState([])
  const [mode, setMode] = useState('login')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return undefined
    let stop = false
    async function load() {
      const response = await fetch('/api/workshop/inquiries', { headers: { Authorization: `Bearer ${token}` } })
      const payload = await response.json()
      if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY)
        if (!stop) {
          setToken('')
          setCraftsman(null)
        }
        return
      }
      if (!stop) {
        setCraftsman(payload.craftsman)
        setInquiries(payload.inquiries || [])
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
    const response = await fetch('/api/workshop/login', {
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
    setCraftsman(payload.craftsman)
  }

  async function register(event) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/workshop/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profession: form.get('profession'),
        shop: form.get('shop'),
        city: form.get('city'),
        phone: form.get('phone'),
        email: form.get('email'),
        password: form.get('password'),
        bio: form.get('bio'),
        skills: form.getAll('skills'),
      }),
    })
    const payload = await response.json()
    if (!response.ok) {
      setError(payload.error || 'Nalog nije otvoren.')
      return
    }
    setMode('login')
    setError('')
    event.currentTarget.reset()
    setMode('registered')
  }

  async function respond(id, decision, price) {
    const response = await fetch(`/api/workshop/inquiries/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ decision, price }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Odgovor nije sačuvan.')
    setInquiries((current) => current.map((item) => (item.id === id ? payload.inquiry : item)))
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm font-medium tracking-wide text-stone-500 uppercase">Radionica</p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-950">Upiti za tvoje skilove</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-700">
          Upit vidiš tek kad bude odobren, i stiže na imejl sa kojim si otvorio nalog. Prihvatanjem kažeš svoju cenu. Kupac vidi tu cenu plus 10%. Telefon kupca vidiš tek kad plati naknadu, pa ga ti zoveš.
        </p>

        {!token && (
          <div className="mt-8 space-y-4">
            <p className="rounded-lg bg-[#f7f4ef] px-3 py-2 text-sm text-stone-700">
              Probni nalozi imaju lozinku <span className="font-medium">radionica</span>. Imejlovi: bravar@okvir.mera, krov@lim.mera, oluk@lim.mera, limar@zemun.mera, rolo@pancevo.mera, stolarija@pancevo.mera, zidar@subotica.mera.
            </p>
            {mode !== 'register' ? (
              <form onSubmit={login} className="space-y-3 rounded-xl border border-stone-300 bg-white p-4">
                <h2 className="font-semibold text-stone-950">Prijava</h2>
                <Field name="email" label="Imejl" />
                <Field name="password" label="Lozinka" type="password" />
                {error && <p className="text-sm text-red-700">{error}</p>}
                {mode === 'registered' && <p className="text-sm text-emerald-900">Nalog je otvoren. Prijavi se.</p>}
                <button type="submit" className="rounded-lg bg-stone-900 px-4 py-3 text-sm font-medium text-white">Prijavi se</button>
                <button type="button" onClick={() => setMode('register')} className="ml-3 text-sm text-stone-700">Otvori nalog radionice</button>
              </form>
            ) : (
              <form onSubmit={register} className="space-y-3 rounded-xl border border-stone-300 bg-white p-4">
                <h2 className="font-semibold text-stone-950">Novi majstor</h2>
                <Field name="profession" label="Profesija" />
                <Field name="shop" label="Radionica" />
                <Field name="city" label="Grad" />
                <Field name="phone" label="Telefon" />
                <Field name="email" label="Imejl, na njega stiže odobreni upit" />
                <Field name="password" label="Lozinka" type="password" />
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-stone-800">Šta radiš</span>
                  <textarea name="bio" rows={3} className="w-full rounded-lg border border-stone-300 px-3 py-2" />
                </label>
                <fieldset className="space-y-1 text-sm">
                  <legend className="font-medium text-stone-800">Skilovi</legend>
                  {SKILLS.map((skill) => (
                    <label key={skill.id} className="flex items-center gap-2">
                      <input type="checkbox" name="skills" value={skill.id} />
                      {skill.name}
                    </label>
                  ))}
                </fieldset>
                {error && <p className="text-sm text-red-700">{error}</p>}
                <button type="submit" className="rounded-lg bg-stone-900 px-4 py-3 text-sm font-medium text-white">Sačuvaj nalog</button>
                <button type="button" onClick={() => setMode('login')} className="ml-3 text-sm text-stone-700">Nazad na prijavu</button>
              </form>
            )}
          </div>
        )}

        {token && craftsman && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-stone-700">
                {craftsman.profession} · {craftsman.shop}, {craftsman.city}. Skilovi: {craftsman.skills.map(skillName).join(', ')}.
              </p>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem(TOKEN_KEY)
                  setToken('')
                  setCraftsman(null)
                }}
                className="text-sm text-stone-600"
              >
                Odjava
              </button>
            </div>
            {inquiries.length === 0 && <p className="text-sm text-stone-600">Nema odobrenih upita. Upit vidiš tek kad ga admin pošalje.</p>}
            {inquiries.map((item) => (
              <WorkshopInquiry key={item.id} item={item} onRespond={respond} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function WorkshopInquiry({ item, onRespond }) {
  const [price, setPrice] = useState(item.orientationTotal || '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function send(decision) {
    setError('')
    setBusy(true)
    try {
      await onRespond(item.id, decision, price)
    } catch (reason) {
      setError(reason.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="rounded-xl border border-stone-300 bg-white p-4 text-sm">
      <p className="font-medium text-stone-950">
        {skillName(item.skill)} · {item.projectName || 'Garaža'}
      </p>
      <p className="mt-1 text-stone-600">{workshopStatus(item.status)}</p>
      {item.orientationTotal > 0 && <p className="mt-1 text-stone-600">Orijentacija sa sajta {formatDin(item.orientationTotal)}</p>}
      {item.note && <p className="mt-2 text-stone-700">{item.note}</p>}
      {item.estimate?.lines?.length > 0 && (
        <ul className="mt-2 space-y-1 text-stone-600">
          {item.estimate.lines.slice(0, 6).map((line) => (
            <li key={`${line.item}-${line.detail}`}>{line.item}: {line.quantity} {line.unit}</li>
          ))}
        </ul>
      )}
      {item.status === 'sent' && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-stone-800">Tvoja cena, RSD</span>
            <input value={price} onChange={(event) => setPrice(event.target.value)} className="w-40 rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <button type="button" disabled={busy} onClick={() => send('accept')} className="rounded-lg bg-stone-900 px-3 py-2 font-medium text-white">Prihvati</button>
          <button type="button" disabled={busy} onClick={() => send('decline')} className="rounded-lg border border-stone-300 px-3 py-2">Odbij</button>
        </div>
      )}
      {item.craftsmanPrice != null && (
        <p className="mt-2 text-stone-800">
          Tvoja cena {formatDin(item.craftsmanPrice)}. Kupac vidi {formatDin(item.total)}, od čega je naknada {formatDin(item.feeAmount)}.
        </p>
      )}
      {item.customer && (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-950">
          Kupac je platio naknadu. Pozovi {item.customer.name} na {item.customer.phone}
          {item.customer.email ? `, ${item.customer.email}` : ''}. Dalji dogovor i ostatak cene idu direktno.
        </p>
      )}
      {error && <p className="mt-2 text-red-700">{error}</p>}
    </article>
  )
}

function workshopStatus(status) {
  if (status === 'accepted') return 'Čeka se uplata naknade. Kontakt još nije otvoren.'
  if (status === 'declined') return 'Odbijeno.'
  if (status === 'paid') return 'Naknada je plaćena.'
  return 'Novo. Odgovori cenom ili odbij.'
}

function Field({ name, label, type = 'text' }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-stone-800">{label}</span>
      <input name={name} type={type} required className="w-full rounded-lg border border-stone-300 px-3 py-2" />
    </label>
  )
}
