import { useEffect, useRef, useState } from 'react'
import { Check, Lock, X } from 'lucide-react'
import { closeCheckout, useCheckout } from '../billing/checkout'
import { formatDate } from '../billing/entitlements'
import { billingNow, pay } from '../billing/paymentService'
import { DIY, PAYMENT_METHODS, YEARLY_PAID_MONTHS } from '../billing/plans'
import { formatDin } from '../prices'

const DAY = 24 * 60 * 60 * 1000

export function CheckoutHost() {
  const order = useCheckout()
  if (!order) return null
  return <CheckoutModal key={`${order.kind}-${order.projectId ?? order.plan}-${order.period ?? ''}`} order={order} />
}

function CheckoutModal({ order }) {
  const [method, setMethod] = useState('card')
  const [agreed, setAgreed] = useState(false)
  const [stage, setStage] = useState('form')
  const [problem, setProblem] = useState('')
  const dialog = useRef(null)
  const diy = order.kind === 'diy'
  const until = billingNow() + (diy ? DIY.days : order.period === 'year' ? 365 : 30) * DAY
  const blocked = stage !== 'form' || (diy && !agreed)

  useEffect(() => {
    const node = dialog.current
    if (node && !node.open) node.showModal()
  }, [])

  function submit(event) {
    event.preventDefault()
    if (blocked) return
    setStage('paying')
    setProblem('')
    pay(order, method)
      .then(() => setStage('done'))
      .catch((error) => {
        setProblem(error.message)
        setStage('form')
      })
  }

  return (
    <dialog
      ref={dialog}
      onClose={closeCheckout}
      onCancel={(event) => {
        if (stage === 'paying') event.preventDefault()
      }}
      className="no-print m-auto w-[min(34rem,calc(100vw-1.5rem))] rounded-xl bg-white p-0 text-stone-900 shadow-2xl backdrop:bg-stone-950/60"
    >
      <form onSubmit={submit} className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <header className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
          <div>
            <p className="inline-block rounded-sm bg-tape px-1.5 text-xs font-bold text-stone-950">Demo plaćanje</p>
            <h2 className="mt-1.5 text-3xl leading-none font-bold">Paket {order.title}</h2>
          </div>
          <button type="button" aria-label="Zatvori" disabled={stage === 'paying'} onClick={() => dialog.current?.close()} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 disabled:opacity-40">
            <X size={18} />
          </button>
        </header>

        {stage === 'done' ? (
          <div className="space-y-4 px-5 py-6">
            <p className="flex items-center gap-2 text-lg font-semibold text-emerald-900">
              <Check size={20} />
              Plaćeno {formatDin(order.price)}
            </p>
            <p className="text-[15px] leading-relaxed text-stone-700">
              {diy
                ? `Detaljna računica, crteži i PDF su otključani za „${order.projectName}”. Paket važi do ${formatDate(until)}`
                : `Pretplata ${order.title} važi do ${formatDate(until)}`}
            </p>
            <button type="button" onClick={() => dialog.current?.close()} className="btn-tape w-full px-4 py-3 text-base">
              Nastavi
            </button>
          </div>
        ) : (
          <div className="space-y-5 px-5 py-5">
            <dl className="space-y-1.5 text-[15px]">
              {diy ? (
                <>
                  <Row label="Projekat" value={order.projectName} />
                  <Row label="Osnova" value={`${fmt(order.width)} × ${fmt(order.length)} m${order.units > 1 ? `, ${order.units} u nizu` : ''} (${fmt(order.area)} m²)`} />
                  <Row label="Važi" value={`${DIY.days} dana, do ${formatDate(until)}`} />
                </>
              ) : (
                <>
                  <Row label="Plaćanje" value={order.period === 'year' ? `Godišnje, plaća se ${YEARLY_PAID_MONTHS} meseci` : 'Mesečno'} />
                  <Row label="Važi do" value={formatDate(until)} />
                </>
              )}
              <div className="flex items-baseline justify-between gap-4 border-t border-stone-300 pt-2">
                <dt className="font-semibold">Za uplatu</dt>
                <dd className="font-display text-3xl font-bold tabular-nums">{formatDin(order.price)}</dd>
              </div>
            </dl>

            {diy && (
              <label className="flex cursor-pointer gap-3 rounded-lg bg-amber-50 p-3 text-[15px] leading-snug text-amber-950 ring-1 ring-amber-200">
                <input type="checkbox" className="mt-0.5 size-4 shrink-0" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
                <span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Lock size={14} />
                    Posle kupovine mere osnove (Š × D) se ne mogu menjati
                  </span>
                  <span className="mt-1 block">
                    Zaključavaju se {fmt(order.width)} × {fmt(order.length)} m{order.units > 1 ? ` i ${order.units} objekta u nizu` : ''}. Krov, fasadu, vrata, prozore, boje i
                    dodatke menjaš slobodno dok paket važi. Potvrđujem da su mere dobre.
                  </span>
                </span>
              </label>
            )}

            <fieldset>
              <legend className="text-sm font-semibold text-stone-700">Način plaćanja</legend>
              <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg bg-stone-100 p-1">
                {PAYMENT_METHODS.map((entry) => (
                  <label
                    key={entry.id}
                    className={`cursor-pointer rounded-md px-2 py-2 text-center text-sm font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-accent-500 ${
                      method === entry.id ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-white'
                    }`}
                  >
                    <input type="radio" name="method" className="sr-only" checked={method === entry.id} onChange={() => setMethod(entry.id)} />
                    {entry.name}
                  </label>
                ))}
              </div>
            </fieldset>

            {method === 'card' && <CardMock />}
            {method === 'ips' && <IpsMock price={order.price} />}
            {method === 'slip' && <SlipMock order={order} />}

            {problem && <p className="text-sm text-red-700">{problem}</p>}
            <button type="submit" disabled={blocked} className="btn-tape w-full px-4 py-3 text-base disabled:cursor-not-allowed disabled:opacity-50">
              {stage === 'paying' ? 'Obrađujem uplatu…' : `Plati ${formatDin(order.price)}`}
            </button>
            <p className="text-xs leading-relaxed text-stone-500">
              Ovo je proba toka plaćanja. Novac se ne naplaćuje, a podaci o kartici se ne čuvaju niti šalju. Paket se beleži na tvom nalogu.
            </p>
          </div>
        )}
      </form>
    </dialog>
  )
}

// Maketa polja za karticu: polja nisu vezana ni za kakvo stanje i ne čitaju se.
function CardMock() {
  const field = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-[15px] placeholder:text-stone-400'
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="col-span-2 block text-sm">
        <span className="mb-1 block text-stone-700">Broj kartice</span>
        <input className={field} placeholder="0000 0000 0000 0000" inputMode="numeric" autoComplete="off" data-demo-field />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-stone-700">Važi do</span>
        <input className={field} placeholder="MM/GG" autoComplete="off" data-demo-field />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-stone-700">CVC</span>
        <input className={field} placeholder="000" inputMode="numeric" autoComplete="off" data-demo-field />
      </label>
    </div>
  )
}

function IpsMock({ price }) {
  // Šara koja liči na QR kod. Nije važeći kod i ne može da se skenira za uplatu.
  const cells = []
  for (let row = 0; row < 21; row += 1) {
    for (let column = 0; column < 21; column += 1) {
      const corner = (row < 7 && column < 7) || (row < 7 && column > 13) || (row > 13 && column < 7)
      const ring = corner && [row % 14, column % 14].every((value) => value !== 1 && value !== 5) && !(row % 14 > 1 && row % 14 < 5 && (column % 14 === 1 || column % 14 === 5))
      const filled = corner ? ring : (row * 7 + column * 13 + row * column) % 3 === 0
      if (filled) cells.push(<rect key={`${row}-${column}`} x={column} y={row} width="1" height="1" />)
    }
  }
  return (
    <div className="flex items-center gap-4 rounded-lg bg-stone-50 p-3 ring-1 ring-stone-200">
      <svg viewBox="-1 -1 23 23" className="size-28 shrink-0 bg-white fill-stone-900" role="img" aria-label="Primer IPS QR koda">
        {cells}
      </svg>
      <p className="text-sm leading-relaxed text-stone-700">
        U pravoj verziji ovde stoji IPS QR kod na {formatDin(price)} koji skeniraš aplikacijom banke. Ovaj kod je samo primer.
      </p>
    </div>
  )
}

function SlipMock({ order }) {
  return (
    <dl className="space-y-1 rounded-lg bg-stone-50 p-3 text-sm ring-1 ring-stone-200">
      <Row label="Primalac" value="Mera (primer)" />
      <Row label="Svrha" value={`Paket ${order.title}`} />
      <Row label="Račun" value="biće upisan uz pravo plaćanje" />
      <Row label="Iznos" value={formatDin(order.price)} />
      <p className="pt-1 text-xs text-stone-500">Uz pravu uplatnicu paket se otključava kad uplata legne. U probi se otključava odmah.</p>
    </dl>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-right font-medium text-stone-900">{value}</dd>
    </div>
  )
}

function fmt(value) {
  return value.toFixed(1).replace('.', ',')
}
