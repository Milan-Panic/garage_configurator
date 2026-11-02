import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Boxes,
  Calculator,
  CheckCircle2,
  FileText,
  Hammer,
  MapPin,
  MousePointerClick,
  PenTool,
  Send,
  ShieldCheck,
  Wrench,
} from 'lucide-react'
import { navigate } from '../nav'
import { DOOR_MATERIALS, ROOF_MATERIALS, WALL_MATERIALS, sceneMaterials } from '../materials'
import { FURNITURE_TYPES, WINDOW_TYPES } from '../layout'
import { buildEstimate } from '../estimate'
import { formatDin, mergePrices, orientationQuote, quoteTotal } from '../prices'
import { initialScene, normalizeScene } from '../scene'
import { GarageView } from '../components/GarageView'
import { LogoMark } from '../components/SiteHeader'
import { SKILLS } from './craftsmen'

const PRICES = mergePrices(null)

function priceOf(scene) {
  return quoteTotal(orientationQuote(scene, buildEstimate(scene), PRICES))
}

const exampleTotal = priceOf(initialScene)

const HERO = normalizeScene({
  ...initialScene,
  dimensions: { width: 6, length: 7, height: 2.7 },
  wallMaterialId: 'drvo-spaljeno',
  roofMaterialId: 'falc-cink',
  doorMaterialId: 'sekcijska-glatka-crna',
  roof: { kind: 'mono', pitch: 8, fall: 'back', ridge: 'length' },
  door: { style: 'sectional', open: 0.3, wall: 'front', along: -0.3, width: 4.6, height: 2.2 },
  windows: [{ id: 'window-1', type: 'strip', wall: 'left', along: 0, sill: 1.9, width: 2.4, height: 0.45, frame: 'crna' }],
  pedestrianDoors: [{ id: 'pesacka-1', wall: 'right', along: 1.8, width: 0.9, height: 2.05, glass: true }],
})

const SAMPLES = [
  {
    name: 'Moderna za dva vozila',
    tag: 'Fasadni panel · falc',
    scene: normalizeScene({
      ...initialScene,
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
    name: 'Brvnara sa radionicom',
    tag: 'Ariš · šindra · dvokrilna',
    scene: normalizeScene({
      ...initialScene,
      dimensions: { width: 4.4, length: 6.5, height: 2.5 },
      wallMaterialId: 'drvo-vertikalna',
      roofMaterialId: 'bitumenska-sindra-crvena',
      doorMaterialId: 'krilna-drvo-kosa',
      roof: { kind: 'duo', pitch: 25, fall: 'back', ridge: 'length' },
      door: { style: 'double', open: 0.3, wall: 'front', along: 0, width: 3, height: 2.1 },
      windows: [{ id: 'window-1', type: 'double', wall: 'left', along: 1, sill: 0.95, width: 1.2, height: 1, frame: 'hrast' }],
      pedestrianDoors: [{ id: 'pesacka-1', wall: 'left', along: -1.6, width: 0.9, height: 2.05 }],
    }),
  },
  {
    name: 'Zidana uz kuću',
    tag: 'Cigla · glineni crep · kasete',
    scene: normalizeScene({
      ...initialScene,
      dimensions: { width: 4, length: 6, height: 2.5 },
      wallMaterialId: 'fasadna-cigla',
      roofMaterialId: 'glineni-crep',
      doorMaterialId: 'sekcijska-kasete',
      roof: { kind: 'duo', pitch: 28, fall: 'back', ridge: 'width' },
      door: { style: 'sectional', open: 0, wall: 'front', along: 0, width: 2.7, height: 2.1 },
      windows: [{ id: 'window-1', type: 'tilt', wall: 'left', along: 0, sill: 1.6, width: 1, height: 0.5, frame: 'bela', bars: true }],
    }),
  },
]

const STEPS = [
  { icon: PenTool, title: 'Složi garažu', text: 'Mere, krov, fasada, vrata i prozori. Prvi dolazak kreće od prazne garaže, a sačuvano ostaje u ovom pregledaču.' },
  { icon: Calculator, title: 'Vidi računicu', text: 'Spisak profila, tabli i okova kakav pravi majstor, i orijentaciona cena po poslu — odmah, dok menjaš.' },
  { icon: Send, title: 'Pošalji upit', text: 'Svaki posao ide posebno majstoru koji ima taj skil. Ime, imejl i telefon ostavljaš tek tada.' },
  { icon: Hammer, title: 'Majstor zove', text: 'Upit prvo prolazi pregled. Majstor unese cenu, a kontakt se otvara kad se plati naknada od 10%.' },
]

const FEATURES = [
  { icon: Boxes, title: 'Pravi materijali', text: `${WALL_MATERIALS.length} obloga zidova, ${ROOF_MATERIALS.length} krovnih pokrivača, ${DOOR_MATERIALS.length} završnih obrada vrata i RAL boje.` },
  { icon: FileText, title: 'Crteži sa kotama', text: 'Tlocrt i dve fasade sa merama otvora i stubova. Krilo više od 2 m nosi 3 šarke.' },
  { icon: Wrench, title: 'Konstrukcija na uvid', text: 'Rendgen prikaz pokazuje stubove, vence i rogove iz računice. Vidiš šta plaćaš.' },
  { icon: ShieldCheck, title: 'Majstor za taj deo', text: 'Oluk limaru, ploča zidaru, vrata monteru. Jedan majstor može da pokrije više poslova.' },
]

const QUESTIONS = [
  ['Da li je cena ponuda?', 'Ne. To je orijentacija iz materijala i mera. Ponuda je cena koju majstor unese kad prihvati upit.'],
  ['Da li treba nalog?', 'Ne. Crtež se pamti u pregledaču. Ime, prezime, imejl i telefon traže se tek na upitu.'],
  ['Kada majstor dobija moj broj?', 'Kad se plati naknada od 10% na cenu koju je uneo. Ostatak cene ide direktno njemu.'],
  ['Ko vidi moje garaže?', 'Samo pregledač u kom su sačuvane. Link iz imejla otvara iste garaže na drugom uređaju.'],
  ['Da li je ovo statički proračun?', 'Ne. Preseci profila su uobičajeni za lake montažne garaže. Za teške krovove i velike raspone treba statičar.'],
]

export function HomePage({ onStartFrom }) {
  const [cities, setCities] = useState(['Beograd', 'Zemun', 'Novi Sad', 'Pančevo', 'Subotica'])
  const heroPrice = useMemo(() => priceOf(HERO), [])

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

  return (
    <div className="h-full overflow-y-auto">
      <section className="relative overflow-hidden bg-[#17181a] text-white">
        <div className="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.05fr_1fr] md:items-center md:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-orange-300 ring-1 ring-white/10">
              <span className="size-1.5 rounded-full bg-orange-400" />
              Samostalno projektovanje garaža
            </p>
            <h1 className="mt-5 max-w-xl text-4xl leading-[1.08] font-bold tracking-tight md:text-[3.4rem]">
              Složi garažu sam.
              <span className="block text-stone-400">Majstor dobija računicu i crtež.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-stone-300 md:text-lg">
              Mera je mesto gde garažu složiš u 3D pre nego što zoveš majstora. Vidiš spisak materijala i orijentacionu
              cenu dok menjaš, a upit ide samo majstorima koji rade taj deo posla.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/konfigurator')}
                className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
              >
                Otvori konfigurator
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => navigate('/majstori')}
                className="rounded-xl px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/5"
              >
                Pogledaj majstore
              </button>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-white/10 pt-6">
              <HeroStat value={`${WALL_MATERIALS.length + ROOF_MATERIALS.length + DOOR_MATERIALS.length}+`} label="materijala" />
              <HeroStat value={`${WINDOW_TYPES.length + FURNITURE_TYPES.length}`} label="prozora i predmeta" />
              <HeroStat value="0 RSD" label="za projektovanje" />
            </dl>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-2xl">
              <GarageView {...viewProps(HERO)} theta={0.7} autoRotate orbit className="h-[340px] w-full md:h-[440px]" />
            </div>
            <div className="absolute -bottom-4 left-4 flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-stone-900 shadow-xl">
              <Calculator size={18} className="text-orange-500" />
              <span>
                <span className="block text-[11px] text-stone-500">Ovaj model, orijentaciono</span>
                <span className="block text-sm font-bold tabular-nums">{formatDin(heroPrice)}</span>
              </span>
            </div>
            <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur">
              <MousePointerClick size={13} />
              Prevuci da okreneš
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <SectionHead eyebrow="Kako radi" title="Od ideje do majstora u četiri koraka" />
        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            return (
              <li key={step.title} className="relative rounded-2xl bg-white p-5 ring-1 ring-stone-200">
                <span className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                    <Icon size={20} />
                  </span>
                  <span className="text-3xl font-bold text-stone-200">0{index + 1}</span>
                </span>
                <h3 className="mt-4 font-semibold text-stone-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{step.text}</p>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHead eyebrow="Primeri" title="Napravljene garaže" text="Prevuci mišem preko modela da ga okreneš. Svaki primer možeš da otvoriš i doradiš." />
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {SAMPLES.map((sample) => (
              <article key={sample.name} className="group overflow-hidden rounded-2xl bg-[var(--page)] ring-1 ring-stone-200 transition hover:shadow-lg">
                <GarageView {...viewProps(sample.scene)} orbit className="h-60 w-full" />
                <div className="space-y-3 p-4">
                  <div>
                    <h3 className="font-semibold text-stone-950">{sample.name}</h3>
                    <p className="text-xs text-stone-500">
                      {sample.tag} · {fmt(sample.scene.dimensions.width)} × {fmt(sample.scene.dimensions.length)} m
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-stone-900 tabular-nums">≈ {formatDin(priceOf(sample.scene))}</span>
                    <button
                      type="button"
                      onClick={() => start(sample.scene)}
                      className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-stone-700"
                    >
                      Kreni od ovog
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <SectionHead eyebrow="Šta dobijaš" title="Projekat koji majstor razume" />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <li key={feature.title} className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
                <Icon size={22} className="text-orange-500" />
                <h3 className="mt-3 font-semibold text-stone-950">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{feature.text}</p>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-8 overflow-hidden rounded-3xl bg-[#17181a] p-8 text-white md:grid-cols-[1.2fr_1fr] md:p-10">
          <div>
            <p className="text-xs font-semibold tracking-wide text-orange-300 uppercase">Primer cene</p>
            <h2 className="mt-2 text-2xl font-bold md:text-3xl">Standardna garaža 6 × 8 m</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-400">
              Podrazumevana garaža iz konfiguratora, sa olukom i sekcijskim vratima. To nije ponuda majstora, već zbir
              po stavkama sa strane Cene.
            </p>
            <p className="mt-6 text-4xl font-bold tabular-nums">{formatDin(exampleTotal)}</p>
          </div>
          <div>
            <p className="text-sm text-stone-400">Računica je podeljena po poslovima:</p>
            <ul className="mt-3 space-y-2">
              {SKILLS.map((skill) => (
                <li key={skill.id} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={16} className="text-orange-400" />
                  {skill.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-16 md:grid-cols-2">
        <div>
          <SectionHead eyebrow="Mreža" title="Gradovi sa radionicama" />
          <ul className="mt-6 flex flex-wrap gap-2">
            {cities.map((city) => (
              <li key={city} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm text-stone-800 ring-1 ring-stone-200">
                <MapPin size={13} className="text-orange-500" />
                {city}
              </li>
            ))}
          </ul>
          <div className="mt-8 rounded-2xl bg-orange-50 p-5 ring-1 ring-orange-200">
            <h3 className="font-semibold text-stone-950">Radiš garaže, krovove ili vrata?</h3>
            <p className="mt-1 text-sm leading-relaxed text-stone-700">
              Registruj radionicu i dobijaj upite sa gotovom računicom i crtežom. Plaćaš samo kad posao prihvatiš.
            </p>
            <button
              type="button"
              onClick={() => navigate('/radionica')}
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Otvori radionicu
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
        <div>
          <SectionHead eyebrow="Pitanja" title="Kratki odgovori" />
          <div className="mt-6 space-y-2">
            {QUESTIONS.map(([title, text]) => (
              <details key={title} className="group rounded-xl bg-white px-4 py-3 ring-1 ring-stone-200">
                <summary className="flex cursor-pointer items-center justify-between font-medium text-stone-950">
                  {title}
                  <span className="text-stone-400 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{text}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-sm text-stone-500">
          <span className="flex items-center gap-2">
            <LogoMark size={24} />
            <span className="font-semibold text-stone-900">Mera</span> · Složi garažu sam.
          </span>
          <span>Cene su orijentacione. Količine nisu statički proračun.</span>
        </div>
      </footer>
    </div>
  )
}

function HeroStat({ value, label }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="text-xl font-bold text-white tabular-nums">{value}</dd>
      <dd className="text-xs text-stone-400">{label}</dd>
    </div>
  )
}

function SectionHead({ eyebrow, title, text }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-orange-600 uppercase">{eyebrow}</p>
      <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-stone-950 md:text-3xl">{title}</h2>
      {text && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">{text}</p>}
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
    theta: 0.6,
  }
}
