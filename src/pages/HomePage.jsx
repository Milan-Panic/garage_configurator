import { navigate } from '../nav'
import { DOOR_MATERIALS, ROOF_MATERIALS, WALL_MATERIALS, findMaterial } from '../materials'
import { initialScene } from '../scene'
import { GarageView } from '../components/GarageView'

const steps = [
  {
    title: 'Složi garažu',
    text: 'Širina, dužina, visina, krov na jednu ili dve vode, vrata i prozori. Vidiš objekat dok ga meriš.',
  },
  {
    title: 'Dobiješ računicu i crtež',
    text: 'Spisak profila, tabli i okova, plus tlocrt i dve fasade sa kotama glavnih delova.',
  },
  {
    title: 'Pošalji majstoru',
    text: 'Izabereš profesiju koja to radi i proslediš upit. Majstor dobija mere, ne prazan opis.',
  },
]

export function HomePage() {
  return (
    <div className="h-full overflow-y-auto">
      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.2fr_0.8fr] md:items-center md:py-20">
        <div>
          <p className="text-sm font-medium tracking-wide text-stone-500 uppercase">Samostalno kreiranje garaža</p>
          <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight text-stone-950 md:text-5xl">
            Složi garažu sam. Majstor dobija računicu i crtež.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-700">
            Mera je mesto gde garažu složiš pre nego što zoveš majstora. Odredi mere i krov, uzmi spisak materijala i
            dvodimenzionalne crteže, pa pošalji upit onome ko ume da je napravi.
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
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-12 md:grid-cols-3">
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
        <h2 className="text-2xl font-semibold text-stone-950">Šta majstor dobija u upitu</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ['Računica', 'Koliko stubova, venaca, rogova, tabli lima, šarki i oluka. Krilo više od 2 m nosi 3 šarke.'],
            ['Crteži', 'Tlocrt, prednja i leva strana, sa kotama širine, dužine, visine i otvora vrata.'],
            ['Ista garaža', 'Upit ide sa garažom koja je trenutno otvorena u konfiguratoru, ne sa praznim obrascem.'],
          ].map(([title, text]) => (
            <li key={title} className="rounded-xl border border-stone-300 bg-white p-4">
              <h3 className="font-medium text-stone-950">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{text}</p>
            </li>
          ))}
        </ul>
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
