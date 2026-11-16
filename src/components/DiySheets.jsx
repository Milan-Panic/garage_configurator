import { useMemo } from 'react'
import { assemblySteps, shoppingList, slabSpec, toolList } from '../assembly'
import { BAR_LENGTH, cutPositions, cuttingPlan } from '../cutting'
import { roofSheets, wallSheets } from '../sheets'

// Listovi dokumentacije iz paketa „Uradi sam”: sadržaj za strane ponude.

const m = (value, digits = 2) => value.toFixed(digits).replace('.', ',')
const head = 'border-b-2 border-stone-900 text-left text-[10px] text-stone-500'

function quantity(value) {
  return Number.isInteger(value) ? String(value) : m(value)
}

export function PositionsSheet({ estimate }) {
  const positions = useMemo(() => cutPositions(estimate), [estimate])
  return (
    <>
      <table className="w-full border-collapse text-[11px] leading-snug">
        <thead>
          <tr className={head}>
            <th className="w-10 py-1.5 font-medium">Poz.</th>
            <th className="py-1.5 font-medium">Deo konstrukcije</th>
            <th className="py-1.5 font-medium">Profil</th>
            <th className="py-1.5 text-right font-medium">Dužina</th>
            <th className="py-1.5 text-right font-medium">Komada</th>
            <th className="py-1.5 pl-3 font-medium">Rez krajeva</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position) => (
            <tr key={position.mark} className="border-b border-stone-200">
              <td className="py-1 font-semibold tabular-nums">{position.mark}</td>
              <td className="py-1">{position.part}</td>
              <td className="py-1 text-stone-600">{position.profile}</td>
              <td className="py-1 text-right tabular-nums">{m(position.length)} m</td>
              <td className="py-1 text-right tabular-nums">{position.count}</td>
              <td className="py-1 pl-3 tabular-nums">{position.ends}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[10px] leading-relaxed text-stone-500">
        Dužine su zaokružene naviše na 5 cm i mere se po osi profila. Rez krajeva je otklon od ravnog reza, kako se podešava na testeri:
        „ravno” je rez pod pravim uglom na osu, a dva broja znače različite rezove na dva kraja. Uz deo koji leži skoro uz susedni piše da se seče po meri. Ugao je izračunat iz geometrije skeleta i
        pretpostavlja da deo naleže čelom na susedni; kod ispune rešetke na dve vode važi za donji kraj. Prvi komad svake pozicije probaj na
        mestu pre nego što isečeš ostale. Broj pozicije je isti kao u krugovima na crtežima.
      </p>
    </>
  )
}

export function CuttingSheet({ estimate }) {
  const plan = useMemo(() => cuttingPlan(estimate), [estimate])
  return (
    <div className="space-y-4">
      {plan.map((group) => (
        <div key={group.profile} className="avoid-break">
          <p className="flex items-baseline justify-between gap-3 border-b border-stone-900 pb-1 text-xs">
            <span className="font-semibold text-stone-950">{group.profile}</span>
            <span className="text-stone-600 tabular-nums">
              {group.barCount} × {BAR_LENGTH} m · otpad {m(group.waste)} m ({group.wastePct}%)
            </span>
          </p>
          <ul className="mt-1.5 space-y-1">
            {group.bars.map((bar, index) => (
              <li key={index} className="flex items-center gap-2 text-[10px]">
                <span className="w-7 shrink-0 text-right font-semibold tabular-nums">{bar.times}×</span>
                <span className="flex h-5 flex-1 overflow-hidden rounded-sm border border-stone-400 bg-stone-100">
                  {bar.pieces.map((piece, at) => (
                    <span
                      key={at}
                      className="flex items-center justify-center overflow-hidden border-r border-stone-500 bg-tape-soft whitespace-nowrap tabular-nums"
                      style={{ width: `${(piece.length / BAR_LENGTH) * 100}%` }}
                    >
                      {piece.length >= 0.5 ? `${piece.mark}: ${m(piece.length)}` : piece.mark}
                    </span>
                  ))}
                </span>
                <span className="w-16 shrink-0 text-stone-500 tabular-nums">ostaje {m(bar.rest)}</span>
              </li>
            ))}
          </ul>
          {group.joined && <p className="mt-1 text-[10px] text-stone-500">Ima delova dužih od {BAR_LENGTH} m: spajaju se zavarivanjem ili se poručuje šipka od 12 m.</p>}
        </div>
      ))}
      <p className="text-[10px] leading-relaxed text-stone-500">
        Broj u polju je pozicija sa spiska profila, a iza dvotačke dužina komada u metrima. Računato je 3 mm po rezu. Raspored je predlog koji
        štedi šipke; pre sečenja proveri mere na licu mesta.
      </p>
    </div>
  )
}

export function SlabSheet({ scene, estimate }) {
  const slab = slabSpec(scene, estimate)
  const rows = [
    ['Mere ploče', `${m(slab.width)} × ${m(slab.length)} m, debljina ${Math.round(slab.thickness * 100)} cm`],
    ['Dijagonala za proveru pravog ugla', `${m(slab.diagonal)} m`],
    ['Površina', `${m(slab.area, 1)} m²`],
    ['Beton', `${m(slab.volume)} m³`],
    ...[slab.cement, slab.gravel, slab.sand, slab.mesh].filter(Boolean).map((line) => [line.item, `${quantity(line.quantity)} ${line.unit}${line.detail ? ` (${line.detail})` : ''}`]),
    ['Ankeri za stubove', `${slab.anchors} kom`],
  ]
  return (
    <>
      <table className="w-full border-collapse text-xs">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-stone-200">
              <td className="py-1.5 text-stone-600">{label}</td>
              <td className="py-1.5 text-right font-medium text-stone-900 tabular-nums">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[10px] leading-relaxed text-stone-500">
        Ploča od 15 cm sa jednom mrežom važi za laka vozila i ravan, nosiv teren. Za dizalicu, teška vozila, nasip ili kosinu traži savet
        građevinskog inženjera. Ankeri se buše u očvrsli beton na pozicijama stubova sa crteža osnove.
      </p>
    </>
  )
}

export function AssemblySheet({ scene, estimate }) {
  const { steps, notes } = assemblySteps(scene, estimate)
  const tools = toolList(scene)
  return (
    <>
      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li key={step.title} className="avoid-break flex gap-3 text-xs leading-relaxed">
            <span className="font-display flex size-6 shrink-0 items-center justify-center rounded-sm bg-stone-900 text-sm font-bold text-white">{index + 1}</span>
            <span>
              <span className="font-semibold text-stone-950">{step.title}. </span>
              <span className="text-stone-700">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
      {notes.map((note) => (
        <p key={note} className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {note}
        </p>
      ))}
      <h3 className="mt-5 border-b border-stone-300 pb-1 text-sm font-semibold text-stone-950">Alat</h3>
      <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] leading-snug text-stone-700">
        {tools.map((tool) => (
          <li key={tool}>{tool}</li>
        ))}
      </ul>
      <p className="mt-3 text-[10px] leading-relaxed text-stone-500">
        Redosled je opšti vodič za lake montažne objekte i ne zamenjuje uputstva proizvođača panela, vrata i krovnog pokrivača. Rad na visini i
        zavarivanje traže zaštitnu opremu i iskustvo.
      </p>
    </>
  )
}

export function ShoppingSheet({ estimate }) {
  const groups = useMemo(() => shoppingList(estimate), [estimate])
  return (
    <table className="w-full border-collapse text-[11px] leading-snug">
      <thead>
        <tr className={head}>
          <th className="w-6 py-1.5" />
          <th className="py-1.5 font-medium">Stavka</th>
          <th className="py-1.5 text-right font-medium">Količina</th>
        </tr>
      </thead>
      {groups.map((group) => (
        <tbody key={group.name} className="avoid-break">
          <tr className="bg-stone-100">
            <td colSpan={3} className="px-2 py-1 text-xs font-semibold text-stone-900">
              {group.name}
            </td>
          </tr>
          {group.items.map((line, index) => (
            <tr key={`${line.item}${index}`} className="border-b border-stone-200 align-top">
              <td className="py-1">
                <span className="mt-0.5 block size-3 rounded-sm border border-stone-500" />
              </td>
              <td className="py-1 pr-2">
                <span className="text-stone-900">{line.item}</span>
                {line.detail && <span className="block text-[10px] text-stone-500">{line.detail}</span>}
              </td>
              <td className="py-1 text-right whitespace-nowrap tabular-nums">
                {quantity(line.quantity)} {line.unit}
              </td>
            </tr>
          ))}
        </tbody>
      ))}
    </table>
  )
}

// Srpska množina: 1 tabla, 2 table, 5 tabli.
function plural(count, [one, few, many]) {
  const last = count % 10
  const teen = count % 100 >= 11 && count % 100 <= 14
  if (last === 1 && !teen) return one
  return last >= 2 && last <= 4 && !teen ? few : many
}

const WALL_NAMES = { front: 'Zid spreda', back: 'Zid otpozadi', left: 'Zid sleva', right: 'Zid zdesna' }

function OrderTable({ title, layout }) {
  return (
    <div className="avoid-break">
      <p className="border-b border-stone-900 pb-1 text-xs font-semibold text-stone-950">
        {title}: {layout.name}
      </p>
      <table className="mt-1 w-full text-[11px] tabular-nums">
        <tbody>
          {layout.order.map((row) => (
            <tr key={row.length} className="border-b border-stone-200">
              <td className="py-0.5">dužina {m(row.length)} m</td>
              <td className="py-0.5 text-right">
                {row.count} {plural(row.count, layout.unit === 'traka' ? ['traka', 'trake', 'traka'] : ['tabla', 'table', 'tabli'])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[10px] text-stone-600 tabular-nums">
        Ukupno {layout.count}, korisna širina {m(layout.width)} m. Poručeno {m(layout.ordered, 1)} m², pokriva {m(layout.net, 1)} m², otpad{' '}
        {m(layout.waste, 1)} m² ({layout.wastePct}%).
      </p>
    </div>
  )
}

// Zid gledan spolja: table su numerisane sleva, žuto je poručena tabla, a debela linija ivica zida.
function WallLayout({ wall, width }) {
  const scale = 26
  const pad = 30
  const top = Math.max(...wall.strips.map((strip) => strip.top))
  const w = wall.span * scale + pad * 2
  const h = top * scale + pad + 14
  const base = top * scale + pad
  const X = (u) => pad + (wall.span / 2 - u) * scale
  const Y = (up) => base - up * scale
  const outline = Array.from({ length: 25 }, (_, index) => -wall.span / 2 + (wall.span * index) / 24).map((u) => `${X(u).toFixed(1)},${Y(wall.heightAt(u)).toFixed(1)}`)
  return (
    <figure className="avoid-break">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label={`${WALL_NAMES[wall.id]}, raspored tabli`}>
        {wall.strips.map((strip, index) => (
          <g key={index}>
            {strip.pieces.map(([low], piece) => (
              <rect
                key={piece}
                x={X(strip.u0 + width)}
                y={Y(low + strip.cuts[piece])}
                width={width * scale}
                height={strip.cuts[piece] * scale}
                fill="#fdf1c7"
                stroke="#6d767f"
                strokeWidth="0.5"
              />
            ))}
            <text x={X((strip.u0 + strip.u1) / 2)} y={base + 9} textAnchor="middle" fontSize="6.5" fill="#1f252a">
              {wall.strips.length - index}
            </text>
          </g>
        ))}
        {wall.openings.map((opening, index) => (
          <rect
            key={index}
            x={X(opening.along + opening.width / 2)}
            y={Y(opening.sill + opening.height)}
            width={opening.width * scale}
            height={opening.height * scale}
            fill="#ffffff"
            stroke="#1f252a"
            strokeWidth="0.8"
            strokeDasharray="3 2"
          />
        ))}
        <polygon points={`${X(wall.span / 2)},${base} ${outline.reverse().join(' ')} ${X(-wall.span / 2)},${base}`} fill="none" stroke="#1f252a" strokeWidth="1.2" />
      </svg>
      <figcaption className="text-[10px] text-stone-600 tabular-nums">
        {WALL_NAMES[wall.id]}, {m(wall.span)} m: {wall.strips.length} u nizu, {wall.count} komada
      </figcaption>
    </figure>
  )
}

export function PanelSheet({ scene }) {
  const walls = useMemo(() => wallSheets(scene), [scene])
  const roof = useMemo(() => roofSheets(scene), [scene])
  const units = scene.units || 1
  return (
    <div className="space-y-4">
      {walls ? (
        <>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {walls.parts.map((wall) => (
              <WallLayout key={wall.id} wall={wall} width={walls.width} />
            ))}
          </div>
          <OrderTable title="Zidovi" layout={walls} />
        </>
      ) : (
        <p className="text-xs text-stone-600">Zidna obloga nije u tablama, već u letvicama ili pločama, pa se poručuje po površini iz predmera.</p>
      )}
      {roof ? (
        <>
          <OrderTable title="Krov" layout={roof} />
          <ul className="text-[10px] text-stone-600 tabular-nums">
            {roof.parts.map((slope) => (
              <li key={slope.label}>
                {slope.label}: {slope.across} u nizu duž strehe od {m(slope.alongCover)} m{slope.rows > 1 ? `, u ${slope.rows} reda sa preklopom 20 cm` : ''}, dužina {m(slope.length)} m
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-xs text-stone-600">Krov je pod membranom, koja se poručuje po površini iz predmera.</p>
      )}
      <p className="text-[10px] leading-relaxed text-stone-500">
        Table se poručuju sečene na dužinu, pa je otpad ono što se odseče na mestu: otvori, kosina uz krov i višak širine poslednje table. Žuto
        polje je poručena tabla, isprekidano je otvor. Tabla koja cela pada u otvor poručuje se samo kao komad iznad ili ispod njega. Preklop
        po širini je već u korisnoj širini table.{units > 1 ? ` Raspored važi za jednu od ${units} jedinica u nizu; zid između jedinica oblaže se jednom.` : ''} Pre
        poručivanja premeri izveden skelet.
      </p>
    </div>
  )
}
