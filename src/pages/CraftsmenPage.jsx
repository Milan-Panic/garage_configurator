import { useEffect, useMemo, useState } from 'react'
import { GarageDrawings } from '../components/Drawings'
import { GarageView } from '../components/GarageView'
import { buildEstimate } from '../estimate'
import { DOOR_MATERIALS, ROOF_MATERIALS, WALL_MATERIALS, findMaterial } from '../materials'
import { formatDin, mergePrices, orientationQuote } from '../prices'
import { visitorKey } from '../visitor'
import { jobsFor, skillName } from './craftsmen'

const SHOTS = [
  { id: 'ugao', label: 'Ugao', theta: 0.55 },
  { id: 'prednja', label: 'Prednja', theta: 0.05 },
  { id: 'strana', label: 'Strana', theta: 1.55 },
]

export function CraftsmenPage({ scene, projectName }) {
  const jobs = useMemo(() => jobsFor(scene), [scene])
  const estimate = useMemo(() => buildEstimate(scene), [scene])
  const [prices, setPrices] = useState(() => mergePrices(null))
  const [craftsmen, setCraftsmen] = useState([])
  const [customerKey, setCustomerKey] = useState(() => visitorKey())
  const [myInquiries, setMyInquiries] = useState([])
  const [included, setIncluded] = useState(() => Object.fromEntries(jobs.map((job) => [job.skill, job.send])))
  const [chosen, setChosen] = useState({})
  const [shots, setShots] = useState({})
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState([])
  const [pending, setPending] = useState(false)
  const quote = useMemo(() => orientationQuote(scene, estimate, prices), [scene, estimate, prices])
  const wallMaterial = findMaterial(WALL_MATERIALS, scene.wallMaterialId)
  const roofMaterial = findMaterial(ROOF_MATERIALS, scene.roofMaterialId)
  const doorMaterial = findMaterial(DOOR_MATERIALS, scene.doorMaterialId)

  useEffect(() => {
    fetch('/api/prices')
      .then((response) => response.json())
      .then((payload) => setPrices(mergePrices(payload.prices)))
      .catch(() => {})
    fetch('/api/craftsmen')
      .then((response) => response.json())
      .then((payload) => setCraftsmen(payload.craftsmen || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!customerKey) return undefined
    let stop = false
    async function load() {
      const response = await fetch('/api/customer/inquiries', { headers: { 'X-Customer-Key': customerKey } })
      const payload = await response.json()
      if (!stop) setMyInquiries(payload.inquiries || [])
    }
    load().catch(() => {})
    const timer = setInterval(() => load().catch(() => {}), 4000)
    return () => {
      stop = true
      clearInterval(timer)
    }
  }, [customerKey])

  useEffect(() => {
    setIncluded((current) => {
      const next = {}
      jobs.forEach((job) => {
        next[job.skill] = Object.prototype.hasOwnProperty.call(current, job.skill) ? current[job.skill] : job.send
      })
      return next
    })
    setChosen((current) => {
      const next = { ...current }
      jobs.forEach((job) => {
        const options = craftsmen.filter((entry) => entry.skills.includes(job.skill))
        if (!options.some((entry) => entry.id === next[job.skill])) next[job.skill] = options[0]?.id ?? ''
      })
      return next
    })
    }, [jobs, craftsmen])

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSent([])
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !email.trim()) {
      setError('Ime, prezime, imejl i telefon su obavezni.')
      return
    }
    const selected = jobs.filter((job) => included[job.skill])
    if (selected.length === 0) {
      setError('Uključi bar jedan posao.')
      return
    }
    if (selected.some((job) => !chosen[job.skill])) {
      setError('Za svaki uključen posao izaberi majstora koji ima taj skil.')
      return
    }
    setPending(true)
    const views = SHOTS.map((shot) => shots[shot.id]).filter(Boolean)
    const saved = []
    let key = customerKey
    try {
      for (const job of selected) {
        const response = await fetch('/api/inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerKey: key,
            craftsmanId: chosen[job.skill],
            skill: job.skill,
            firstName,
            lastName,
            phone,
            email,
            note,
            projectName,
            orientationTotal: quote[job.skill]?.total || 0,
            estimate: {
              lines: estimate.segments[job.skill] || [],
              quote: quote[job.skill] || null,
            },
            views,
          }),
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Upit nije sačuvan.')
        key = payload.customerKey || key
        const craftsman = craftsmen.find((entry) => entry.id === chosen[job.skill])
        saved.push(`${skillName(job.skill)} → ${craftsman?.shop ?? payload.id}`)
      }
      if (key) {
        localStorage.setItem('mera-customer-key', key)
        setCustomerKey(key)
      }
      setSent(saved)
      setNote('')
    } catch (reason) {
      setError(reason.message || 'Upit nije sačuvan.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-sm font-medium tracking-wide text-stone-500 uppercase">Majstori</p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-950">Poseban upit za svaki posao</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-700">
          Biraš majstora po skilu. Upit prvo čeka odobrenje, pa majstor unosi svoju cenu. Na nju se dodaje 10% naknade.
          Kontakt se otvara tek kad se ta naknada plati, pa majstor zove kupca i dalje se dogovaraju sami.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-700">
          Oluk, betonska ploča, rolo vrata i metalna konstrukcija ne idu u isti upit. Majstor se nudi samo ako ima skil
          za taj deo. Garaža {projectName ? `„${projectName}”` : 'iz konfiguratora'} ide uz računicu i tri pogleda.
        </p>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-stone-950">Prikazi koji idu uz upit</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {SHOTS.map((shot) => (
              <figure key={shot.id} className="overflow-hidden rounded-xl border border-stone-300 bg-white">
                <GarageView
                  dimensions={scene.dimensions}
                  wallMaterial={wallMaterial}
                  roofMaterial={roofMaterial}
                  doorMaterial={doorMaterial}
                  windows={scene.windows}
                  door={scene.door}
                  roof={scene.roof}
                  gutters={scene.gutters !== false}
                  pedestrianDoors={scene.pedestrianDoors || []}
                  theta={shot.theta}
                  onShot={(image) => setShots((current) => (current[shot.id] === image ? current : { ...current, [shot.id]: image }))}
                  className="h-52 w-full"
                />
                <figcaption className="px-3 py-2 text-sm text-stone-600">{shot.label}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-3 md:grid-cols-2">
          {craftsmen.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-stone-300 bg-white p-4">
              <h2 className="text-sm font-semibold text-stone-950">{entry.profession}</h2>
              <p className="mt-1 text-sm text-stone-600">
                {entry.shop} · {entry.city}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{entry.does}</p>
              <p className="mt-2 text-xs text-stone-500">{entry.skills.map(skillName).join(' · ')}</p>
            </article>
          ))}
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-stone-950">Crteži glavnih delova</h2>
          <div className="mt-4">
            <GarageDrawings scene={scene} />
          </div>
        </section>

        <form onSubmit={submit} className="mt-10 space-y-4 rounded-xl border border-stone-300 bg-white p-4">
          <h2 className="text-lg font-semibold text-stone-950">Šta se šalje</h2>
          {jobs.map((job) => {
            const options = craftsmen.filter((entry) => entry.skills.includes(job.skill))
            const money = quote[job.skill]
            return (
              <fieldset key={job.skill} className="space-y-2 rounded-lg border border-stone-200 p-3">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={Boolean(included[job.skill])}
                    onChange={(event) => setIncluded((current) => ({ ...current, [job.skill]: event.target.checked }))}
                  />
                  <span>
                    <span className="font-medium text-stone-950">{job.title}</span>
                    <span className="mt-1 block text-stone-600">{job.detail}</span>
                    {money && <span className="mt-1 block text-stone-800">Orijentaciono {formatDin(money.total)}</span>}
                  </span>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-stone-700">Majstor sa skilom</span>
                  <select
                    value={chosen[job.skill] || ''}
                    onChange={(event) => setChosen((current) => ({ ...current, [job.skill]: event.target.value }))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  >
                    {options.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.profession} · {entry.shop}, {entry.city}
                      </option>
                    ))}
                  </select>
                </label>
              </fieldset>
            )
          })}
          <p className="text-sm text-stone-600">Nalog nije potreban. Ovi podaci idu uz upit.</p>
          <Field label="Ime" value={firstName} onChange={setFirstName} />
          <Field label="Prezime" value={lastName} onChange={setLastName} />
          <Field label="Imejl" value={email} onChange={setEmail} />
          <Field label="Telefon" value={phone} onChange={setPhone} />
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-stone-800">Poruka</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} className="w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          {sent.length > 0 && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
              Upiti čekaju odobrenje: {sent.join('; ')}. Majstor ih još ne vidi.
            </p>
          )}
          <button type="submit" disabled={pending} className="rounded-lg bg-stone-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50">
            {pending ? 'Šaljem…' : 'Pošalji poseban upit za svaki uključen posao'}
          </button>
        </form>
        <InquiryBoard
          inquiries={myInquiries}
          onWithdraw={async (id) => {
            const response = await fetch(`/api/customer/inquiries/${id}/withdraw`, {
              method: 'POST',
              headers: { 'X-Customer-Key': customerKey },
            })
            const payload = await response.json()
            if (!response.ok) throw new Error(payload.error || 'Upit nije povučen.')
            setMyInquiries((current) => current.map((item) => (item.id === id ? payload.inquiry : item)))
          }}
          onPay={async (id) => {
            const response = await fetch(`/api/customer/inquiries/${id}/pay`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Customer-Key': customerKey },
              body: JSON.stringify({ key: customerKey }),
            })
            const payload = await response.json()
            if (!response.ok) throw new Error(payload.error || 'Naknada nije evidentirana.')
            setMyInquiries((current) => current.map((item) => (item.id === id ? payload.inquiry : item)))
          }}
        />
      </div>
    </div>
  )
}

function InquiryBoard({ inquiries, onPay, onWithdraw }) {
  const [busy, setBusy] = useState(null)
  const [problem, setProblem] = useState('')
  if (inquiries.length === 0) return null
  return (
    <section className="mt-8 space-y-3">
      <h2 className="text-xl font-semibold text-stone-950">Tvoji upiti</h2>
      {inquiries.map((item) => (
        <article key={item.id} className="rounded-xl border border-stone-300 bg-white p-4 text-sm">
          <p className="font-medium text-stone-950">
            {skillName(item.skill)} · {item.craftsman?.shop}, {item.craftsman?.city}
          </p>
          <p className="mt-1 text-stone-600">{statusLabel(item.status)}</p>
          {item.orientationTotal > 0 && <p className="mt-1 text-stone-600">Orijentacija {formatDin(item.orientationTotal)}</p>}
          {item.craftsmanPrice != null && (
            <p className="mt-2 text-stone-800">
              Cena majstora {formatDin(item.craftsmanPrice)}. Naknada 10% {formatDin(item.feeAmount)}. Ukupno za posao {formatDin(item.total)}.
            </p>
          )}
          {(item.canWithdraw || item.canSwitch) && (
            <button
              type="button"
              disabled={busy === item.id}
              onClick={() => {
                setProblem('')
                setBusy(item.id)
                onWithdraw(item.id)
                  .catch((reason) => setProblem(reason.message))
                  .finally(() => setBusy(null))
              }}
              className="mt-3 rounded-lg border border-stone-300 px-3 py-2 text-sm"
            >
              {item.canSwitch ? 'Povuci i izaberi drugog majstora' : 'Povuci upit'}
            </button>
          )}
          {item.status === 'accepted' && (
            <button
              type="button"
              disabled={busy === item.id}
              onClick={() => {
                setProblem('')
                setBusy(item.id)
                onPay(item.id)
                  .catch((reason) => setProblem(reason.message))
                  .finally(() => setBusy(null))
              }}
              className="mt-3 rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white"
            >
              {busy === item.id ? 'Evidentiram…' : `Plati naknadu ${formatDin(item.feeAmount)}`}
            </button>
          )}
          {item.status === 'paid' && (
            <p className="mt-2 text-stone-800">
              Kontakt je otvoren. {item.craftsman?.profession} iz {item.craftsman?.shop} može da te pozove na {item.craftsman?.phone}. Ostatak cene ide majstoru.
            </p>
          )}
        </article>
      ))}
      {problem && <p className="text-sm text-red-700">{problem}</p>}
      <p className="text-xs text-stone-500">Kartice još nisu povezane. Dugme evidentira naknadu i otvara kontakt.</p>
    </section>
  )
}

function statusLabel(status) {
  if (status === 'pending') return 'Čeka odobrenje. Majstor još ne vidi upit.'
  if (status === 'rejected') return 'Upit nije odobren.'
  if (status === 'withdrawn') return 'Upit je povučen.'
  if (status === 'sent') return 'Poslato majstoru. Čeka se njegova cena.'
  if (status === 'accepted') return 'Majstor je prihvatio. Naknada otvara kontakt.'
  if (status === 'declined') return 'Majstor je odbio ovaj upit.'
  if (status === 'paid') return 'Kontakt je otvoren.'
  return 'Čeka odgovor majstora.'
}

function Field({ label, value, onChange }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-stone-800">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2" />
    </label>
  )
}
