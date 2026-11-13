import { useMemo, useState } from 'react'
import { ArrowLeft, Printer } from 'lucide-react'
import { buildingType } from '../buildings'
import { ElevationSheet, PlanSheet, RoofPlanSheet, SectionSheet } from '../components/Drawings'
import { GarageView } from '../components/GarageView'
import { PatternSwatch } from '../components/PatternSwatch'
import { LogoMark } from '../components/SiteHeader'
import { INSULATION_OPTIONS, findRal, sceneMaterials } from '../materials'
import { navigate } from '../nav'
import { formatDin, orientationQuote, quoteItems, quoteTotal } from '../prices'
import { roofGeometry } from '../roof'
import { roomKind } from '../rooms'
import { WIND_OPTIONS, placeName } from '../site'

const SHOTS = [
  { id: 'hero', label: 'Objekat u dvorištu, pogled spreda', setting: 'yard', theta: 0.62, phi: 1.3, zoom: 0.82 },
  { id: 'back', label: 'Pogled otpozadi', setting: 'yard', theta: Math.PI + 0.7, phi: 1.28, zoom: 0.85 },
  { id: 'side', label: 'Pogled sa strane', setting: 'yard', theta: -1.25, phi: 1.32, zoom: 0.85 },
  { id: 'inside', label: 'Raspored unutra, bez krova', setting: 'studio', theta: 0.5, phi: 0.62, zoom: 1.2, hideRoof: true, interior: true },
]

const num = (value, digits = 2) => value.toFixed(digits).replace('.', ',')
const qty = (value) => (Number.isInteger(value) ? String(value) : num(value))

export function OfferPage({ scene, projectName, estimate, catalog }) {
  const [shots, setShots] = useState({})
  const [customer, setCustomer] = useState('')
  const [place, setPlace] = useState('')
  const materials = useMemo(() => sceneMaterials(scene), [scene])
  const quote = useMemo(() => orientationQuote(scene, estimate, catalog), [scene, estimate, catalog])
  const total = quoteTotal(quote)
  const { dimensions, roof } = scene
  const units = scene.units || 1
  const rise = roofGeometry(dimensions, roof).rise
  const footprint = dimensions.width * dimensions.length * units
  const type = buildingType(scene.buildingType)
  const [issued] = useState(() => new Date())
  const today = issued.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'long', year: 'numeric' })
  const number = `MERA-${issued.toISOString().slice(2, 10).replace(/-/g, '')}`

  // Tabela po stavkama: sve iz računice, pa otvori koji se cene po površini.
  const sections = useMemo(() => {
    const priceOf = (id) => Number(catalog.find((entry) => entry.id === id)?.price) || 0
    const groups = []
    const push = (label, row) => {
      let group = groups.find((entry) => entry.label === label)
      if (!group) {
        group = { label, rows: [], total: 0 }
        groups.push(group)
      }
      group.rows.push(row)
      group.total += row.total
    }
    const listed = new Set()
    estimate.lines.forEach((entry) => {
      const unitPrice = entry.priceId ? priceOf(entry.priceId) : 0
      const amount = entry.meters ?? entry.quantity
      if (entry.priceId) listed.add(entry.priceId)
      push(entry.section, {
        name: entry.item,
        detail: entry.detail,
        quantity: entry.quantity,
        unit: entry.unit,
        priced: entry.priceUnit && entry.priceUnit !== entry.unit ? `${qty(Math.round(amount * 100) / 100)} ${entry.priceUnit}` : '',
        unitPrice,
        total: unitPrice ? Math.round(amount * unitPrice) : 0,
      })
    })
    quoteItems(scene, estimate)
      .filter((item) => !listed.has(item.priceId))
      .forEach((item) => {
        const unitPrice = priceOf(item.priceId)
        push('Otvori, po površini', { name: item.name, detail: '', quantity: Math.round(item.quantity * 100) / 100, unit: item.unit, priced: '', unitPrice, total: unitPrice ? Math.round(item.quantity * unitPrice) : 0 })
      })
    return groups
  }, [scene, estimate, catalog])

  const sizing = estimate.sizing
  const member = sizing.truss ? sizing.chord : sizing.rafter
  const wind = WIND_OPTIONS.find((entry) => entry.id === scene.site?.wind) ?? WIND_OPTIONS[1]
  const ral = (id) => (findRal(id) ? `RAL ${id} ${findRal(id).name}` : 'fabrička boja')
  const facts = [
    ['Vrsta objekta', `${type.name}${units > 1 ? `, ${units} jedinice u nizu` : ''}`],
    ['Spoljne mere', `${num(dimensions.width * units)} × ${num(dimensions.length)} m`],
    ['Visina do strehe', `${num(dimensions.height)} m`],
    ['Visina do slemena', `${num(dimensions.height + rise)} m`],
    ['Površina osnove', `${num(footprint)} m²`],
    ['Krov', roof.kind === 'flat' ? 'ravan' : `${roof.kind === 'mono' ? 'jedna voda' : 'dve vode'}, nagib ${roof.pitch}°`],
    ['Krovni nosač', `${estimate.profiles.rafter.name}${sizing.truss ? ' (rešetka)' : ''}`],
    ['Glavna vrata', scene.door.style === 'none' ? 'otvor bez krila' : `${num(scene.door.width)} × ${num(scene.door.height)} m`],
    ['Prozori i bočna vrata', `${scene.windows.length * units} prozora, ${(scene.pedestrianDoors || []).length * units} vrata`],
    ['Izolacija', INSULATION_OPTIONS.find((entry) => entry.id === scene.insulation)?.name ?? 'bez'],
    ['Prostorije', (scene.rooms || []).length ? scene.rooms.map((room) => roomKind(room.kind).name).join(', ') : 'nema'],
    ['Lokacija', `${placeName(scene.site)}, ${scene.site?.altitude ?? 117} m n.v., ${wind.name.toLowerCase()}`],
  ]
  const swatches = [
    { label: 'Zidovi', spec: materials.wallMaterial, color: ral(scene.wallColor) },
    { label: 'Krov', spec: materials.roofMaterial, color: ral(scene.roofColor) },
    ...(scene.door.style === 'none' ? [] : [{ label: 'Vrata', spec: materials.doorMaterial, color: ral(scene.doorColor) }]),
    { label: 'Pod', spec: materials.floorMaterial, color: '' },
  ]
  const viewProps = {
    dimensions,
    ...materials,
    windows: scene.windows,
    door: scene.door,
    roof,
    gutters: scene.gutters !== false,
    pedestrianDoors: scene.pedestrianDoors || [],
    canopy: scene.canopy,
    scene,
  }
  const check = [
    ['Sneg na krovu', `${num(sizing.snow)} kN/m²`, `${placeName(scene.site)}, ${scene.site?.altitude ?? 117} m n.v.`],
    ['Sopstvena težina krova', `${num(sizing.areaLoad - sizing.snow)} kN/m²`, 'pokrivač, rožnjače, nosači i eventualni paneli'],
    ['Razmak nosača', `${num(sizing.spacing)} m`, sizing.truss ? 'rešetke' : 'kutijasti nosači'],
    ['Opterećenje nosača', `${num(sizing.load)} kN/m`, 'površinsko opterećenje × razmak'],
    ['Raspon', `${num(sizing.span)} m`, 'između oslonaca'],
    ['Moment savijanja', `${num(member.moment)} kNm`, 'q · L² / 8, prosta greda'],
    ...(sizing.truss
      ? [
          ['Visina rešetke', `${num(sizing.chord.depth)} m`, ''],
          ['Sila u pojasu', `${num(sizing.chord.force, 1)} kN`, 'moment / visina rešetke'],
          ['Napon u pojasu', `${Math.round(sizing.chord.stress)} MPa`, 'dozvoljeno 96 MPa zbog izvijanja'],
        ]
      : [
          ['Napon u nosaču', `${Math.round(sizing.rafter.stress)} MPa`, 'dozvoljeno 160 MPa'],
          ['Ugib', `${Math.round(sizing.rafter.sag)} mm`, `dozvoljeno ${Math.round(sizing.rafter.allowed)} mm (L/200)`],
        ]),
    ['Izabran presek', member.profile.name, `iskorišćen ${Math.round(member.use * 100)}%`],
  ]

  return (
    <div className="offer h-full overflow-y-auto bg-stone-300">
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-stone-300 bg-white/95 px-4 py-2.5 backdrop-blur">
        <button type="button" onClick={() => navigate('/konfigurator')} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100">
          <ArrowLeft size={15} />
          Konfigurator
        </button>
        <input value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="Ime kupca (ide na ponudu)" className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm" />
        <input value={place} onChange={(event) => setPlace(event.target.value)} placeholder="Adresa ili parcela" className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm" />
        <button type="button" onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
          <Printer size={15} />
          Štampaj ili sačuvaj kao PDF
        </button>
      </div>

      {/* 1. Naslovna */}
      <Page number={1} code={number}>
        <header className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-3">
            <LogoMark size={44} />
            <div>
              <p className="text-xl font-bold tracking-tight text-stone-950">Mera</p>
              <p className="text-xs text-stone-500">Montažni objekti po meri</p>
            </div>
          </div>
          <div className="text-right text-xs leading-relaxed text-stone-600">
            <p className="text-sm font-semibold text-stone-950">Orijentaciona ponuda {number}</p>
            <p>{today}</p>
            {customer && <p>Za: {customer}</p>}
            {place && <p>{place}</p>}
          </div>
        </header>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-stone-950">{projectName}</h1>
        <p className="mt-1 text-sm text-stone-600">
          {type.name} {num(dimensions.width * units)} × {num(dimensions.length)} × {num(dimensions.height)} m · {num(footprint)} m²
        </p>
        <Shot shot={SHOTS[0]} image={shots.hero} viewProps={viewProps} onShot={(image) => setShots((current) => ({ ...current, hero: image }))} className="mt-4 aspect-[16/9] w-full" />
        <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-6">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            {facts.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 border-b border-stone-200 pb-1">
                <dt className="text-stone-500">{label}</dt>
                <dd className="text-right font-medium text-stone-900">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="rounded-xl bg-stone-900 px-5 py-4 text-right text-white">
            <p className="text-[11px] tracking-wide text-stone-400 uppercase">Orijentaciono, materijal</p>
            <p className="text-2xl font-semibold tabular-nums">{formatDin(total)}</p>
            <p className="text-xs text-stone-400">oko {formatDin(total / Math.max(1, footprint))} po m²</p>
          </div>
        </div>
      </Page>

      {/* 2. Prikazi i materijali */}
      <Page number={2} code={number} title="Prikazi i materijali">
        <div className="grid grid-cols-2 gap-3">
          {SHOTS.slice(1).map((shot, index) => (
            <figure key={shot.id} className={index === 2 ? 'col-span-2' : ''}>
              <Shot shot={shot} image={shots[shot.id]} viewProps={viewProps} onShot={(image) => setShots((current) => ({ ...current, [shot.id]: image }))} className={index === 2 ? 'aspect-[21/9] w-full' : 'aspect-[4/3] w-full'} />
              <figcaption className="mt-1 text-xs text-stone-500">{shot.label}</figcaption>
            </figure>
          ))}
        </div>
        <h3 className="mt-6 text-sm font-semibold tracking-wide text-stone-500 uppercase">Materijali</h3>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {swatches.map((entry) => (
            <div key={entry.label} className="avoid-break flex gap-3 rounded-lg border border-stone-200 p-2">
              <PatternSwatch spec={entry.spec} width={180} height={120} className="h-20 w-28 shrink-0 rounded-md border border-black/10" />
              <div className="min-w-0 text-sm">
                <p className="text-[11px] tracking-wide text-stone-500 uppercase">{entry.label}</p>
                <p className="font-semibold text-stone-900">{entry.spec.name}</p>
                <p className="text-xs leading-snug text-stone-600">{entry.spec.detail}</p>
                {entry.color && entry.spec.tintable && <p className="text-xs text-stone-500">{entry.color}</p>}
              </div>
            </div>
          ))}
        </div>
      </Page>

      {/* 3. Osnova i krov */}
      <Page number={3} code={number} title="Osnova i krovna konstrukcija">
        <PlanSheet scene={scene} />
        <div className="mt-4">
          <RoofPlanSheet scene={scene} />
        </div>
      </Page>

      {/* 4. Izgledi */}
      <Page number={4} code={number} title="Izgledi">
        <div className="space-y-3">
          {['front', 'back', 'left', 'right'].map((id) => (
            <ElevationSheet key={id} scene={scene} wall={id} />
          ))}
        </div>
      </Page>

      {/* 5. Presek i provera nosača */}
      <Page number={5} code={number} title="Presek i provera krovnog nosača">
        <SectionSheet scene={scene} />
        <table className="mt-5 w-full text-sm">
          <tbody>
            {check.map(([label, value, comment]) => (
              <tr key={label} className="border-b border-stone-200">
                <td className="py-1.5 text-stone-600">{label}</td>
                <td className="py-1.5 text-right font-semibold text-stone-900 tabular-nums">{value}</td>
                <td className="py-1.5 pl-4 text-xs text-stone-500">{comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${sizing.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-950'}`}>
          {sizing.ok
            ? 'Izabrani presek zadovoljava ovu grubu proveru na napon i ugib.'
            : 'Izabrani presek ne zadovoljava ovu grubu proveru. Konstrukciju mora da odredi statičar.'}{' '}
          Provera je prosta greda pod ravnomernim opterećenjem i ne zamenjuje statički proračun po SRPS EN 1991 i 1993.
        </p>
      </Page>

      {/* 6. Predmer i cena po stavkama */}
      <Page number={6} code={number} title="Predmer i orijentaciona cena po stavkama">
        <table className="w-full border-collapse text-[11px] leading-snug">
          <thead>
            <tr className="border-b-2 border-stone-900 text-left text-[10px] tracking-wide text-stone-500 uppercase">
              <th className="py-1.5 pr-2 font-medium">Stavka</th>
              <th className="py-1.5 pr-2 text-right font-medium">Količina</th>
              <th className="py-1.5 pr-2 text-right font-medium">Jed. cena</th>
              <th className="py-1.5 text-right font-medium">Iznos</th>
            </tr>
          </thead>
          {sections.map((section) => (
            <tbody key={section.label} className="avoid-break">
              <tr className="bg-stone-100">
                <td colSpan={3} className="px-2 py-1 text-xs font-semibold text-stone-900">
                  {section.label}
                </td>
                <td className="px-2 py-1 text-right text-xs font-semibold text-stone-900 tabular-nums">{section.total ? formatDin(section.total) : ''}</td>
              </tr>
              {section.rows.map((row, index) => (
                <tr key={`${row.name}${index}`} className="border-b border-stone-200 align-top">
                  <td className="py-1 pr-2">
                    <span className="text-stone-900">{row.name}</span>
                    {row.detail && <span className="block text-[10px] text-stone-500">{row.detail}</span>}
                  </td>
                  <td className="py-1 pr-2 text-right whitespace-nowrap tabular-nums">
                    {qty(row.quantity)} {row.unit}
                    {row.priced && <span className="block text-[10px] text-stone-500">{row.priced}</span>}
                  </td>
                  <td className="py-1 pr-2 text-right whitespace-nowrap tabular-nums text-stone-600">{row.unitPrice ? formatDin(row.unitPrice) : '—'}</td>
                  <td className="py-1 text-right whitespace-nowrap tabular-nums font-medium">{row.total ? formatDin(row.total) : '—'}</td>
                </tr>
              ))}
            </tbody>
          ))}
          <tfoot>
            <tr className="border-t-2 border-stone-900">
              <td colSpan={3} className="py-2 text-sm font-semibold text-stone-950">
                Ukupno, orijentaciono
              </td>
              <td className="py-2 text-right text-sm font-semibold text-stone-950 tabular-nums">{formatDin(total)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="mt-2 text-[10px] text-stone-500">Stavke sa crticom nemaju cenu u cenovniku i nisu u zbiru. Rad majstora, prevoz i PDV nisu uračunati.</p>
      </Page>

      {/* 7. Napomene */}
      <Page number={7} code={number} title="Upozorenja i napomene">
        {estimate.warnings.length > 0 && (
          <ul className="space-y-1.5">
            {estimate.warnings.map((warning) => (
              <li key={warning} className="avoid-break rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
                {warning}
              </li>
            ))}
          </ul>
        )}
        <ul className="mt-4 space-y-1.5 text-xs leading-relaxed text-stone-700">
          {estimate.notes.map((note) => (
            <li key={note} className="avoid-break">
              · {note}
            </li>
          ))}
        </ul>
        <div className="avoid-break mt-6 rounded-lg border border-stone-300 p-3 text-xs leading-relaxed text-stone-600">
          <p className="font-semibold text-stone-900">Šta ova ponuda jeste</p>
          <p className="mt-1">
            Orijentacioni predmer i cena materijala iz konfiguratora, na dan {today}. Količine nisu statički proračun, a cene nisu obavezujuće dok ih firma ili majstor ne
            potvrde svojom ponudom. Crteži služe za dogovor i upit, ne za izvođenje.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-10 text-xs text-stone-500">
          <div className="border-t border-stone-400 pt-1">Kupac</div>
          <div className="border-t border-stone-400 pt-1">Mera</div>
        </div>
      </Page>
    </div>
  )
}

function Page({ number, code, title, children }) {
  return (
    <section className="offer-page relative mx-auto my-6 flex min-h-[297mm] w-[210mm] max-w-full flex-col bg-white p-[14mm] shadow-xl">
      {title && <h2 className="mb-4 border-b border-stone-300 pb-2 text-lg font-semibold text-stone-950">{title}</h2>}
      <div className="flex-1">{children}</div>
      <footer className="mt-4 flex justify-between border-t border-stone-200 pt-2 text-[10px] text-stone-400">
        <span>Mera · {code}</span>
        <span>strana {number}</span>
      </footer>
    </section>
  )
}

// Dok se 3D ne iscrta stoji živo platno; posle toga slika, koja se pouzdano štampa.
function Shot({ shot, image, viewProps, onShot, className }) {
  if (image) return <img src={image} alt={shot.label} className={`${className} rounded-lg object-cover`} />
  return (
    <div className={`${className} overflow-hidden rounded-lg bg-stone-100`}>
      <GarageView {...viewProps} setting={shot.setting} theta={shot.theta} phi={shot.phi} zoom={shot.zoom} hideRoof={shot.hideRoof} interior={shot.interior} onShot={onShot} className="h-full w-full" />
    </div>
  )
}
