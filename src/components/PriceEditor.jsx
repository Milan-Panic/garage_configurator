import { useState } from 'react'
import { DEFAULT_PRICES, PACKAGES } from '../prices'
import { downloadTemplate, parsePriceList } from '../partners'

// Cenovnik jedne firme: ručni unos, lepljenje iz Excela ili CSV fajl.
export function PriceEditor({ packages, prices, validUntil, onSave }) {
  const [draft, setDraft] = useState(() => ({ ...prices }))
  const [until, setUntil] = useState(validUntil || '')
  const [pasted, setPasted] = useState('')
  const [report, setReport] = useState(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const items = DEFAULT_PRICES.filter((item) => packages.includes(item.pack))
  const filled = items.filter((item) => Number(String(draft[item.id] ?? '').replace(',', '.')) > 0).length

  function load(text) {
    const parsed = parsePriceList(text)
    const allowed = new Set(items.map((item) => item.id))
    const own = parsed.prices.filter((item) => allowed.has(item.id))
    setDraft((current) => ({ ...current, ...Object.fromEntries(own.map((item) => [item.id, item.price])) }))
    setReport({ loaded: own.length, outside: parsed.prices.length - own.length, problems: parsed.problems })
    setPasted('')
    setStatus('')
  }

  async function save() {
    setStatus('')
    setError('')
    try {
      const list = items.map((item) => ({ id: item.id, price: Number(String(draft[item.id] ?? '').replace(',', '.')) || 0 }))
      await onSave(list, until)
      setStatus('Cenovnik je sačuvan.')
    } catch (reason) {
      setError(reason.message || 'Cenovnik nije sačuvan.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-stone-50 p-3">
        <p className="text-sm font-medium text-stone-900">Uvoz iz Excela</p>
        <p className="mt-1 text-xs leading-relaxed text-stone-600">
          Preuzmi obrazac, otvori ga u Excelu i upiši cene. Zatim nalepi kolone ovde ili sačuvaj kao CSV i izaberi fajl. Uvoz puni polja ispod, a
          upisuje se tek na dugme Sačuvaj.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => downloadTemplate(packages)} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium">
            Preuzmi obrazac
          </button>
          <input
            type="file"
            accept=".csv,.txt,text/csv"
            aria-label="CSV fajl sa cenama"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) file.text().then(load)
              event.target.value = ''
            }}
            className="text-xs"
          />
        </div>
        <textarea
          value={pasted}
          onChange={(event) => setPasted(event.target.value)}
          rows={3}
          aria-label="Nalepi cene iz Excela"
          placeholder="Nalepi ovde kolone iz Excela: šifra, naziv, jedinica, cena"
          className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs"
        />
        <button type="button" disabled={!pasted.trim()} onClick={() => load(pasted)} className="mt-1 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40">
          Učitaj nalepljeno
        </button>
        {report && (
          <div className="mt-2 text-xs text-stone-700">
            <p>
              Učitano {report.loaded} cena.{report.outside > 0 ? ` Preskočeno ${report.outside} iz paketa koje firma nema.` : ''}
            </p>
            {report.problems.slice(0, 8).map((problem) => (
              <p key={problem} className="text-red-700">{problem}</p>
            ))}
            {report.problems.length > 8 && <p className="text-red-700">Još {report.problems.length - 8} redova ima grešku.</p>}
          </div>
        )}
      </div>

      {PACKAGES.filter((pack) => packages.includes(pack.id)).map((pack) => (
        <section key={pack.id}>
          <h4 className="text-sm font-semibold text-stone-950">{pack.name}</h4>
          <div className="mt-2 space-y-1.5">
            {items.filter((item) => item.pack === pack.id).map((item) => (
              <label key={item.id} className="grid grid-cols-[1fr_120px] items-center gap-3 text-sm">
                <span>
                  {item.name}
                  <span className="ml-2 text-stone-500">po {item.unit}</span>
                </span>
                <input
                  inputMode="decimal"
                  aria-label={`${item.name} cena`}
                  value={draft[item.id] ?? ''}
                  placeholder="nema"
                  onChange={(event) => setDraft((current) => ({ ...current, [item.id]: event.target.value }))}
                  className="rounded-lg border border-stone-300 px-2 py-1.5"
                />
              </label>
            ))}
          </div>
        </section>
      ))}

      <label className="block max-w-xs text-sm">
        <span className="mb-1 block font-medium text-stone-800">Cene važe do</span>
        <input type="date" value={until} onChange={(event) => setUntil(event.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2" />
        <span className="mt-1 block text-xs text-stone-500">Posle ovog datuma ponuda se ne prikazuje kupcima.</span>
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {status && <p className="text-sm text-emerald-900">{status}</p>}
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white">Sačuvaj cenovnik</button>
        <span className="text-xs text-stone-500">Popunjeno {filled} od {items.length} artikala.</span>
      </div>
    </div>
  )
}
