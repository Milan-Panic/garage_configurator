import { useEffect, useState } from 'react'
import { formatDin, mergePrices } from '../prices'

export function PricesPage() {
  const [prices, setPrices] = useState(() => mergePrices(null))
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/prices')
      .then((response) => response.json())
      .then((payload) => setPrices(mergePrices(payload.prices)))
      .catch(() => setError('Cene nisu učitane. Prikazane su početne.'))
  }, [])

  const groups = []
  prices.forEach((item) => {
    const group = groups.find((entry) => entry.name === item.group)
    if (group) group.items.push(item)
    else groups.push({ name: item.group, items: [item] })
  })

  function setPrice(id, value) {
    const price = Number(String(value).replace(',', '.'))
    setPrices((current) => current.map((item) => (item.id === id ? { ...item, price: Number.isFinite(price) ? price : 0 } : item)))
  }

  async function save() {
    setStatus('')
    setError('')
    try {
      const response = await fetch('/api/prices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prices }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Cene nisu sačuvane.')
      setPrices(mergePrices(payload.prices))
      setStatus('Cene su sačuvane. Upiti posle ovoga koriste ove iznose.')
    } catch (reason) {
      setError(reason.message || 'Cene nisu sačuvane.')
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm font-medium tracking-wide text-stone-500 uppercase">Administrator</p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-950">Orijentacione cene</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-700">
          Stranica je za sada otvorena. Kasnije ostaje samo administratoru, koji ovde pusti sync cena. Svaka stavka ima
          cenu po jedinici mere. Betonska ploča je grupa cementa, šljunka, peska i armature. Prozor, krilo i rolo vrata
          idu po površini otvora, bočna vrata po komadu. Zbir je orijentacija, ne predračun.
        </p>
        <div className="mt-8 space-y-6">
          {groups.map((group) => (
            <section key={group.name} className="rounded-xl border border-stone-300 bg-white p-4">
              <h2 className="font-semibold text-stone-950">{group.name}</h2>
              <div className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <label key={item.id} className="grid grid-cols-[1fr_140px] items-center gap-3 text-sm">
                    <span>
                      {item.name}
                      <span className="ml-2 text-stone-500">po {item.unit}</span>
                    </span>
                    <input
                      inputMode="decimal"
                      aria-label={`${item.name} cena`}
                      value={item.price}
                      onChange={(event) => setPrice(item.id, event.target.value)}
                      className="rounded-lg border border-stone-300 px-3 py-2"
                    />
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
        {status && <p className="mt-4 text-sm text-emerald-900">{status}</p>}
        <button type="button" onClick={save} className="mt-6 rounded-lg bg-stone-900 px-4 py-3 text-sm font-medium text-white">
          Sačuvaj cene
        </button>
        <p className="mt-4 text-xs text-stone-500">Primer zbira za jednu stavku: {formatDin(prices[0]?.price || 0)} je trenutna cena prve stavke.</p>
      </div>
    </div>
  )
}
