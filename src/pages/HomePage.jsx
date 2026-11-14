import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { navigate } from '../nav'
import { DOOR_MATERIALS, ROOF_MATERIALS, WALL_MATERIALS, sceneMaterials } from '../materials'
import { clampDoor, clampPedestrian, clampWindow } from '../layout'
import { DIMENSION_LIMITS } from '../config'
import { buildEstimate } from '../estimate'
import { useOfferPartners } from '../partners'
import { PACKAGES, formatDin, mergePrices, orientationQuote, packageName, quoteTotal } from '../prices'
import { initialScene, normalizeScene } from '../scene'
import { GarageView } from '../components/GarageView'
import { LogoMark } from '../components/SiteHeader'
import { SKILLS } from './craftsmen'

const PRICES = mergePrices(null)

function priceOf(scene) {
  return quoteTotal(orientationQuote(scene, buildEstimate(scene), PRICES))
}

// `object` je vrsta u akuzativu, za naslov „Složi … po meri".
const SAMPLES = [
  {
    name: 'Garaža za dva vozila',
    type: 'Garaža',
    object: 'garažu',
    tag: 'Fasadni panel, falcovani krov',
    scene: normalizeScene({
      ...initialScene,
      buildingType: 'garaza',
      dimensions: { width: 6.4, length: 6.5, height: 2.7 },
      wallMaterialId: 'fasadni-panel-grafit',
      wallColor: '7016',
      roofMaterialId: 'falc-antracit',
      doorMaterialId: 'sekcijska-glatka-crna',
      roof: { kind: 'mono', pitch: 6, fall: 'back', ridge: 'length' },
      door: { style: 'sectional', open: 0.15, wall: 'front', along: 0, width: 5, height: 2.2, motor: true },
      windows: [{ id: 'window-1', type: 'strip', wall: 'right', along: 0, sill: 1.9, width: 2.4, height: 0.42, frame: 'antracit' }],
    }),
  },
  {
    name: 'Ostava u dvorištu',
    type: 'Ostava',
    object: 'ostavu',
    tag: 'Lim sa dekorom hrasta, limeni crep',
    scene: normalizeScene({
      ...initialScene,
      buildingType: 'ostava',
      dimensions: { width: 3, length: 4, height: 2.4 },
      wallMaterialId: 'trapez-drvo-hrast',
      roofMaterialId: 'limeni-crep-antracit',
      doorMaterialId: 'krilna-lim',
      roof: { kind: 'duo', pitch: 20, fall: 'back', ridge: 'length' },
      door: { style: 'double', open: 0.3, wall: 'front', along: 0, width: 1.8, height: 2 },
      windows: [{ id: 'window-1', type: 'tilt', wall: 'left', along: 0, sill: 1.6, width: 1, height: 0.5, frame: 'bela' }],
    }),
  },
  {
    name: 'Radionica za mehaničara',
    type: 'Radionica',
    object: 'radionicu',
    tag: 'Sendvič panel, rolo vrata',
    scene: normalizeScene({
      ...initialScene,
      buildingType: 'radionica',
      dimensions: { width: 7, length: 9, height: 3.2 },
      wallMaterialId: 'sendvic-antracit',
      roofMaterialId: 'krovni-sendvic',
      doorMaterialId: 'rolo-antracit',
      insulation: 'full',
      roof: { kind: 'mono', pitch: 6, fall: 'back', ridge: 'length' },
      door: { style: 'roller', open: 0.5, wall: 'front', along: 0, width: 3.6, height: 2.7, motor: true },
      pedestrianDoors: [{ id: 'pesacka-1', wall: 'right', along: 2, width: 0.9, height: 2.05 }],
      windows: [{ id: 'window-1', type: 'strip', wall: 'left', along: 0, sill: 2, width: 3, height: 0.5, frame: 'antracit' }],
      electric: { enabled: true, phase: 'three', sockets: 8, lights: 6, distance: 20, charger: 'charger' },
    }),
  },
  {
    name: 'Magacin za robu',
    type: 'Magacin',
    object: 'magacin',
    tag: 'Sinusni lim, sekcijska vrata',
    scene: normalizeScene({
      ...initialScene,
      buildingType: 'magacin',
      dimensions: { width: 8, length: 12, height: 3.5 },
      wallMaterialId: 'sinus-lim',
      roofMaterialId: 'krov-trapez-antracit',
      doorMaterialId: 'sekcijska-rebro-srebro',
      roof: { kind: 'duo', pitch: 12, fall: 'back', ridge: 'length' },
      door: { style: 'sectional', open: 0.2, wall: 'front', along: 0, width: 4, height: 3 },
      windows: [{ id: 'window-1', type: 'strip', wall: 'left', along: 0, sill: 2.4, width: 4, height: 0.5, frame: 'bela' }],
      electric: { enabled: true, sockets: 4, lights: 8, distance: 25 },
    }),
  },
]

const STEPS = [
  { title: 'Složi objekat', text: 'Garaža, ostava, radionica ili magacin. Mere, krov, fasada, vrata i dodaci, a sačuvano ostaje u ovom pregledaču.' },
  { title: 'Vidi računicu', text: 'Spisak profila, tabli i okova kakav pravi majstor, i orijentaciona cena po poslu. Menja se dok menjaš objekat.' },
  { title: 'Izaberi ponudu', text: 'Kad firme imaju cene, vidiš komplet ponudu za svoj objekat. Materijal za jedan paket ide od jedne firme.' },
  { title: 'Pošalji upit', text: 'Svaki posao ide majstoru koji ima taj skil. Ime, imejl i telefon ostavljaš tek tada.' },
]

const FEATURES = [
  { title: 'Lim i paneli', text: `${WALL_MATERIALS.length} obloga zidova, ${ROOF_MATERIALS.length} krovnih pokrivača, ${DOOR_MATERIALS.length} završnih obrada vrata i RAL boje.` },
  { title: 'Crteži sa kotama', text: 'Tlocrt i dve fasade sa merama otvora i stubova, da majstor odmah vidi šta radi.' },
  { title: 'Dodaci po izboru', text: 'Nadstrešnica, ventilacija, solarni paneli i struja ulaze u istu računicu.' },
  { title: 'Majstor za taj deo', text: 'Oluk limaru, ploča betonaru, vrata monteru. Jedan majstor može da pokrije više poslova.' },
]

const QUESTIONS = [
  ['Da li je cena ponuda?', 'Ne. To je orijentacija iz materijala i mera. Ponuda je cena koju majstor unese kad prihvati upit.'],
  ['Da li treba nalog?', 'Ne. Crtež se pamti u pregledaču. Ime, prezime, imejl i telefon traže se tek na upitu.'],
  ['Kada majstor dobija moj broj?', 'Kad se plati naknada od 10% na cenu koju je uneo. Ostatak cene ide direktno njemu.'],
  ['Da li je ponuda firme konačna?', 'Ne. Računa se iz cenovnika firme za tvoje količine. Firma potvrđuje konačnu cenu i dostavu kad dobije upit.'],
  ['Ko vidi moje projekte?', 'Samo pregledač u kom su sačuvani. Link iz imejla otvara iste projekte na drugom uređaju.'],
  ['Da li je ovo statički proračun?', 'Ne. Preseci profila su uobičajeni za lake montažne objekte. Za velike raspone treba statičar, a sajt upozorava kad mere pređu tu granicu.'],
  ['Da li mi treba dozvola?', 'Zavisi od toga čemu objekat služi i gde stoji. Kratak pregled je u Vodiču za dozvole, a konačan odgovor daje opštinski urbanizam.'],
]

const CANVAS = '#d3d9de'
const STILL = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

// Primer sa novim merama: otvori se pomeraju da stanu na kraće zidove.
function resize(scene, width, length) {
  const dimensions = { ...scene.dimensions, width, length }
  const door = clampDoor(scene.door, dimensions)
  return {
    ...scene,
    dimensions,
    door,
    windows: scene.windows.map((item) => clampWindow(item, dimensions)),
    pedestrianDoors: (scene.pedestrianDoors || []).map((item) => clampPedestrian(item, dimensions, door)),
  }
}

export function HomePage({ onStartFrom }) {
  const partners = useOfferPartners()
  const [cities, setCities] = useState(['Beograd', 'Zemun', 'Novi Sad', 'Pančevo', 'Subotica'])
  const [pick, setPick] = useState(0)
  const [size, setSize] = useState(SAMPLES[0].scene.dimensions)
  const sample = SAMPLES[pick]
  const live = useMemo(() => resize(sample.scene, size.width, size.length), [sample, size.width, size.length])
  const shown = useDeferredValue(live)
  const quote = useMemo(() => orientationQuote(shown, buildEstimate(shown), PRICES), [shown])
  const total = quoteTotal(quote)
  const jobs = SKILLS.filter((skill) => quote[skill.id]?.total > 0).map((skill) => ({ ...skill, total: quote[skill.id].total }))
  const largest = Math.max(1, ...jobs.map((job) => job.total))

  useEffect(() => {
    fetch('/api/craftsmen')
      .then((response) => response.json())
      .then((payload) => {
        const next = [...new Set((payload.craftsmen || []).map((entry) => entry.city).filter(Boolean))]
        next.sort((left, right) => left.localeCompare(right, 'sr'))
        if (next.length > 0) setCities(next)
      })
      .catch(() => {})
  }, [])

  function start(scene) {
    if (onStartFrom) onStartFrom(scene)
    else navigate('/konfigurator')
  }

  function choose(index) {
    setPick(index)
    setSize(SAMPLES[index].scene.dimensions)
  }

  return (
    <div className="relative h-full overflow-y-auto">
      <section className="mx-auto grid max-w-7xl gap-x-12 gap-y-8 px-4 pt-10 pb-14 md:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:pt-14">
        <div>
          <h1 className="text-[2.75rem] leading-[0.95] font-extrabold text-stone-950 sm:text-6xl xl:text-7xl">
            Složi {sample.object} po meri pre nego što pozoveš majstora.
          </h1>
          <p className="mt-5 max-w-[34rem] text-lg leading-relaxed text-stone-700">
            Probaj odmah: izaberi objekat i povuci kote. Model, spisak materijala i orijentaciona cena prate svaku
            izmenu, a upit ide majstorima i firmama tek kad ti odlučiš.
          </p>

          <div className="mt-8 max-w-[34rem] space-y-5">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-stone-300/60 p-1 sm:grid-cols-4" role="group" aria-label="Vrsta objekta">
              {SAMPLES.map((entry, index) => (
                <button
                  key={entry.type}
                  type="button"
                  aria-pressed={index === pick}
                  onClick={() => choose(index)}
                  className={`rounded-md px-3 py-2 text-[15px] font-semibold transition-colors ${
                    index === pick ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-white/70'
                  }`}
                >
                  {entry.type}
                </button>
              ))}
            </div>
            <Kota label="Širina" limits={DIMENSION_LIMITS.width} value={size.width} onChange={(width) => setSize((current) => ({ ...current, width }))} />
            <Kota label="Dužina" limits={DIMENSION_LIMITS.length} value={size.length} onChange={(length) => setSize((current) => ({ ...current, length }))} />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <button type="button" onClick={() => start(live)} className="btn-tape px-6 py-3.5 text-base">
              Nastavi sa ovim objektom
            </button>
            <a
              href="/dozvole"
              onClick={(event) => {
                event.preventDefault()
                navigate('/dozvole')
              }}
              className="font-semibold text-stone-800 underline decoration-stone-400 underline-offset-4 hover:decoration-stone-900"
            >
              Treba li mi dozvola?
            </a>
          </div>
        </div>

        {/* List crteža: model u okviru, ispod njega pečat sa merama i cenom. */}
        <figure className="overflow-hidden rounded-lg border-[1.5px] border-stone-900 bg-white">
          <GarageView
            {...viewProps(shown)}
            theta={0.7}
            orbit
            autoRotate={!STILL}
            background={CANVAS}
            className="h-[300px] w-full cursor-grab active:cursor-grabbing sm:h-[400px] xl:h-[460px]"
          />
          <figcaption className="border-t-[1.5px] border-stone-900">
            <dl className="grid grid-cols-2 sm:grid-cols-[1fr_1.3fr_0.8fr_1.6fr]">
              <Stamp label="Objekat" value={sample.type} className="border-r border-b sm:border-b-0" />
              <Stamp label="Širina × dužina" value={`${fmt(shown.dimensions.width)} × ${fmt(shown.dimensions.length)} m`} className="border-b sm:border-r sm:border-b-0" />
              <Stamp label="Osnova" value={`${Math.round(shown.dimensions.width * shown.dimensions.length)} m²`} className="border-r" />
              <Stamp label="Orijentaciono" value={formatDin(total)} strong />
            </dl>
          </figcaption>
        </figure>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <h2 className="text-4xl leading-none font-bold text-stone-950 md:text-5xl">Od ideje do majstora</h2>
          <ol className="mt-8 grid md:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="pb-8 md:pb-0">
                <div className="tape flex h-8 items-start">
                  <span className="font-display bg-stone-950 px-2.5 text-lg leading-8 font-bold text-tape">{index + 1}</span>
                </div>
                <h3 className="font-display mt-4 pr-6 text-2xl font-bold text-stone-950">{step.title}</h3>
                <p className="mt-1.5 max-w-xs pr-6 text-[15px] leading-relaxed text-stone-600">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="max-w-2xl">
          <h2 className="text-4xl leading-none font-bold text-stone-950 md:text-5xl">Od ostave do magacina</h2>
          <p className="mt-3 text-stone-600">Prevuci preko modela da ga okreneš. Svaki primer možeš da otvoriš i doradiš.</p>
        </div>
        <div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
          {SAMPLES.map((entry) => (
            <article key={entry.name}>
              <GarageView {...viewProps(entry.scene)} orbit background={CANVAS} className="h-56 w-full overflow-hidden rounded-lg" />
              <h3 className="font-display mt-3 text-2xl leading-tight font-bold text-stone-950">{entry.name}</h3>
              <p className="text-[15px] text-stone-600">{entry.tag}</p>
              <p className="mt-2 flex items-baseline justify-between gap-3 border-t border-stone-300 pt-2 text-[15px] tabular-nums">
                <span className="text-stone-600">
                  {fmt(entry.scene.dimensions.width)} × {fmt(entry.scene.dimensions.length)} m
                </span>
                <span className="font-display text-xl font-bold text-stone-950">{formatDin(priceOf(entry.scene))}</span>
              </p>
              <button
                type="button"
                onClick={() => start(entry.scene)}
                className="mt-3 w-full rounded-lg bg-stone-900 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-700"
              >
                Kreni od ovog
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-stone-900 text-white">
        <div className="mx-auto grid max-w-7xl gap-x-12 gap-y-8 px-4 py-16 md:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
          <div>
            <h2 className="text-4xl leading-none font-bold md:text-5xl">Cena, posao po posao</h2>
            <p className="mt-4 max-w-md leading-relaxed text-stone-300">
              Ovo je računica za objekat koji si podesio na vrhu strane: {sample.type.toLowerCase()} {fmt(shown.dimensions.width)} ×{' '}
              {fmt(shown.dimensions.length)} m. Svaki red je poseban upit za majstora koji radi taj deo.
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-stone-400">
              To nije ponuda majstora, već zbir materijala po stavkama. Ponuda je cena koju majstor unese kad prihvati upit.
            </p>
          </div>
          <table aria-label="Orijentaciona cena po poslovima" className="w-full self-start text-left tabular-nums">
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-white/15">
                  <th scope="row" className="py-2.5 pr-4 text-[15px] font-medium text-stone-200">
                    {job.name}
                  </th>
                  <td className="hidden w-2/5 py-2.5 sm:table-cell" aria-hidden="true">
                    <span className="block h-2 rounded-sm bg-tape" style={{ width: `${Math.max(2, (job.total / largest) * 100)}%` }} />
                  </td>
                  <td className="font-display py-2.5 pl-4 text-right text-xl font-semibold whitespace-nowrap">{formatDin(job.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="pt-4 text-[15px] font-medium text-stone-300">
                  Ukupno, orijentaciono
                </th>
                <td className="hidden sm:table-cell" />
                <td className="font-display pt-4 text-right text-4xl font-bold whitespace-nowrap text-tape">{formatDin(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <h2 className="text-4xl leading-none font-bold text-stone-950 md:text-5xl">Projekat koji majstor razume</h2>
        <dl className="mt-8 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="border-t-[1.5px] border-stone-900 pt-3 pb-8">
              <dt className="font-display text-2xl font-bold text-stone-950">{feature.title}</dt>
              <dd className="mt-1.5 text-[15px] leading-relaxed text-stone-600">{feature.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      {partners.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
          <div className="max-w-2xl">
            <h2 className="text-4xl leading-none font-bold text-stone-950 md:text-5xl">Uporedi komplet ponude</h2>
            <p className="mt-3 text-stone-600">
              Firma daje cene za ceo paket, pa ne skupljaš lim i šrafove sa više strana. Ponuda se računa za tvoj objekat u delu Računica.
            </p>
          </div>
          <ul className="mt-6 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
            {partners.map((partner) => (
              <li key={partner.id} className="border-t border-stone-300 py-3">
                <p className="flex items-baseline justify-between gap-3">
                  <span className="font-display text-xl font-bold text-stone-950">{partner.name}</span>
                  {partner.sponsored && <span className="rounded-sm bg-tape-soft px-1.5 text-xs text-stone-800">Sponzorisano</span>}
                </p>
                <p className="text-[15px] text-stone-600">{partner.city}</p>
                <p className="mt-1 text-sm text-stone-500">{partner.packages.map(packageName).join(', ')}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-x-12 gap-y-12 px-4 py-16 md:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-4xl leading-none font-bold text-stone-950 md:text-5xl">Radiš ili prodaješ?</h2>
            <div className="mt-6 border-t-[1.5px] border-stone-900 pt-4">
              <h3 className="font-display text-2xl font-bold text-stone-950">Radiš montažne objekte, krovove ili vrata</h3>
              <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-stone-600">
                Registruj radionicu i dobijaj upite sa gotovom računicom i crtežom. Plaćaš samo kad posao prihvatiš.
              </p>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600" aria-label="Gradovi sa radionicama">
                {cities.map((city) => (
                  <li key={city}>{city}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => navigate('/radionica')}
                className="mt-4 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-700"
              >
                Registruj radionicu
              </button>
            </div>
            <div className="mt-8 border-t-[1.5px] border-stone-900 pt-4">
              <h3 className="font-display text-2xl font-bold text-stone-950">Prodaješ lim, panele, vrata ili elektro opremu</h3>
              <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-stone-600">
                Unesi cenovnik jednom. Kupci vide tvoju komplet ponudu za svoj objekat, a stižu ti upiti sa gotovim spiskom stavki.
                Paketi su: {PACKAGES.map((pack) => pack.name.toLowerCase()).join(', ')}.
              </p>
              <button
                type="button"
                onClick={() => navigate('/partner')}
                className="mt-4 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-700"
              >
                Unesi cenovnik
              </button>
            </div>
          </div>
          <div>
            <h2 className="text-4xl leading-none font-bold text-stone-950 md:text-5xl">Kratki odgovori</h2>
            <div className="mt-6 border-t-[1.5px] border-stone-900">
              {QUESTIONS.map(([title, text]) => (
                <details key={title} className="group border-b border-stone-300">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 py-3 font-semibold text-stone-950">
                    {title}
                    <span aria-hidden="true" className="font-display text-2xl leading-none text-stone-500 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="max-w-xl pb-4 text-[15px] leading-relaxed text-stone-600">{text}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-stone-900 text-stone-400">
        <div className="tape h-3" aria-hidden="true" />
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm md:px-6">
          <span className="flex items-center gap-2.5">
            <LogoMark size={24} />
            <span className="font-display text-lg font-bold text-white">Mera</span>
            <span>Montažni objekti po meri</span>
          </span>
          <span>Cene su orijentacione. Količine nisu statički proračun.</span>
        </div>
      </footer>
    </div>
  )
}

// Kota: mera se menja povlačenjem po kotnoj liniji.
function Kota({ label, limits, value, onChange }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="text-[15px] font-semibold text-stone-700">{label}</span>
        <span className="font-display text-2xl leading-none font-bold text-stone-950 tabular-nums">{fmt(value)} m</span>
      </span>
      <input
        type="range"
        className="kota"
        min={limits.min}
        max={limits.max}
        step={limits.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function Stamp({ label, value, strong = false, className = '' }) {
  return (
    <div className={`border-stone-300 px-3 py-2.5 ${strong ? 'bg-tape' : ''} ${className}`}>
      <dt className={`text-xs ${strong ? 'text-stone-800' : 'text-stone-500'}`}>{label}</dt>
      <dd className="font-display text-xl leading-tight font-bold whitespace-nowrap text-stone-950 tabular-nums sm:text-2xl">{value}</dd>
    </div>
  )
}

function fmt(value) {
  return value.toFixed(1).replace('.', ',')
}

function viewProps(scene) {
  return {
    dimensions: scene.dimensions,
    ...sceneMaterials(scene),
    windows: scene.windows,
    door: scene.door,
    roof: scene.roof,
    gutters: scene.gutters !== false,
    pedestrianDoors: scene.pedestrianDoors || [],
    canopy: scene.canopy,
    theta: 0.6,
  }
}
