import { useEffect, useState } from 'react'
import { navigate } from '../nav'
import { DOOR_MATERIALS, ROOF_MATERIALS, WALL_MATERIALS, findMaterial } from '../materials'
import { buildEstimate } from '../estimate'
import { formatDin, mergePrices, orientationQuote } from '../prices'
import { initialScene } from '../scene'
import { GarageView } from '../components/GarageView'
import { SKILLS } from './craftsmen'

const exampleTotal = Object.values(
  orientationQuote(initialScene, buildEstimate(initialScene), mergePrices(null)),
).reduce((sum, group) => sum + group.total, 0)

const steps = [
  {
    title: 'Nacrtaj',
    text: 'Prvi dolazak kreće od prazne garaže. Sačuvano ostaje u ovom pregledaču, pa sledeći put nastavljaš odatle.',
  },
  {
    title: 'Vidi orijentacionu cenu',
    text: 'Cena ide po poslu. To je orijentacija iz količina, a majstor kasnije kaže svoju.',
  },
  {
    title: 'Pošalji upit',
    text: 'Ime, prezime, imejl i telefon ostavljaš tek ovde. Svaki posao ide posebnim upitom majstoru koji ima taj skil.',
  },
  {
    title: 'Majstor zove posle odobrenja',
    text: 'Upit prvo ide na pregled. Posle odobrenja majstor unosi cenu. Telefon se otvara kad se plati naknada od 10%.',
  },
]

const questions = [
  ['Da li je cena ponuda?', 'Orijentacija iz materijala i mera. Ponuda je cena koju majstor unese kad prihvati upit.'],
  ['Da li treba nalog?', 'Crtež se pamti u pregledaču. Ime, prezime, imejl i telefon traže se na upitu.'],
  ['Kada majstor dobija broj?', 'Kad se plati naknada od 10% na cenu koju je uneo. Ostatak cene ide njemu.'],
  ['Šta je tih 10%?', 'Naknada platforme na prihvaćenu cenu. U adminu ostaje evidencija šta je plaćeno.'],
  ['Ko vidi moje garaže?', 'Samo pregledač u kom su sačuvane. Link iz poruke otvara iste garaže na drugom uređaju.'],
]

export function HomePage() {
  const [cities, setCities] = useState(['Beograd', 'Zemun', 'Novi Sad', 'Pančevo', 'Subotica'])

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

  return (
    <div className="h-full overflow-y-auto">
      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.2fr_0.8fr] md:items-center md:py-20">
        <div>
          <p className="text-sm font-medium tracking-wide text-stone-500 uppercase">Samostalno kreiranje garaža</p>
          <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight text-stone-950 md:text-5xl">
            Složi garažu sam. Majstor dobija računicu i crtež.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-700">
            Mera je mesto gde garažu složiš pre nego što zoveš majstora. Crtež ostaje u tvom pregledaču. Orijentacionu
            cenu vidiš odmah, a upit ide majstoru tek kad ostaviš ime, prezime, imejl i telefon, i kad bude odobren.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/konfigurator')}
              className="rounded-lg bg-stone-900 px-4 py-3 text-sm font-medium text-white"
            >
              Otvori konfigurator
            </button>
            <button
              type="button"
              onClick={() => navigate('/majstori')}
              className="rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-900"
            >
              Pogledaj majstore
            </button>
          </div>
        </div>
        <HeroMark />
      </section>

      <section className="border-y border-stone-300 bg-[#f7f4ef]">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-12 md:grid-cols-2">
          {steps.map((step, index) => (
            <article key={step.title}>
              <p className="text-sm font-medium text-stone-500">0{index + 1}</p>
              <h2 className="mt-2 text-xl font-semibold text-stone-950">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-2xl font-semibold text-stone-950">Napravljene garaže</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-700">
          Primeri iz konfiguratora. Prevuci mišem preko modela da ga malo okreneš.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {samples.map((sample) => (
            <article key={sample.name} className="overflow-hidden rounded-xl border border-stone-300 bg-white">
              <GarageView
                {...viewProps(sample.scene)}
                orbit
                className="h-64 w-full"
              />
              <h3 className="px-4 py-3 text-sm font-medium text-stone-950">{sample.name}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-2xl font-semibold text-stone-950">Šta dobijaš</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ['3D i mere', 'Tlocrt i dve fasade sa kotama. Krilo više od 2 m nosi 3 šarke.'],
            ['Računica po poslu', 'Konstrukcija, krov, oluk, ploča, rolo i stolarija ostaju razdvojeni.'],
            ['Majstor za taj skil', 'U ponudi je samo radionica koja radi taj deo. Jedan majstor može da pokrije više poslova, svaki posebnim upitom.'],
          ].map(([title, text]) => (
            <li key={title} className="rounded-xl border border-stone-300 bg-white p-4">
              <h3 className="font-medium text-stone-950">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-stone-300 bg-[#f7f4ef]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-2xl font-semibold text-stone-950">Primer orijentacione cene</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-700">
            Podrazumevana garaža iz konfiguratora, sa olukom i krilnim vratima, orijentaciono staje {formatDin(exampleTotal)}.
            To nije ponuda majstora.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {SKILLS.map((skill) => (
              <li key={skill.id} className="rounded-full border border-stone-300 bg-white px-3 py-1 text-sm text-stone-800">
                {skill.name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-2xl font-semibold text-stone-950">Gradovi sa radionicama</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {cities.map((city) => (
            <li key={city} className="rounded-lg bg-white px-3 py-2 text-sm text-stone-800">{city}</li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="text-2xl font-semibold text-stone-950">Kratka pitanja</h2>
        <div className="mt-4 space-y-3">
          {questions.map(([title, text]) => (
            <details key={title} className="rounded-xl border border-stone-300 bg-white px-4 py-3">
              <summary className="cursor-pointer font-medium text-stone-950">{title}</summary>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{text}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}

const samples = [
  {
    name: 'Ravan krov, srebrni lim',
    scene: {
      ...initialScene,
      wallMaterialId: 'trapez-t18-srebro',
      roofMaterialId: 'krov-trapez-antracit',
      door: { ...initialScene.door, style: 'double', open: 0.35 },
    },
  },
  {
    name: 'Dve vode i rolo vrata',
    scene: {
      ...initialScene,
      dimensions: { width: 5.2, length: 7, height: 2.5 },
      roof: { kind: 'duo', pitch: 18, fall: 'back', ridge: 'length' },
      door: { style: 'roller', wicket: false, open: 0.25, wall: 'front', along: 0, width: 3.2, height: 2.2 },
      doorMaterialId: 'rolo-antracit',
      gutters: true,
    },
  },
  {
    name: 'Jedna voda, bočna vrata',
    scene: {
      ...initialScene,
      dimensions: { width: 4, length: 6, height: 2.5 },
      wallMaterialId: 'drvena-daska',
      roof: { kind: 'mono', pitch: 12, fall: 'back', ridge: 'length' },
      pedestrianDoors: [{ id: 'pesacka-1', wall: 'left', along: -1.1, width: 0.9, height: 2.05 }],
    },
  },
]

function viewProps(scene) {
  return {
    dimensions: scene.dimensions,
    wallMaterial: findMaterial(WALL_MATERIALS, scene.wallMaterialId),
    roofMaterial: findMaterial(ROOF_MATERIALS, scene.roofMaterialId),
    doorMaterial: findMaterial(DOOR_MATERIALS, scene.doorMaterialId),
    windows: scene.windows,
    door: scene.door,
    roof: scene.roof,
    gutters: scene.gutters !== false,
    pedestrianDoors: scene.pedestrianDoors || [],
    theta: 0.6,
  }
}

function HeroMark() {
  return (
    <svg viewBox="0 0 420 300" className="w-full" aria-hidden="true">
      <rect width="420" height="300" rx="16" fill="#f7f4ef" />
      <polygon points="48,210 210,78 372,210" fill="none" stroke="#1c1917" strokeWidth="3" />
      <rect x="78" y="210" width="264" height="12" fill="#1c1917" />
      <rect x="150" y="148" width="120" height="74" fill="#fffcf8" stroke="#1c1917" strokeWidth="2" />
      <line x1="48" y1="248" x2="372" y2="248" stroke="#78716c" />
      <text x="210" y="270" textAnchor="middle" fontSize="14" fill="#44403c">
        širina · visina · otvor
      </text>
    </svg>
  )
}
