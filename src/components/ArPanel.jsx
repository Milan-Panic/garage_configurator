import { useEffect, useRef, useState } from 'react'
import { RotateCcw, RotateCw, Smartphone, X } from 'lucide-react'
import { arSupport, openQuickLook, startWebXR } from '../ar'

// Prozor za kameru: na telefonu pokreće AR, na računaru objašnjava kako.
export function ArPanel({ getBuilding, onClose }) {
  const [support, setSupport] = useState('checking')
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  const overlay = useRef(null)
  const session = useRef(null)

  useEffect(() => {
    let stop = false
    arSupport().then((value) => !stop && setSupport(value))
    return () => {
      stop = true
      session.current?.end()
    }
  }, [])

  async function start() {
    const building = getBuilding()
    if (!building) return setError('Objekat još nije spreman. Probaj ponovo za sekund.')
    setError('')
    try {
      if (support === 'quicklook') {
        setState('preparing')
        await openQuickLook(building)
        setState('idle')
        return
      }
      setState('running')
      session.current = await startWebXR(building, overlay.current, {
        onPlaced: () => setState('placed'),
        onEnd: () => {
          session.current = null
          setState('idle')
        },
      })
    } catch (reason) {
      setState('idle')
      setError(reason?.name === 'NotAllowedError' ? 'Kamera nije dozvoljena. Dozvoli kameru u podešavanjima pregledača.' : 'Kamera nije mogla da se pokrene na ovom uređaju.')
    }
  }

  const running = state === 'running' || state === 'placed'

  return (
    <>
      {/* Sloj preko kamere u WebXR sesiji: uputstvo, okretanje i izlaz. */}
      <div ref={overlay} className={running ? 'fixed inset-0 z-[70] flex flex-col justify-between p-4' : 'hidden'}>
        <p className="self-center rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white">
          {state === 'placed' ? 'Dodirni drugo mesto da pomeriš objekat.' : 'Polako pomeraj telefon prema tlu, pa dodirni žuti krug.'}
        </p>
        <div className="flex justify-center gap-3">
          <button type="button" onClick={() => session.current?.rotate(Math.PI / 12)} className="rounded-full bg-white/90 p-3 text-stone-900" aria-label="Okreni levo">
            <RotateCcw size={20} />
          </button>
          <button type="button" onClick={() => session.current?.end()} className="rounded-full bg-white/90 px-5 py-3 text-sm font-semibold text-stone-900">
            Zatvori kameru
          </button>
          <button type="button" onClick={() => session.current?.rotate(-Math.PI / 12)} className="rounded-full bg-white/90 p-3 text-stone-900" aria-label="Okreni desno">
            <RotateCw size={20} />
          </button>
        </div>
      </div>

      {!running && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/50 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label="Objekat kroz kameru">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-2xl leading-tight font-bold text-stone-950">Objekat u tvom dvorištu</h2>
              <button type="button" onClick={onClose} aria-label="Zatvori" className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100">
                <X size={18} />
              </button>
            </div>
            {support === 'checking' && <p className="mt-3 text-sm text-stone-600">Proveravam da li ovaj uređaj ima kameru za AR…</p>}
            {(support === 'webxr' || support === 'quicklook') && (
              <>
                <p className="mt-3 text-sm leading-relaxed text-stone-700">
                  Uperi telefon u dvorište i postavi objekat tamo gde bi stajao, u pravoj veličini. Nameštaj i auto se ne prikazuju, samo objekat.
                </p>
                <button type="button" disabled={state === 'preparing'} onClick={start} className="btn-tape mt-4 w-full justify-center px-4 py-3 text-base disabled:opacity-50">
                  <Smartphone size={18} />
                  {state === 'preparing' ? 'Pripremam objekat…' : 'Pokreni kameru'}
                </button>
              </>
            )}
            {support === null && (
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-stone-700">
                <p>Kamera radi na telefonu: Android sa pregledačem Chrome ili iPhone sa pregledačem Safari.</p>
                <p>Sačuvaj projekat, otvori Meru na telefonu i izaberi „Kamera“. Do tada možeš da staviš fotografiju svog placa u pozadinu preko „Moja slika“.</p>
              </div>
            )}
            {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
          </div>
        </div>
      )}
    </>
  )
}
