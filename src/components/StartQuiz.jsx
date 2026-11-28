import { useState } from 'react'
import { X } from 'lucide-react'
import { modelById } from '../catalog'

// Tri kratka pitanja vode do najbližeg gotovog modela. Može da se preskoči.
const PURPOSES = [
  { id: 'auto', name: 'Auto ili kombi' },
  { id: 'alat', name: 'Alat, bicikle, baštu' },
  { id: 'radionica', name: 'Radionicu ili hobi' },
  { id: 'servis', name: 'Auto-servis' },
  { id: 'roba', name: 'Robu ili palete' },
  { id: 'masine', name: 'Traktor i mašine' },
  { id: 'druzenje', name: 'Teretanu ili druženje' },
  { id: 'posao', name: 'Kancelariju ili lokal' },
]

const DETAILS = {
  auto: { question: 'Koliko vozila?', options: [['garaza-jedan-auto', 'Jedno'], ['garaza-dva-auta', 'Dva'], ['garaza-i-nadstresnica', 'Jedno u garaži, jedno pod nadstrešnicom'], ['garaza-kombi', 'Kombi ili kamper'], ['garaza-motori', 'Motor i bicikli']] },
  alat: { question: 'Koliko prostora treba?', options: [['ostava-alat', 'Malo, za alat i kosilicu'], ['ostava-bicikli', 'Za bicikle, gume i kutije'], ['ostava-zimnica', 'Za zimnicu i zamrzivač'], ['drvarnica', 'Za drva']] },
  radionica: { question: 'Kakva radionica?', options: [['hobi-radionica', 'Hobi, za vikend'], ['garaza-radionica', 'Garaža i radionica zajedno'], ['stolarska-radionica', 'Stolarska'], ['bravarska-radionica', 'Bravarska'], ['atelje', 'Atelje ili hobi soba']] },
  servis: { question: 'Koliko mesta za auta?', options: [['servis-jedno-mesto', 'Jedno'], ['servis-dva-mesta', 'Dva'], ['vulkanizer', 'Vulkanizer']] },
  roba: { question: 'Koliko robe?', options: [['mali-magacin', 'Do 60 m²'], ['magacin-8x12', 'Oko 100 m²'], ['magacin-materijal', 'Oko 160 m²'], ['hala-12x20', 'Hala, 240 m²']] },
  masine: { question: 'Šta smeštaš?', options: [['supa-mehanizacija', 'Traktor i priključke'], ['skladiste-seno', 'Seno i alat'], ['hladnjaca', 'Voće i povrće']] },
  druzenje: { question: 'Za šta tačno?', options: [['kucna-teretana', 'Teretana'], ['bilijar-soba', 'Bilijar i utakmice'], ['letnja-kuhinja', 'Slave i roštilj'], ['stoni-tenis', 'Stoni tenis i igra']] },
  posao: { question: 'Šta tačno?', options: [['kancelarija-gradiliste', 'Kancelarija na placu'], ['lokal-kiosk', 'Mali lokal']] },
}

export function StartQuiz({ onPick, onClose }) {
  const [purpose, setPurpose] = useState(null)
  const [modelId, setModelId] = useState(null)
  const step = !purpose ? 1 : !modelId ? 2 : 3
  const detail = purpose ? DETAILS[purpose] : null

  function finish(power) {
    const model = modelById(modelId)
    if (!model) return onClose()
    const electric = power ? { ...model.scene.electric, enabled: true } : { ...model.scene.electric, enabled: false, charger: 'none' }
    onPick({ ...model.scene, electric }, model)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/50 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label="Pomoć pri izboru objekta">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-stone-500">Pitanje {step} od 3</p>
            <h2 className="font-display mt-1 text-2xl leading-tight font-bold text-stone-950">
              {step === 1 && 'Šta želiš da smestiš?'}
              {step === 2 && detail.question}
              {step === 3 && 'Treba li struja, svetlo i utičnice?'}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Zatvori" className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {step === 1 && PURPOSES.map((entry) => <Choice key={entry.id} label={entry.name} onClick={() => setPurpose(entry.id)} />)}
          {step === 2 && detail.options.map(([id, label]) => <Choice key={id} label={label} onClick={() => setModelId(id)} />)}
          {step === 3 && (
            <>
              <Choice label="Da" onClick={() => finish(true)} />
              <Choice label="Ne, bez struje" onClick={() => finish(false)} />
            </>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          {step > 1 ? (
            <button type="button" onClick={() => (step === 3 ? setModelId(null) : setPurpose(null))} className="font-medium text-stone-600 hover:text-stone-900">
              Nazad
            </button>
          ) : (
            <span />
          )}
          <button type="button" onClick={onClose} className="font-medium text-stone-600 underline underline-offset-4 hover:text-stone-900">
            Preskoči, crtam sam
          </button>
        </div>
      </div>
    </div>
  )
}

function Choice({ label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl border border-stone-300 px-4 py-3 text-left text-[15px] font-medium text-stone-900 transition hover:border-stone-900 hover:bg-stone-50">
      {label}
    </button>
  )
}
