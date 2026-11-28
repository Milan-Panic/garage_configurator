import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Smartphone, X } from 'lucide-react'
import { arSupport, openQuickLook, startWebXR } from '../ar'

const meters = (value) => `${value.toFixed(1).replace('.', ',')} m`

// Uputstvo u sloju preko kamere, za svaki korak postavljanja.
function guide({ phase, found, aimOk, width }) {
  if (phase === 'placed') return { title: 'Objekat je postavljen.', note: 'Prednja strana je između dve tačke. „Ispočetka“ ako hoćeš drugo mesto.' }
  if (!aimOk) return { title: 'Uperi telefon prema tlu ispred sebe.', note: '' }
  const floor = found ? '' : 'Tlo još nije prepoznato, pa je beli krug procena. Polako pomeraj telefon levo-desno: kad krug požuti, mesto je tačno.'
  if (phase === 'second') return { title: `Navedi krug duž prednje strane i dodirni ekran. Prednja strana je široka ${meters(width)}.`, note: floor }
  return { title: 'Navedi krug na prvi ugao prednje strane (sa vratima) i dodirni ekran.', note: floor }
}

// Prozor za kameru: na telefonu pokreće AR, na računaru objašnjava kako.
export function ArPanel({ getBuilding, onClose }) {
  const [support, setSupport] = useState('checking')
  const [state, setState] = useState('idle')
  const [ar, setAr] = useState(null)
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
      setAr(null)
      session.current = await startWebXR(building, overlay.current, {
        onState: setAr,
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

  const running = state === 'running'
  const text = ar ? guide(ar) : { title: 'Pokrećem kameru…', note: '' }

  return (
    <>
      {/* Sloj preko kamere u WebXR sesiji: uputstvo, ispočetka i izlaz. */}
      <div ref={overlay} className={running ? 'fixed inset-0 z-[70] flex flex-col justify-between p-4' : 'hidden'}>
        <div className="self-center rounded-2xl bg-black/65 px-4 py-2.5 text-center text-white">
          <p className="text-sm font-semibold">{text.title}</p>
          {text.note && <p className="mt-1 text-xs text-white/80">{text.note}</p>}
        </div>
        <div className="flex justify-center gap-3">
          {ar && ar.phase !== 'first' && (
            <button type="button" onClick={() => session.current?.reset()} className="flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-3 text-sm font-semibold text-stone-900">
              <RotateCcw size={16} />
              Ispočetka
            </button>
          )}
          <button type="button" onClick={() => session.current?.end()} className="rounded-full bg-white/90 px-5 py-3 text-sm font-semibold text-stone-900">
            Zatvori kameru
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
            {support === 'webxr' && (
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-stone-700">
                <li>Uperi telefon u dvorište. Krug na tlu pokazuje gde gledaš.</li>
                <li>Dodirni prvi ugao prednje strane, gde bi bila vrata.</li>
                <li>Navedi krug u pravcu prednje strane i dodirni još jednom. Objekat staje iza te linije, u pravoj veličini.</li>
              </ol>
            )}
            {support === 'quicklook' && (
              <p className="mt-3 text-sm leading-relaxed text-stone-700">
                Uperi telefon u dvorište i postavi objekat tamo gde bi stajao, u pravoj veličini. Ako hoćeš samo objekat, uključi „Bez opreme“ pre kamere.
              </p>
            )}
            {(support === 'webxr' || support === 'quicklook') && (
              <>
                <p className="mt-2 text-xs text-stone-500">Najbolje radi napolju, po danu. U stanu pomaže dobro svetlo i pod sa šarom.</p>
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
