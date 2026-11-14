import { navigate } from '../nav'

const LAW = {
  label: 'Zakon o planiranju i izgradnji',
  detail: 'Sl. glasnik RS, poslednja izmena 80/2026. Definicija pomoćnog objekta je u članu 2, a rešenje o odobrenju u članu 145.',
  url: 'https://www.paragraf.rs/propisi/zakon_o_planiranju_i_izgradnji.html',
}
const RULEBOOK = {
  label: 'Pravilnik o posebnoj vrsti objekata i radova',
  detail: 'Sl. glasnik RS, 87/2023, 16/2024 i 16/2026. Izuzeci su u članu 2, a objekti na osnovu rešenja u članu 4.',
  url: 'https://www.paragraf.rs/propisi/pravilnik-posebne-vrste-objekata-radova-za-koje-nije-potrebno-pribavljati-akt.html',
}
const ARTPROING = {
  label: 'Art Pro Ing: Do koliko kvadrata ne treba dozvola?',
  detail: 'Stručni tekst, nije propis.',
  url: 'https://artproing.rs/do-koliko-kvadrata-ne-treba-dozvola/',
}
const N1 = {
  label: 'N1: Nova pravila za solarne elektrane',
  detail: 'Novinski tekst o izmenama iz 2026.',
  url: 'https://n1info.rs/zeleni-kutak/solarne-elektrane-srbija-nova-pravila-dozvole-mali-proizvodjaci/',
}
const GRADNJA = {
  label: 'Gradnja.rs: Ključne izmene Zakona o planiranju i izgradnji',
  detail: 'Stručni tekst, nije propis.',
  url: 'https://www.gradnja.rs/kljucne-izmene-zakon-o-planiranju-i-izgradnji/',
}

const SOURCES = [LAW, RULEBOOK, ARTPROING, N1, GRADNJA]

const CASES = [
  {
    title: 'Garaža ili ostava uz kuću',
    answer: 'Obično rešenje o odobrenju, bez građevinske dozvole',
    text: 'Zakon garaže i ostave navodi kao primer pomoćnog objekta, a to je objekat koji služi glavnom objektu i gradi se na istoj parceli. Takvi objekti se grade na osnovu rešenja iz člana 145. Uz zahtev ide tehnička dokumentacija, a rok za odluku je pet radnih dana.',
    sources: [LAW, RULEBOOK],
  },
  {
    title: 'Nadstrešnica do 20 m²',
    answer: 'Akt nije potreban, uz uslove',
    text: 'Važi za nadstrešnicu osnove do 20 m² na istoj parceli kao glavni objekat, ako ne ometa korišćenje susednih objekata. Stručni sajtovi upozoravaju da nadstrešnica zatvorena zidovima više nije nadstrešnica.',
    sources: [RULEBOOK, ARTPROING],
  },
  {
    title: 'Radionica ili magacin bez kuće na parceli',
    answer: 'Računaj na građevinsku dozvolu',
    text: 'Bez glavnog objekta na istoj parceli ovo nije pomoćni objekat. Isto važi kad objekat služi kao zaseban poslovni prostor. Tada je najverovatnije potrebna građevinska dozvola, pa to proveri pre porudžbine materijala. Ovo je naše tumačenje definicije iz zakona, zato ga potvrdi u opštini.',
    sources: [LAW],
  },
  {
    title: 'Objekat na poljoprivrednom gazdinstvu',
    answer: 'Do 50 m² akt nije potreban',
    text: 'Pravilnik izuzima ekonomske objekte do 50 m² bruto površine. Veći ekonomski objekti idu preko rešenja o odobrenju.',
    sources: [RULEBOOK],
  },
  {
    title: 'Solarni paneli',
    answer: 'Do 10,8 kW akt nije potreban',
    text: 'Važi za elektranu za sopstvene potrebe. Od 10,8 do 150 kW treba rešenje o odobrenju. Priključenje na mrežu je poseban postupak preko Elektrodistribucije.',
    sources: [RULEBOOK, N1],
  },
]

const STEPS = [
  'Proveri u opštini šta lokalni plan dozvoljava na tvojoj parceli. Tu su udaljenost od međe, zauzetost parcele i visina.',
  'Proveri da li si vlasnik parcele i da li je glavni objekat upisan i legalan, jer se uz zahtev dokazuje pravo na zemljištu ili objektu.',
  'Ako treba rešenje ili dozvola, projektant priprema tehničku dokumentaciju, a zahtev se podnosi nadležnom organu.',
  'Po dobijanju rešenja prijavi radove, pa tek onda kreni sa gradnjom.',
]

function SourceLink({ source }) {
  return (
    <a href={source.url} target="_blank" rel="noreferrer" className="underline hover:text-stone-900">
      {source.label}
    </a>
  )
}

export function PermitsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-4xl leading-none font-bold text-stone-950 md:text-5xl">Da li ti treba dozvola?</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-700">
          Zakon ne pravi izuzetak zato što je objekat montažni. Važno je čemu služi i gde stoji, pre svega da li je uz glavni objekat na istoj parceli.
          Kratak pregled ispod je napravljen iz propisa i tekstova sa interneta.
        </p>
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-950 ring-1 ring-amber-200">
          Ovo je opšta informacija, nije pravni savet. Propisi se menjaju, a konačan odgovor za tvoju parcelu daje opštinska služba za urbanizam.
          Pregled je sastavljen u novembru 2026.
        </p>

        <div className="mt-8 space-y-3">
          {CASES.map((item) => (
            <section key={item.title} className="rounded-xl border border-stone-300 bg-white p-4">
              <h2 className="font-semibold text-stone-950">{item.title}</h2>
              <p className="mt-1 text-sm font-medium text-accent-700">{item.answer}</p>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{item.text}</p>
              <p className="mt-2 text-xs text-stone-500">
                Izvor:{' '}
                {item.sources.map((source, index) => (
                  <span key={source.url}>
                    {index > 0 && ' · '}
                    <SourceLink source={source} />
                  </span>
                ))}
              </p>
            </section>
          ))}
        </div>

        <h2 className="mt-10 text-xl font-semibold text-stone-950">Šta prvo da uradiš</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-stone-700">
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <h2 className="mt-10 text-xl font-semibold text-stone-950">Šta ako gradiš bez papira</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">
          Građevinska inspekcija može da obustavi radove i naloži uklanjanje objekta. Zato prvo proveri papire, pa tek onda poruči materijal.
        </p>
        <p className="mt-2 text-xs text-stone-500">
          Izvor: <SourceLink source={GRADNJA} />
        </p>

        <button
          type="button"
          onClick={() => navigate('/konfigurator')}
          className="mt-8 rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600"
        >
          Složi objekat
        </button>

        <h2 className="mt-10 text-xl font-semibold text-stone-950">Izvori</h2>
        <p className="mt-2 text-sm text-stone-700">Propisi su prvi na spisku. Pročitaj važeći tekst, jer se izmene objavljuju u Službenom glasniku.</p>
        <ul className="mt-3 space-y-2 text-sm text-stone-700">
          {SOURCES.map((source) => (
            <li key={source.url}>
              <SourceLink source={source} />
              <span className="block text-xs text-stone-500">{source.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
