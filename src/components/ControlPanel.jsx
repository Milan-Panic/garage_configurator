import { useState } from 'react'
import {
  AlertTriangle,
  AppWindow,
  CarFront,
  Check,
  ClipboardCopy,
  Copy,
  DoorClosed,
  DoorOpen,
  FolderOpen,
  Home,
  FileText,
  Layers,
  MapPin,
  PackagePlus,
  Palette,
  Plus,
  Redo2,
  RotateCw,
  Ruler,
  Save,
  ScrollText,
  Send,
  Sofa,
  Sparkles,
  Store,
  Trash2,
  Undo2,
  Wind,
  Zap,
} from 'lucide-react'
import { BUILDING_TYPES, CANOPY_FREE_AREA, CANOPY_LIMITS, CHARGER_OPTIONS, ELECTRIC_LIMITS, UNIT_LIMITS, VENTILATION_OPTIONS, buildingType, canopySpan } from '../buildings'
import { ALTITUDE_LIMITS, DEFAULT_SITE, PLACES, WIND_OPTIONS, snowLoad } from '../site'
import { DEFAULT_SKYLIGHTS, SKYLIGHT_KINDS, SKYLIGHT_LIMITS } from '../skylights'
import { DIMENSION_LIMITS, LIGHT_STRUCTURE, formatMeters } from '../config'
import { hingeCount } from '../estimate'
import {
  DOOR_MATERIALS,
  DOOR_STYLES,
  FLOOR_FINISHES,
  FRAME_COLORS,
  INSULATION_OPTIONS,
  RAL_COLORS,
  ROOF_MATERIALS,
  WALL_MATERIALS,
  doorMaterialsFor,
  findMaterial,
  tinted,
} from '../materials'
import { navigate } from '../nav'
import { packageOffers } from '../partners'
import { formatDin, quoteItems } from '../prices'
import { formatSavedAt } from '../projects'
import { PITCH_LIMITS, ROOF_FALLS, ROOF_KINDS, ROOF_RIDGES, roofGeometry } from '../roof'
import { MAX_ROOMS, ROOM_CORNERS, ROOM_KINDS, roomKind, roomLimits } from '../rooms'
import {
  CAR_COLORS,
  CAR_PRESETS,
  FURNITURE_GROUPS,
  FURNITURE_TYPES,
  WINDOW_TYPES,
  WALL_IDS,
  carSliderLimits,
  doorSliderLimits,
  furnitureGroup,
  furnitureSliderLimits,
  pedestrianSliderLimits,
  wallFrame,
  windowSliderLimits,
} from '../layout'
import { skillName } from '../pages/craftsmen'
import { PatternSwatch } from './PatternSwatch'

const TABS = [
  { id: 'shape', label: 'Objekat', icon: Home },
  { id: 'facade', label: 'Fasada', icon: Palette },
  { id: 'openings', label: 'Otvori', icon: DoorOpen },
  { id: 'interior', label: 'Unutra', icon: Sofa },
  { id: 'extras', label: 'Dodaci', icon: PackagePlus },
  { id: 'estimate', label: 'Računica', icon: ScrollText },
  { id: 'projects', label: 'Projekti', icon: FolderOpen },
]

const STYLE_PRESETS = [
  {
    id: 'klasik',
    name: 'Klasik',
    detail: 'Antracit trapez',
    wall: 'trapez-t18-antracit',
    roof: 'krov-trapez-antracit',
    doors: { panel: 'sekcijska-antracit', roller: 'rolo-antracit', swing: 'krilna-lim' },
  },
  {
    id: 'moderna',
    name: 'Moderna',
    detail: 'Fasadni panel, falc',
    wall: 'fasadni-panel-grafit',
    wallColor: '9005',
    roof: 'falc-antracit',
    roofPatch: { kind: 'mono', pitch: 6 },
    doors: { panel: 'sekcijska-glatka-crna', roller: 'rolo-antracit', swing: 'krilna-lim' },
  },
  {
    id: 'dekor',
    name: 'Dekor drvo',
    detail: 'Lim sa dekorom hrasta',
    wall: 'trapez-drvo-hrast',
    roof: 'limeni-crep-antracit',
    roofPatch: { kind: 'duo', pitch: 20 },
    doors: { panel: 'sekcijska-hrast', roller: 'rolo-hrast', swing: 'krilna-lim' },
  },
  {
    id: 'seoska',
    name: 'Seoska',
    detail: 'Bela i limeni crep',
    wall: 'trapez-t18-bela',
    roof: 'limeni-crep-crveni',
    roofPatch: { kind: 'duo', pitch: 22 },
    doors: { panel: 'sekcijska-bela', roller: 'rolo-bela', swing: 'krilna-lim' },
  },
  {
    id: 'topla',
    name: 'Topla',
    detail: 'Sendvič paneli',
    wall: 'sendvic-antracit',
    roof: 'krovni-sendvic',
    roofPatch: { kind: 'mono', pitch: 6 },
    doors: { panel: 'sekcijska-antracit', roller: 'rolo-antracit', swing: 'krilna-lim' },
  },
  {
    id: 'industrija',
    name: 'Industrija',
    detail: 'Sinusni lim',
    wall: 'sinus-lim',
    roof: 'krov-trapez-antracit',
    roofPatch: { kind: 'mono', pitch: 8 },
    doors: { panel: 'sekcijska-rebro-srebro', roller: 'rolo-srebro', swing: 'krilna-lim' },
  },
]

function stylePresetDoor(preset, style) {
  if (style === 'roller') return preset.doors.roller
  if (style === 'single' || style === 'double') return preset.doors.swing
  return preset.doors.panel
}

export function ControlPanel(props) {
  const {
    estimate,
    total,
    selected,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    projectName,
    activeProjectId,
    projectDirty,
    saveError,
    saveNotice,
    onProjectNameChange,
    onSaveProject,
  } = props
  const [tab, setTab] = useState('shape')
  // Kad se u 3D izabere predmet, otvori tab u kome se on podešava.
  const selectionKey = selected ? `${selected.kind}:${selected.id ?? ''}` : ''
  const [seenSelection, setSeenSelection] = useState(selectionKey)
  if (selectionKey !== seenSelection) {
    setSeenSelection(selectionKey)
    const kind = selected?.kind
    if (kind === 'window' || kind === 'pedestrian') setTab('openings')
    else if (kind === 'furniture' || kind === 'car' || kind === 'room') setTab('interior')
  }

  const status = saveError
    ? { tone: 'bg-red-500', text: saveError }
    : saveNotice
      ? { tone: 'bg-emerald-500', text: saveNotice }
      : !activeProjectId
        ? { tone: 'bg-stone-300', text: projectDirty ? 'Nije sačuvano' : 'Nov projekat' }
        : projectDirty
          ? { tone: 'bg-amber-400', text: 'Čuvam…' }
          : { tone: 'bg-emerald-500', text: 'Sačuvano' }

  return (
    <aside className="flex max-h-[56dvh] min-h-0 w-full shrink-0 flex-col border-b border-stone-200 bg-[var(--panel)] md:max-h-none md:w-[400px] md:border-r md:border-b-0">
      <header className="space-y-3 border-b border-stone-200 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <input
              value={projectName}
              placeholder="Moj objekat"
              aria-label="Naziv objekta"
              maxLength={60}
              onChange={(event) => onProjectNameChange(event.target.value)}
              className="w-full truncate rounded-md border border-transparent bg-transparent px-1.5 py-1 text-lg font-semibold text-stone-950 outline-none placeholder:text-stone-400 hover:border-stone-200 focus:border-stone-300 focus:bg-white"
            />
            <p className="flex items-center gap-1.5 px-1.5 text-xs text-stone-500" role="status">
              <span className={`size-1.5 rounded-full ${status.tone}`} />
              <span className="truncate">{status.text}</span>
            </p>
          </div>
          <IconButton label="Poništi (Ctrl+Z)" disabled={!canUndo} onClick={onUndo} icon={Undo2} />
          <IconButton label="Ponovi (Ctrl+Y)" disabled={!canRedo} onClick={onRedo} icon={Redo2} />
          <button
            type="button"
            onClick={onSaveProject}
            className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
          >
            <Save size={15} />
            Sačuvaj
          </button>
        </div>
        <nav className="grid grid-cols-7 gap-1 rounded-xl bg-stone-100 p-1" aria-label="Delovi konfiguratora">
          {TABS.map((entry) => {
            const Icon = entry.icon
            const active = tab === entry.id
            const alert = entry.id === 'estimate' && estimate.warnings.length > 0
            return (
              <button
                key={entry.id}
                type="button"
                aria-pressed={active}
                onClick={() => setTab(entry.id)}
                className={`relative flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-medium transition ${
                  active ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Icon size={16} />
                {entry.label}
                {alert && <span className="absolute top-1 right-2 size-1.5 rounded-full bg-amber-500" />}
              </button>
            )
          })}
        </nav>
      </header>

      <div key={tab} className="relative flex-1 overflow-y-auto px-4 py-4">
        {tab === 'shape' && <ShapeTab {...props} />}
        {tab === 'facade' && <FacadeTab {...props} />}
        {tab === 'openings' && <OpeningsTab {...props} />}
        {tab === 'interior' && <InteriorTab {...props} />}
        {tab === 'extras' && <ExtrasTab {...props} />}
        {tab === 'estimate' && <EstimateTab {...props} />}
        {tab === 'projects' && <ProjectsTab {...props} />}
      </div>

      <footer className="flex items-center gap-3 border-t border-stone-200 bg-white px-4 py-3">
        <button type="button" onClick={() => setTab('estimate')} className="min-w-0 flex-1 text-left">
          <span className="block text-[11px] tracking-wide text-stone-500 uppercase">Orijentaciono</span>
          <span className="block truncate text-lg font-semibold text-stone-950 tabular-nums">{formatDin(total)}</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/majstori')}
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
        >
          <Send size={15} />
          Pošalji upit
        </button>
      </footer>
    </aside>
  )
}

/* ---------- Objekat ---------- */

function ShapeTab({ scene, estimate, onDimensionChange, onSceneChange, onRoofChange, onPartChange, onSettle }) {
  const { dimensions, roof } = scene
  const site = scene.site || DEFAULT_SITE
  const skylights = scene.skylights || DEFAULT_SKYLIGHTS
  const units = scene.units || 1
  const roofShape = roofGeometry(dimensions, roof)
  const footprint = dimensions.width * dimensions.length
  const { sizes } = buildingType(scene.buildingType)
  const oversized = Object.entries(LIGHT_STRUCTURE).some(([key, limit]) => dimensions[key] > limit)

  function applySize(size) {
    Object.entries(size.dimensions).forEach(([key, value]) => onDimensionChange(key, value))
    onSettle()
  }

  function chooseType(type) {
    onSceneChange({
      buildingType: type.id,
      electric: type.electric ? { ...scene.electric, ...type.electric } : scene.electric,
      insulation: type.insulation ?? scene.insulation,
    })
    applySize(type.sizes[0])
  }

  return (
    <div className="space-y-6">
      <Section icon={Sparkles} title="Šta praviš">
        <div className="grid grid-cols-2 gap-2">
          {BUILDING_TYPES.map((type) => {
            const active = scene.buildingType === type.id
            return (
              <button
                key={type.id}
                type="button"
                aria-pressed={active}
                onClick={() => chooseType(type)}
                className={`rounded-lg border px-3 py-2 text-left transition ${
                  active ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white hover:border-stone-400'
                }`}
              >
                <span className="block text-sm font-medium">{type.name}</span>
                <span className={`block text-xs ${active ? 'text-stone-300' : 'text-stone-500'}`}>{type.detail}</span>
              </button>
            )
          })}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {sizes.map((size) => {
            const active = Object.entries(size.dimensions).every(([key, value]) => dimensions[key] === value)
            return (
              <button
                key={size.id}
                type="button"
                aria-pressed={active}
                onClick={() => applySize(size)}
                className={`rounded-lg border px-2 py-1.5 text-left transition ${
                  active ? 'border-orange-500 bg-orange-50' : 'border-stone-200 bg-white hover:border-stone-400'
                }`}
              >
                <span className="block truncate text-xs font-medium text-stone-900">{size.name}</span>
                <span className="block text-[10px] text-stone-500">{fmtSize(size.dimensions.width, size.dimensions.length)} m</span>
              </button>
            )
          })}
        </div>
      </Section>

      <Section icon={Ruler} title="Dimenzije">
        {['width', 'length', 'height'].map((key) => {
          const limit = DIMENSION_LIMITS[key]
          return (
            <Slider
              key={key}
              label={limit.label}
              value={dimensions[key]}
              min={limit.min}
              max={limit.max}
              step={limit.step}
              onChange={(value) => onDimensionChange(key, value)}
              onSettle={onSettle}
              showRange
            />
          )
        })}
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Površina" value={`${(footprint * units).toFixed(1).replace('.', ',')} m²`} />
          <Stat label={roof.kind === 'flat' ? 'Visina' : 'Do slemena'} value={formatMeters(dimensions.height + roofShape.rise)} />
        </div>
        {oversized && (
          <p className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-200">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
            Za ove mere statičar treba da odredi konstrukciju.
          </p>
        )}
        <Slider
          label="Objekata u nizu"
          value={units}
          {...UNIT_LIMITS}
          formatValue={(value) => (value > 1 ? `${value} jedinice` : 'Jedan objekat')}
          onChange={(next) => onPartChange('units', { units: next })}
          onSettle={onSettle}
        />
        {units > 1 && <Hint>Iste jedinice se ređaju bok uz bok, kao garaže u nizu. Mere iznad važe za jednu jedinicu.</Hint>}
      </Section>

      <Section icon={MapPin} title="Lokacija">
        <label className="block">
          <span className="mb-1.5 block text-sm text-stone-700">Mesto</span>
          <select
            value={site.place}
            onChange={(event) => {
              const place = PLACES.find((entry) => entry.id === event.target.value)
              onSceneChange({ site: { ...site, place: place ? place.id : 'custom', altitude: place ? place.altitude : site.altitude } })
            }}
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900"
          >
            {PLACES.map((place) => (
              <option key={place.id} value={place.id}>
                {place.name} · {place.altitude} m
              </option>
            ))}
            <option value="custom">Druga lokacija</option>
          </select>
        </label>
        <Slider
          label="Nadmorska visina"
          value={site.altitude}
          {...ALTITUDE_LIMITS}
          formatValue={(value) => `${value} m`}
          onChange={(altitude) => onPartChange('site', { altitude, place: PLACES.find((entry) => entry.id === site.place)?.altitude === altitude ? site.place : 'custom' })}
          onSettle={onSettle}
        />
        <Segmented label="Vetar" value={site.wind} options={WIND_OPTIONS} onChange={(wind) => onSceneChange({ site: { ...site, wind } })} columns={3} />
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Sneg na krovu" value={`${String(snowLoad(site)).replace('.', ',')} kN/m²`} />
          <Stat label={estimate.sizing.truss ? 'Pojas rešetke' : 'Krovni nosač'} value={`${Math.round((estimate.sizing.truss ? estimate.sizing.chord.use : estimate.sizing.rafter.use) * 100)}% iskorišćen`} />
        </div>
        <Hint>
          Presek nosača prati sneg i raspon: {estimate.profiles.rafter.name} preko {estimate.sizing.span.toFixed(2).replace('.', ',')} m. Vrednosti su okvirne; merodavan je proračun statičara po
          SRPS EN 1991.
        </Hint>
      </Section>

      <Section icon={Layers} title="Krov">
        <div className="grid grid-cols-3 gap-2">
          {ROOF_KINDS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={roof.kind === entry.id}
              onClick={() => onRoofChange({ kind: entry.id })}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition ${
                roof.kind === entry.id ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-800 hover:border-stone-400'
              }`}
            >
              <RoofIcon kind={entry.id} />
              {entry.name}
            </button>
          ))}
        </div>
        {roof.kind !== 'flat' && (
          <Slider
            label="Nagib"
            value={roof.pitch}
            min={PITCH_LIMITS.min}
            max={PITCH_LIMITS.max}
            step={PITCH_LIMITS.step}
            formatValue={(value) => `${value}°`}
            onChange={(pitch) => onRoofChange({ pitch })}
            onSettle={onSettle}
          />
        )}
        {roof.kind === 'mono' && (
          <Segmented label="Pad prema" value={roof.fall} options={ROOF_FALLS} onChange={(fall) => onRoofChange({ fall })} />
        )}
        {roof.kind === 'duo' && (
          <Segmented label="Slemen" value={roof.ridge} options={ROOF_RIDGES} onChange={(ridge) => onRoofChange({ ridge })} />
        )}
        <Toggle
          label="Rešetkasti nosač"
          detail="Za veće raspone: lakši i jači od pune kutije, stoji na 2 m."
          checked={Boolean(roof.truss)}
          onChange={(truss) => onRoofChange({ truss })}
        />
        {!estimate.sizing.ok && !roof.truss && (
          <p className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-200">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
            Raspon je prevelik za kutijasti nosač. Uključi rešetku.
          </p>
        )}
        <Segmented label="Krovni prozori" value={skylights.kind} options={SKYLIGHT_KINDS} onChange={(kind) => onSceneChange({ skylights: { ...skylights, kind } })} />
        <Slider
          label="Broj krovnih prozora"
          value={skylights.count}
          {...SKYLIGHT_LIMITS}
          formatValue={(value) => (value > 0 ? String(value) : 'Bez')}
          onChange={(count) => onPartChange('skylights', { count })}
          onSettle={onSettle}
        />
        <Toggle
          label="Oluk na strehi"
          detail="Upit limaru za oluk ide posebno."
          checked={scene.gutters !== false}
          onChange={(gutters) => onSceneChange({ gutters })}
        />
        {roof.kind !== 'flat' && <Hint>Visina je do niže strehe. Slemen i viši zid idu iznad toga, po nagibu.</Hint>}
      </Section>
    </div>
  )
}

function RoofIcon({ kind }) {
  const stroke = 'currentColor'
  return (
    <svg viewBox="0 0 40 24" className="h-5 w-9" aria-hidden="true">
      <rect x="6" y="12" width="28" height="10" fill="none" stroke={stroke} strokeWidth="1.6" />
      {kind === 'flat' && <line x1="3" y1="12" x2="37" y2="12" stroke={stroke} strokeWidth="2.4" />}
      {kind === 'mono' && <line x1="3" y1="12" x2="37" y2="5" stroke={stroke} strokeWidth="2.4" />}
      {kind === 'duo' && <polyline points="3,13 20,3 37,13" fill="none" stroke={stroke} strokeWidth="2.4" />}
    </svg>
  )
}

/* ---------- Fasada ---------- */

function FacadeTab({ scene, onSceneChange, onRoofChange }) {
  const wall = findMaterial(WALL_MATERIALS, scene.wallMaterialId)
  const roofSpec = findMaterial(ROOF_MATERIALS, scene.roofMaterialId)
  return (
    <div className="space-y-6">
      <Section icon={Sparkles} title="Stilski paketi">
        <div className="grid grid-cols-3 gap-2">
          {STYLE_PRESETS.map((preset) => {
            const active =
              preset.wall === scene.wallMaterialId && preset.roof === scene.roofMaterialId && (preset.wallColor ?? null) === scene.wallColor
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  const doorId = stylePresetDoor(preset, scene.door.style)
                  const doorSpec = DOOR_MATERIALS.find((entry) => entry.id === doorId)
                  const keepDoor = scene.door.style === 'none' || !doorSpec?.styles.includes(scene.door.style)
                  onSceneChange({
                    wallMaterialId: preset.wall,
                    wallColor: preset.wallColor ?? null,
                    roofMaterialId: preset.roof,
                    roofColor: null,
                    ...(keepDoor ? {} : { doorMaterialId: doorId, doorColor: null }),
                    roof: { ...scene.roof, ...(preset.roofPatch ?? {}) },
                  })
                }}
                className={`overflow-hidden rounded-lg border text-left transition ${
                  active ? 'border-stone-900 ring-2 ring-stone-900/15' : 'border-stone-200 hover:border-stone-400'
                }`}
              >
                <span className="flex h-10">
                  <PatternSwatch
                    spec={tinted(findMaterial(WALL_MATERIALS, preset.wall), preset.wallColor)}
                    width={120}
                    height={80}
                    className="h-full w-2/3"
                  />
                  <PatternSwatch spec={findMaterial(ROOF_MATERIALS, preset.roof)} width={60} height={80} className="h-full w-1/3" />
                </span>
                <span className="block bg-white px-2 py-1.5">
                  <span className="block text-xs font-semibold text-stone-900">{preset.name}</span>
                  <span className="block truncate text-[10px] text-stone-500">{preset.detail}</span>
                </span>
              </button>
            )
          })}
        </div>
        <Hint>Paket menja zidove, krov i vrata. Posle možeš da promeniš svaki deo posebno.</Hint>
      </Section>

      <Section icon={Palette} title="Zidovi">
        <MaterialGrid
          options={WALL_MATERIALS}
          value={scene.wallMaterialId}
          color={scene.wallColor}
          onChange={(wallMaterialId) => onSceneChange({ wallMaterialId, wallColor: null })}
        />
        {wall.tintable && (
          <ColorRow label="Boja zidova" value={scene.wallColor} base={wall} onChange={(wallColor) => onSceneChange({ wallColor })} />
        )}
      </Section>

      <Section icon={Layers} title="Krovni pokrivač">
        <MaterialGrid
          options={ROOF_MATERIALS}
          value={scene.roofMaterialId}
          color={scene.roofColor}
          onChange={(roofMaterialId) => {
            const next = findMaterial(ROOF_MATERIALS, roofMaterialId).cover
            onSceneChange({ roofMaterialId, roofColor: null })
            if (next?.minPitch && scene.roof.kind !== 'flat' && scene.roof.pitch < next.minPitch) onRoofChange({ pitch: next.minPitch })
          }}
        />
        {roofSpec.tintable && (
          <ColorRow label="Boja krova" value={scene.roofColor} base={roofSpec} onChange={(roofColor) => onSceneChange({ roofColor })} />
        )}
        {roofSpec.cover?.minPitch && <Hint>Ovaj pokrivač traži nagib od bar {roofSpec.cover.minPitch}°.</Hint>}
      </Section>
    </div>
  )
}

function MaterialGrid({ options, value, color, onChange }) {
  const groups = []
  options.forEach((item) => {
    const last = groups[groups.length - 1]
    if (!last || last.label !== item.group) groups.push({ label: item.group, items: [item] })
    else last.items.push(item)
  })
  const selected = options.find((item) => item.id === value) ?? options[0]
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 text-[11px] font-medium tracking-wide text-stone-400 uppercase">{group.label}</p>
          <div className="grid grid-cols-4 gap-1.5">
            {group.items.map((item) => {
              const active = item.id === selected.id
              return (
                <button
                  key={item.id}
                  type="button"
                  title={`${item.name} · ${item.detail}`}
                  aria-label={item.name}
                  aria-pressed={active}
                  onClick={() => onChange(item.id)}
                  className={`relative overflow-hidden rounded-lg border-2 transition ${
                    active ? 'border-orange-500' : 'border-transparent hover:border-stone-300'
                  }`}
                >
                  <PatternSwatch spec={active ? tinted(item, color) : item} width={96} height={72} className="block aspect-[4/3] w-full" />
                  {active && (
                    <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-orange-500 text-white">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-stone-200">
        <p className="text-sm font-medium text-stone-900">{selected.name}</p>
        <p className="text-xs text-stone-500">{selected.detail}</p>
      </div>
    </div>
  )
}

function ColorRow({ label, value, base, onChange }) {
  const current = RAL_COLORS.find((entry) => entry.id === value)
  return (
    <div className="space-y-1.5">
      <p className="flex items-center justify-between text-sm">
        <span className="font-medium text-stone-800">{label}</span>
        <span className="text-xs text-stone-500">{current ? `RAL ${current.id} · ${current.name}` : 'Fabrička boja'}</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          title="Fabrička boja"
          aria-label="Fabrička boja"
          aria-pressed={!value}
          onClick={() => onChange(null)}
          className={`size-7 rounded-full border-2 ${!value ? 'border-orange-500' : 'border-white ring-1 ring-stone-300'}`}
          style={{ background: base.color }}
        />
        {RAL_COLORS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            title={`RAL ${entry.id} · ${entry.name}`}
            aria-label={`RAL ${entry.id} ${entry.name}`}
            aria-pressed={value === entry.id}
            onClick={() => onChange(entry.id)}
            className={`size-7 rounded-full border-2 transition ${value === entry.id ? 'scale-110 border-orange-500' : 'border-white ring-1 ring-stone-300'}`}
            style={{ background: entry.hex }}
          />
        ))}
      </div>
    </div>
  )
}

/* ---------- Otvori ---------- */

function OpeningsTab({
  scene,
  selected,
  onDoorChange,
  onSceneChange,
  onSettle,
  onSelect,
  onAddWindow,
  onCopyWindow,
  onChangeWindow,
  onAddPedestrian,
  onChangePedestrian,
  onRemove,
}) {
  const { dimensions, door, windows } = scene
  const pedestrianDoors = scene.pedestrianDoors || []
  const doorOptions = doorMaterialsFor(door.style === 'none' ? 'sectional' : door.style)
  const doorSpec = findMaterial(DOOR_MATERIALS, scene.doorMaterialId)
  const selectedWindow = windows.find((item) => selected?.kind === 'window' && item.id === selected.id)
  const selectedPedestrian = pedestrianDoors.find((item) => selected?.kind === 'pedestrian' && item.id === selected.id)
  const limits = doorSliderLimits(door, dimensions)
  const wallOptions = WALL_IDS.map((id) => ({ id, name: wallFrame(id, dimensions).label.replace(' zid', '') }))

  return (
    <div className="space-y-6">
      <Section icon={DoorOpen} title="Glavna vrata">
        <div className="grid grid-cols-3 gap-1.5">
          {DOOR_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              title={style.detail}
              aria-pressed={door.style === style.id}
              onClick={() => onDoorChange({ style: style.id })}
              className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                door.style === style.id ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-800 hover:border-stone-400'
              }`}
            >
              {style.name}
            </button>
          ))}
        </div>
        {door.style !== 'none' && (
          <>
            <MaterialGrid
              options={doorOptions}
              value={doorOptions.some((item) => item.id === scene.doorMaterialId) ? scene.doorMaterialId : doorOptions[0].id}
              color={scene.doorColor}
              onChange={(doorMaterialId) => onSceneChange({ doorMaterialId, doorColor: null })}
            />
            {doorSpec.tintable && (
              <ColorRow label="Boja vrata" value={scene.doorColor} base={doorSpec} onChange={(doorColor) => onSceneChange({ doorColor })} />
            )}
            <Segmented label="Zid" value={door.wall} options={wallOptions} onChange={(wall) => onDoorChange({ wall })} />
            <Slider label="Širina" value={door.width} {...limits.width} onChange={(width) => onDoorChange({ width })} onSettle={onSettle} />
            <Slider label="Visina" value={door.height} {...limits.height} onChange={(height) => onDoorChange({ height })} onSettle={onSettle} />
            <Slider label="Položaj na zidu" value={door.along} {...limits.along} onChange={(along) => onDoorChange({ along })} onSettle={onSettle} />
            <Slider
              label="Otvorenost"
              value={door.open}
              min={0}
              max={1}
              step={0.01}
              formatValue={(value) => `${Math.round(value * 100)}%`}
              onChange={(open) => onDoorChange({ open })}
              onSettle={onSettle}
            />
            <Toggle
              label="Motor i daljinski"
              detail="Dodaje motor u računicu i šinu pod plafonom."
              checked={Boolean(door.motor)}
              onChange={(motor) => onDoorChange({ motor })}
            />
            {(door.style === 'single' || door.style === 'double') && (
              <Toggle label="Pešačka vrata na krilu" checked={Boolean(door.wicket)} onChange={(wicket) => onDoorChange({ wicket })} />
            )}
            <Hint>{doorHint(door)}</Hint>
          </>
        )}
      </Section>

      <Section icon={AppWindow} title="Prozori">
        <div className="grid grid-cols-3 gap-1.5">
          {WINDOW_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              aria-label={type.addLabel}
              onClick={() => onAddWindow(type.id)}
              className="group rounded-lg border border-stone-200 bg-white px-2 py-2 text-left transition hover:border-stone-400"
            >
              <span className="flex items-center gap-1 text-xs font-medium text-stone-900">
                <Plus size={12} className="text-orange-500" />
                {type.name}
              </span>
              <span className="block text-[10px] text-stone-500">{type.detail}</span>
            </button>
          ))}
        </div>
        <ItemList
          items={windows}
          selectedId={selectedWindow?.id}
          onSelect={(id) => onSelect({ kind: 'window', id })}
          onRemove={(id) => onRemove({ kind: 'window', id })}
          labelFor={(item) => {
            const type = WINDOW_TYPES.find((entry) => entry.id === item.type)
            return `${type?.name ?? 'Prozor'} ${fmtSize(item.width, item.height)} · ${wallFrame(item.wall, dimensions).label}`
          }}
        />
        {selectedWindow && (
          <Editor>
            <Segmented label="Zid" value={selectedWindow.wall} options={wallOptions} onChange={(wall) => onChangeWindow(selectedWindow.id, { wall })} />
            <Segmented
              label="Tip"
              value={selectedWindow.type}
              options={WINDOW_TYPES.map((type) => ({ id: type.id, name: type.name }))}
              onChange={(type) => onChangeWindow(selectedWindow.id, { type })}
              columns={3}
            />
            {selectedWindow.type !== 'glassblock' && (
              <div className="space-y-1.5">
                <span className="text-sm font-medium text-stone-800">Okvir</span>
                <div className="flex gap-1.5">
                  {FRAME_COLORS.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      title={entry.name}
                      aria-label={entry.name}
                      aria-pressed={selectedWindow.frame === entry.id}
                      onClick={() => onChangeWindow(selectedWindow.id, { frame: entry.id })}
                      className={`flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1 text-[11px] ${
                        selectedWindow.frame === entry.id ? 'border-orange-500 bg-orange-50 text-stone-900' : 'border-stone-200 bg-white text-stone-600'
                      }`}
                    >
                      <span className="size-4 rounded-full ring-1 ring-black/10" style={{ background: entry.hex }} />
                      {entry.name.replace('PVC ', '')}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <WindowSliders item={selectedWindow} dimensions={dimensions} onChange={(patch) => onChangeWindow(selectedWindow.id, patch)} onSettle={onSettle} />
            <Toggle label="Zaštitna rešetka" checked={Boolean(selectedWindow.bars)} onChange={(bars) => onChangeWindow(selectedWindow.id, { bars })} />
            <div className="grid grid-cols-2 gap-2">
              <SoftButton icon={Copy} label="Kopiraj" onClick={() => onCopyWindow(selectedWindow.id)} />
              <SoftButton icon={Trash2} label="Ukloni" onClick={() => onRemove({ kind: 'window', id: selectedWindow.id })} />
            </div>
          </Editor>
        )}
        <Hint>Klikni prozor u prikazu i prevuci ga po zidu. Ctrl+D pravi kopiju, Delete ga briše.</Hint>
      </Section>

      <Section icon={DoorOpen} title="Bočna pešačka vrata">
        <button
          type="button"
          onClick={onAddPedestrian}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 transition hover:border-stone-500"
        >
          <Plus size={14} className="text-orange-500" />
          Dodaj bočna vrata
        </button>
        <ItemList
          items={pedestrianDoors}
          selectedId={selectedPedestrian?.id}
          onSelect={(id) => onSelect({ kind: 'pedestrian', id })}
          onRemove={(id) => onRemove({ kind: 'pedestrian', id })}
          labelFor={(item) => `Vrata ${fmtSize(item.width, item.height)} · ${wallFrame(item.wall, dimensions).label}`}
        />
        {selectedPedestrian && (
          <Editor>
            <Segmented label="Zid" value={selectedPedestrian.wall} options={wallOptions} onChange={(wall) => onChangePedestrian(selectedPedestrian.id, { wall })} />
            <PedestrianSliders
              item={selectedPedestrian}
              dimensions={dimensions}
              onChange={(patch) => onChangePedestrian(selectedPedestrian.id, patch)}
              onSettle={onSettle}
            />
            <Toggle label="Sa staklom" checked={Boolean(selectedPedestrian.glass)} onChange={(glass) => onChangePedestrian(selectedPedestrian.id, { glass })} />
            <SoftButton icon={Trash2} label="Ukloni" onClick={() => onRemove({ kind: 'pedestrian', id: selectedPedestrian.id })} />
          </Editor>
        )}
      </Section>
    </div>
  )
}

function doorHint(door) {
  if (door.style === 'roller') return 'Rolo plašt silazi odozgo kroz vođice. Kutija traži oko 30 cm iznad otvora.'
  if (door.style === 'sectional') return 'Paneli klize uz vođice pod plafon. Iznad otvora treba bar 20 cm za oprugu.'
  if (door.style === 'tilt') return 'Kipno krilo se diže i ulazi pod plafon. Trećina krila pri otvaranju izlazi napolje.'
  return `Krilo više od 2 m dobija 3 šarke, do 2 m dobija 2. Na ovoj visini svako krilo nosi ${hingeCount(door.height)} šarke.`
}

function WindowSliders({ item, dimensions, onChange, onSettle }) {
  const limits = windowSliderLimits(item, dimensions)
  return (
    <>
      <Slider label="Položaj na zidu" value={item.along} {...limits.along} onChange={(along) => onChange({ along })} onSettle={onSettle} />
      <Slider label="Visina od poda" value={item.sill} {...limits.sill} onChange={(sill) => onChange({ sill })} onSettle={onSettle} />
      <Slider label="Širina" value={item.width} {...limits.width} onChange={(width) => onChange({ width })} onSettle={onSettle} />
      <Slider label="Visina" value={item.height} {...limits.height} onChange={(height) => onChange({ height })} onSettle={onSettle} />
    </>
  )
}

function PedestrianSliders({ item, dimensions, onChange, onSettle }) {
  const limits = pedestrianSliderLimits(item, dimensions)
  return (
    <>
      <Slider label="Položaj na zidu" value={item.along} {...limits.along} onChange={(along) => onChange({ along })} onSettle={onSettle} />
      <Slider label="Širina" value={item.width} {...limits.width} onChange={(width) => onChange({ width })} onSettle={onSettle} />
      <Slider label="Visina" value={item.height} {...limits.height} onChange={(height) => onChange({ height })} onSettle={onSettle} />
    </>
  )
}

/* ---------- Unutra ---------- */

function InteriorTab({
  scene,
  selected,
  onSceneChange,
  onSettle,
  onSelect,
  onAddFurniture,
  onCopyFurniture,
  onChangeFurniture,
  onAddCar,
  onChangeCar,
  onRemoveCar,
  onAddRoom,
  onChangeRoom,
  onRemove,
}) {
  const { dimensions, furniture, car } = scene
  const rooms = scene.rooms || []
  const selectedFurniture = furniture.find((item) => selected?.kind === 'furniture' && item.id === selected.id)
  const selectedRoom = rooms.find((item) => selected?.kind === 'room' && item.id === selected.id)
  return (
    <div className="space-y-6">
      <Section icon={Layers} title="Pod">
        <div className="grid grid-cols-7 gap-1.5">
          {FLOOR_FINISHES.map((finish) => {
            const active = (scene.floor || 'beton') === finish.id
            return (
              <button
                key={finish.id}
                type="button"
                title={`${finish.name} · ${finish.detail}`}
                aria-label={finish.name}
                aria-pressed={active}
                onClick={() => onSceneChange({ floor: finish.id })}
                className={`overflow-hidden rounded-lg border-2 transition ${active ? 'border-orange-500' : 'border-transparent hover:border-stone-300'}`}
              >
                <PatternSwatch spec={finish} width={72} height={72} className="block aspect-square w-full" />
              </button>
            )
          })}
        </div>
        <p className="text-sm text-stone-700">
          <span className="font-medium">{findMaterial(FLOOR_FINISHES, scene.floor).name}</span>
          <span className="text-stone-500"> · {findMaterial(FLOOR_FINISHES, scene.floor).detail}</span>
        </p>
      </Section>

      <Section icon={Layers} title="Izolacija">
        <div className="grid grid-cols-3 gap-1.5">
          {INSULATION_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={scene.insulation === option.id}
              onClick={() => onSceneChange({ insulation: option.id })}
              className={`rounded-lg border px-2 py-2 text-left transition ${
                scene.insulation === option.id ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-800 hover:border-stone-400'
              }`}
            >
              <span className="block text-xs font-medium">{option.name}</span>
              <span className={`block text-[10px] ${scene.insulation === option.id ? 'text-stone-300' : 'text-stone-500'}`}>{option.detail}</span>
            </button>
          ))}
        </div>
        <Hint>Sendvič paneli su već izolovani, pa se za njih vuna ne računa.</Hint>
      </Section>

      <Section icon={DoorClosed} title="Prostorije">
        <div className="grid grid-cols-2 gap-1.5">
          {ROOM_KINDS.map((kind) => (
            <button
              key={kind.id}
              type="button"
              disabled={rooms.length >= MAX_ROOMS}
              aria-label={`Dodaj prostoriju: ${kind.name}`}
              onClick={() => onAddRoom(kind.id)}
              className="rounded-lg border border-stone-200 bg-white px-2 py-2 text-left transition hover:border-stone-400 disabled:opacity-40 disabled:hover:border-stone-200"
            >
              <span className="flex items-center gap-1 text-xs font-medium text-stone-900">
                <Plus size={12} className="text-orange-500" />
                {kind.name}
              </span>
              <span className="block text-[10px] text-stone-500">{kind.detail}</span>
            </button>
          ))}
        </div>
        <ItemList
          items={rooms}
          selectedId={selectedRoom?.id}
          onSelect={(id) => onSelect({ kind: 'room', id })}
          onRemove={(id) => onRemove({ kind: 'room', id })}
          labelFor={(item) => `${roomKind(item.kind).name} ${fmtSize(item.width, item.depth)} · ${ROOM_CORNERS.find((entry) => entry.id === item.corner)?.name.toLowerCase()}`}
        />
        {selectedRoom && (
          <Editor>
            <Segmented
              label="Namena"
              value={selectedRoom.kind}
              options={ROOM_KINDS}
              onChange={(kind) => onChangeRoom(selectedRoom.id, { kind })}
              columns={2}
            />
            <Segmented label="Ugao" value={selectedRoom.corner} options={ROOM_CORNERS} onChange={(corner) => onChangeRoom(selectedRoom.id, { corner })} columns={2} />
            <Slider label="Širina" value={selectedRoom.width} {...roomLimits(dimensions).width} onChange={(width) => onChangeRoom(selectedRoom.id, { width })} onSettle={onSettle} />
            <Slider label="Dubina" value={selectedRoom.depth} {...roomLimits(dimensions).depth} onChange={(depth) => onChangeRoom(selectedRoom.id, { depth })} onSettle={onSettle} />
            <Toggle
              label="Galerija iznad"
              detail="Pod, ograda i stepenice na plafonu prostorije."
              checked={Boolean(selectedRoom.loft)}
              onChange={(loft) => onChangeRoom(selectedRoom.id, { loft })}
            />
            <Segmented
              label="Vrata gledaju"
              value={selectedRoom.doorSide}
              options={[
                { id: 'depth', name: 'Napred / nazad' },
                { id: 'side', name: 'Levo / desno' },
              ]}
              onChange={(doorSide) => onChangeRoom(selectedRoom.id, { doorSide })}
            />
            <Slider
              label="Položaj vrata"
              value={selectedRoom.doorOffset}
              min={0.15}
              max={0.85}
              step={0.05}
              formatValue={(value) => `${Math.round(value * 100)}%`}
              onChange={(doorOffset) => onChangeRoom(selectedRoom.id, { doorOffset })}
              onSettle={onSettle}
            />
            <SoftButton icon={Trash2} label="Ukloni" onClick={() => onRemove({ kind: 'room', id: selectedRoom.id })} />
          </Editor>
        )}
        <Hint>
          Prostorija stoji u uglu: dva zida su spoljni, dva su pregradni panel. Uključi „Bez krova” iznad prikaza da vidiš raspored. Šolju, lavabo, kotao i sto
          dodaješ iz inventara.
        </Hint>
      </Section>

      <Section icon={Sofa} title="Inventar">
        {FURNITURE_GROUPS.map((group) => (
          <div key={group}>
            <p className="mb-1.5 text-[11px] font-medium tracking-wide text-stone-400 uppercase">{group}</p>
            <div className="flex flex-wrap gap-1.5">
              {FURNITURE_TYPES.filter((type) => furnitureGroup(type.id) === group).map((type) => (
                <button
                  key={type.id}
                  type="button"
                  aria-label={type.addLabel}
                  onClick={() => onAddFurniture(type.id)}
                  className="flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-800 transition hover:border-stone-400"
                >
                  <Plus size={12} className="text-orange-500" />
                  {type.name}
                </button>
              ))}
            </div>
          </div>
        ))}
        <ItemList
          items={furniture}
          selectedId={selectedFurniture?.id}
          onSelect={(id) => onSelect({ kind: 'furniture', id })}
          onRemove={(id) => onRemove({ kind: 'furniture', id })}
          labelFor={(item) => `${FURNITURE_TYPES.find((entry) => entry.id === item.type)?.name ?? 'Predmet'} ${fmtSize(item.width, item.depth)}`}
        />
        {selectedFurniture && (
          <FurnitureEditor
            item={selectedFurniture}
            dimensions={dimensions}
            onChange={(patch) => onChangeFurniture(selectedFurniture.id, patch)}
            onSettle={onSettle}
            onCopy={() => onCopyFurniture(selectedFurniture.id)}
            onRemove={() => onRemove({ kind: 'furniture', id: selectedFurniture.id })}
          />
        )}
        <Hint>Prevuci predmet po podu. Ctrl+D pravi kopiju, Delete ga briše.</Hint>
      </Section>

      <Section icon={CarFront} title="Vozilo">
        <div className="grid grid-cols-3 gap-1.5">
          {CAR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              aria-pressed={car?.kind === preset.id}
              onClick={() => onAddCar(preset.id)}
              className={`rounded-lg border px-1 py-2 text-xs font-medium transition ${
                car?.kind === preset.id ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-800 hover:border-stone-400'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
        {car ? (
          <Editor>
            <div className="flex gap-1.5">
              {CAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Boja ${color}`}
                  aria-pressed={car.color === color}
                  onClick={() => onChangeCar({ color })}
                  className={`size-6 rounded-full border-2 ${car.color === color ? 'border-orange-500' : 'border-white ring-1 ring-stone-300'}`}
                  style={{ background: color }}
                />
              ))}
            </div>
            <CarSliders item={car} dimensions={dimensions} onChange={onChangeCar} onSettle={onSettle} />
            <div className="grid grid-cols-2 gap-2">
              <SoftButton icon={RotateCw} label="Okreni 90°" onClick={() => onChangeCar({ rotation: car.rotation + Math.PI / 2 })} />
              <SoftButton icon={Trash2} label="Ukloni" onClick={onRemoveCar} />
            </div>
          </Editor>
        ) : (
          <Hint>Vozilo je rekvizit za osećaj prostora. Izaberi tip i prevuci ga po podu. Stavi ga iznad dizalice i podigni da proveriš visinu.</Hint>
        )}
      </Section>
    </div>
  )
}

function FurnitureEditor({ item, dimensions, onChange, onSettle, onCopy, onRemove }) {
  const limits = furnitureSliderLimits(item, dimensions)
  return (
    <Editor>
      <Slider label="Levo / desno" value={item.x} {...limits.x} onChange={(x) => onChange({ x })} onSettle={onSettle} />
      <Slider label="Napred / nazad" value={item.z} {...limits.z} onChange={(z) => onChange({ z })} onSettle={onSettle} />
      <Slider label="Širina" value={item.width} {...limits.width} onChange={(width) => onChange({ width })} onSettle={onSettle} />
      <Slider label="Dubina" value={item.depth} {...limits.depth} onChange={(depth) => onChange({ depth })} onSettle={onSettle} />
      <Slider label="Visina" value={item.height} {...limits.height} onChange={(height) => onChange({ height })} onSettle={onSettle} />
      <div className="grid grid-cols-3 gap-2">
        <SoftButton icon={RotateCw} label="90°" onClick={() => onChange({ rotation: item.rotation + Math.PI / 2 })} />
        <SoftButton icon={Copy} label="Kopiraj" onClick={onCopy} />
        <SoftButton icon={Trash2} label="Ukloni" onClick={onRemove} />
      </div>
    </Editor>
  )
}

function CarSliders({ item, dimensions, onChange, onSettle }) {
  const limits = carSliderLimits(item, dimensions)
  return (
    <>
      <Slider label="Dužina" value={item.length} {...limits.length} onChange={(length) => onChange({ length })} onSettle={onSettle} />
      <Slider label="Širina" value={item.width} {...limits.width} onChange={(width) => onChange({ width })} onSettle={onSettle} />
      <Slider label="Visina" value={item.height} {...limits.height} onChange={(height) => onChange({ height })} onSettle={onSettle} />
      <Slider label="Levo / desno" value={item.x} {...limits.x} onChange={(x) => onChange({ x })} onSettle={onSettle} />
      <Slider label="Napred / nazad" value={item.z} {...limits.z} onChange={(z) => onChange({ z })} onSettle={onSettle} />
      <Slider
        label="Podignut na dizalici"
        value={item.elevation || 0}
        {...limits.elevation}
        formatValue={(value) => (value > 0 ? formatMeters(value) : 'Na podu')}
        onChange={(elevation) => onChange({ elevation })}
        onSettle={onSettle}
      />
    </>
  )
}

/* ---------- Dodaci ---------- */

function ExtrasTab({ scene, onSceneChange, onElectricChange, onCanopyChange, onSettle }) {
  const { electric, canopy, dimensions } = scene
  const count = (value) => String(value)
  const walls = WALL_IDS.map((id) => ({ id, name: wallFrame(id, dimensions).label.replace(' zid', '') }))
  const canopyLength = canopySpan(canopy, dimensions)
  const canopyArea = canopyLength * canopy.depth
  const ventilation = VENTILATION_OPTIONS.find((entry) => entry.id === scene.ventilation)
  return (
    <div className="space-y-6">
      <Section icon={Home} title="Nadstrešnica">
        <Toggle
          label="Nadstrešnica uz zid"
          detail="Za auto, drva ili natkriven ulaz."
          checked={canopy.enabled}
          onChange={(enabled) => onCanopyChange({ enabled })}
        />
        {canopy.enabled && (
          <>
            <Segmented label="Zid" value={canopy.wall} options={walls} onChange={(wall) => onCanopyChange({ wall })} />
            <Slider label="Dubina" value={canopy.depth} {...CANOPY_LIMITS.depth} onChange={(depth) => onCanopyChange({ depth })} onSettle={onSettle} />
            <Slider
              label="Dužina"
              value={canopyLength}
              min={CANOPY_LIMITS.length.min}
              max={canopy.wall === 'front' || canopy.wall === 'back' ? dimensions.width : dimensions.length}
              step={CANOPY_LIMITS.length.step}
              onChange={(length) => onCanopyChange({ length })}
              onSettle={onSettle}
            />
            <Slider
              label="Pomak duž zida"
              value={canopy.offset || 0}
              min={-1}
              max={1}
              step={0.05}
              formatValue={(value) => (value === 0 ? 'Na sredini' : value < 0 ? 'Ka jednom kraju' : 'Ka drugom kraju')}
              onChange={(offset) => onCanopyChange({ offset })}
              onSettle={onSettle}
            />
            <Toggle
              label="Zatvoren aneks"
              detail="Tri zida i vrata: ostava ili kotlarnica uz objekat, tlocrt u obliku slova L."
              checked={Boolean(canopy.closed)}
              onChange={(closed) => onCanopyChange({ closed })}
            />
            <Hint>
              Površina {canopyArea.toFixed(1).replace('.', ',')} m².{' '}
              {canopyArea > CANOPY_FREE_AREA ? 'Preko 20 m² treba proveriti dozvolu.' : 'Do 20 m² akt obično nije potreban, uz uslove iz vodiča.'}
            </Hint>
          </>
        )}
      </Section>

      <Section icon={Wind} title="Ventilacija">
        <Segmented label="Izbor" value={scene.ventilation} options={VENTILATION_OPTIONS} onChange={(value) => onSceneChange({ ventilation: value })} columns={3} />
        <Hint>{ventilation?.detail}. Broj se računa po površini poda.</Hint>
      </Section>

      <Section icon={Sparkles} title="Solarni paneli">
        <Slider
          label="Snaga elektrane"
          value={electric.solar}
          {...ELECTRIC_LIMITS.solar}
          formatValue={(value) => (value > 0 ? `${String(value).replace('.', ',')} kW` : 'Bez panela')}
          onChange={(solar) => onElectricChange({ solar })}
          onSettle={onSettle}
        />
        <Hint>Računa se komplet po kW. Nosivost krova i priključenje na mrežu treba proveriti pre porudžbine.</Hint>
      </Section>

      <Section icon={Zap} title="Struja">
        <Toggle
          label="Struja u objektu"
          detail="Tabla, kablovi, utičnice i rasveta ulaze u računicu."
          checked={electric.enabled}
          onChange={(enabled) => onElectricChange({ enabled })}
        />
        {electric.enabled && (
          <>
            <Segmented
              label="Priključak"
              value={electric.phase}
              options={[
                { id: 'single', name: 'Monofazni', detail: 'Rasveta i obične utičnice' },
                { id: 'three', name: 'Trofazni', detail: 'Kompresor, mašine, jači punjač' },
              ]}
              onChange={(phase) => onElectricChange({ phase })}
            />
            <Slider label="Utičnice" value={electric.sockets} {...ELECTRIC_LIMITS.sockets} formatValue={count} onChange={(sockets) => onElectricChange({ sockets })} onSettle={onSettle} />
            <Slider label="LED svetiljke" value={electric.lights} {...ELECTRIC_LIMITS.lights} formatValue={count} onChange={(lights) => onElectricChange({ lights })} onSettle={onSettle} />
            <Slider
              label="Udaljenost od brojila"
              value={electric.distance}
              {...ELECTRIC_LIMITS.distance}
              formatValue={(value) => `${value} m`}
              onChange={(distance) => onElectricChange({ distance })}
              onSettle={onSettle}
            />
            <Segmented label="Punjač za električni auto" value={electric.charger} options={CHARGER_OPTIONS} onChange={(charger) => onElectricChange({ charger })} columns={3} />
            <Hint>
              {electric.charger === 'ready' && 'Priprema je jeftinija. Punjač možeš da dodaš kasnije bez novog razvlačenja kablova.'}
              {electric.charger === 'charger' && (electric.phase === 'three' ? 'Na trofaznom priključku računa se punjač od 11 kW.' : 'Na monofaznom priključku računa se punjač od 7,4 kW.')}
              {electric.charger === 'none' && 'Instalaciju izvodi i proverava električar.'}
            </Hint>
            <Hint>Svetiljke, utičnice, prekidač, tabla i kanalice vide se u prikazu. Raspored je predlog: utičnice su na 1,15 m, ravnomerno po slobodnim zidovima.</Hint>
          </>
        )}
      </Section>
    </div>
  )
}

/* ---------- Računica ---------- */

function OffersSection({ scene, estimate, partners, onSceneChange }) {
  if (partners.length === 0) return null
  const packs = packageOffers(partners, quoteItems(scene, estimate)).filter((entry) => entry.offers.length > 0)
  if (packs.length === 0) return null

  function choose(pack, id) {
    const offers = { ...scene.offers }
    if (offers[pack] === id) delete offers[pack]
    else offers[pack] = id
    onSceneChange({ offers })
  }

  return (
    <Section icon={Store} title="Ponude firmi">
      <Hint>Jedna firma za ceo paket. Izabrana ponuda menja cene iz računice, a upit šalješ na strani Majstori.</Hint>
      {packs.map(({ pack, offers }) => (
        <div key={pack.id} className="space-y-1.5">
          <p className="text-sm font-medium text-stone-900">{pack.name}</p>
          {offers.map((offer) => {
            const active = scene.offers[pack.id] === offer.partner.id
            return (
              <button
                key={offer.partner.id}
                type="button"
                aria-pressed={active}
                onClick={() => choose(pack.id, offer.partner.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition ${active ? 'border-orange-500 bg-orange-50' : 'border-stone-200 bg-white hover:border-stone-400'}`}
              >
                <span className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate font-medium text-stone-900">{offer.partner.name}</span>
                  <span className="shrink-0 font-semibold text-stone-900 tabular-nums">{formatDin(offer.total)}</span>
                </span>
                <span className="block text-xs text-stone-500">
                  {offer.partner.city}
                  {offer.partner.pricesValidUntil ? ` · važi do ${offer.partner.pricesValidUntil}` : ''}
                  {offer.partner.sponsored ? ' · Sponzorisano' : ''}
                </span>
                {offer.partner.delivery && <span className="block text-xs text-stone-500">{offer.partner.delivery}</span>}
                {!offer.complete && (
                  <span className="mt-0.5 block text-xs text-amber-800">
                    Nepotpuno: {offer.covered} od {offer.articles} artikala. Nema: {offer.missing.join(', ')}.
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ))}
    </Section>
  )
}

function EstimateTab({ scene, estimate, quote, total, partners, onSceneChange }) {
  const [copied, setCopied] = useState(false)
  const sections = []
  estimate.lines.forEach((entry) => {
    const last = sections[sections.length - 1]
    if (!last || last.label !== entry.section) sections.push({ label: entry.section, items: [entry] })
    else last.items.push(entry)
  })
  const skills = Object.entries(quote).sort((left, right) => right[1].total - left[1].total)
  const peak = Math.max(1, ...skills.map(([, group]) => group.total))
  const area = scene.dimensions.width * scene.dimensions.length

  function copyList() {
    const text = [
      `${buildingType(scene.buildingType).name} ${scene.dimensions.width} × ${scene.dimensions.length} × ${scene.dimensions.height} m`,
      '',
      ...sections.flatMap((section) => [
        section.label.toUpperCase(),
        ...section.items.map((entry) => `- ${entry.item}: ${formatQuantity(entry.quantity)} ${entry.unit}${entry.detail ? ` (${entry.detail})` : ''}`),
        '',
      ]),
      `Orijentaciono: ${formatDin(total)}`,
    ].join('\n')
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-stone-900 p-4 text-white">
        <p className="text-xs tracking-wide text-stone-400 uppercase">Orijentaciona cena</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{formatDin(total)}</p>
        <p className="mt-1 text-xs text-stone-400">
          oko {formatDin(total / Math.max(1, area))} po m² · zbir po stavkama, nije ponuda
        </p>
        <div className="mt-4 space-y-2">
          {skills.map(([skill, group]) => (
            <div key={skill}>
              <p className="flex justify-between text-xs">
                <span className="text-stone-300">{skillName(skill)}</span>
                <span className="tabular-nums">{formatDin(group.total)}</span>
              </p>
              <div className="mt-1 h-1.5 rounded-full bg-white/10">
                <div className="h-1.5 rounded-full bg-orange-400" style={{ width: `${(group.total / peak) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {estimate.warnings.map((warning) => (
        <p key={warning} className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
          {warning}
        </p>
      ))}

      <div className="grid grid-cols-2 gap-2">
        <SoftButton icon={copied ? Check : ClipboardCopy} label={copied ? 'Kopirano' : 'Kopiraj spisak'} onClick={copyList} />
        <SoftButton icon={Send} label="Crteži i upit" onClick={() => navigate('/majstori')} />
      </div>
      <button
        type="button"
        onClick={() => navigate('/ponuda')}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-stone-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700"
      >
        <FileText size={15} />
        Ponuda za štampu i PDF
      </button>

      <OffersSection scene={scene} estimate={estimate} partners={partners} onSceneChange={onSceneChange} />

      <Section icon={ScrollText} title="Spisak materijala">
        <div className="space-y-2">
          {sections.map((section, index) => (
            <details key={section.label} open={index < 2} className="group rounded-lg bg-white ring-1 ring-stone-200">
              <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm font-medium text-stone-900">
                {section.label}
                <span className="text-xs font-normal text-stone-400">{section.items.length} stavki</span>
              </summary>
              <ul className="divide-y divide-stone-100 border-t border-stone-100">
                {section.items.map((entry) => (
                  <li key={`${entry.item}-${entry.detail}`} className="px-3 py-2">
                    <span className="flex items-baseline justify-between gap-3 text-sm text-stone-800">
                      <span>{entry.item}</span>
                      <span className="shrink-0 font-medium tabular-nums">
                        {formatQuantity(entry.quantity)} {entry.unit}
                      </span>
                    </span>
                    {entry.detail && <span className="mt-0.5 block text-xs leading-relaxed text-stone-500">{entry.detail}</span>}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </Section>

      <ul className="space-y-1.5 text-xs leading-relaxed text-stone-500">
        {estimate.notes.map((note) => (
          <li key={note}>· {note}</li>
        ))}
      </ul>
    </div>
  )
}

/* ---------- Projekti ---------- */

function ProjectsTab({ projects, activeProjectId, projectDirty, onSaveProject, onNewProject, onOpenProject, onDeleteProject }) {
  const [pending, setPending] = useState(null)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const active = projects.find((project) => project.id === activeProjectId) ?? null

  function requestSwitch(action) {
    if (!projectDirty) {
      runSwitch(action)
      return
    }
    setPending(action)
  }

  function runSwitch(action) {
    setPending(null)
    if (action.type === 'open') onOpenProject(action.id)
    else onNewProject()
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => requestSwitch({ type: 'new' })}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-stone-300 bg-white px-3 py-2.5 text-sm font-medium text-stone-900 transition hover:border-stone-500"
      >
        <Plus size={15} className="text-orange-500" />
        Nov objekat
      </button>
      {pending && (
        <div className="space-y-2 rounded-lg bg-white p-3 ring-1 ring-stone-200">
          <p className="text-sm text-stone-800">Trenutne izmene nisu sačuvane.</p>
          <button
            type="button"
            onClick={() => {
              onSaveProject()
              runSwitch(pending)
            }}
            className="w-full rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white"
          >
            Sačuvaj i nastavi
          </button>
          <button type="button" onClick={() => runSwitch(pending)} className="w-full rounded-md bg-stone-100 px-3 py-2 text-sm font-medium text-stone-800">
            Odbaci izmene
          </button>
          <button type="button" onClick={() => setPending(null)} className="w-full px-3 py-1.5 text-sm text-stone-500">
            Ostani ovde
          </button>
        </div>
      )}
      <Hint>
        {active
          ? `Otvoren je „${active.name}”. Izmene se same čuvaju posle pola sekunde.`
          : 'Sačuvaj objekat da sledeći put nastaviš. Vidi ga samo ovaj pregledač, a link iz imejla ga otvara i na drugom uređaju.'}
      </Hint>
      {projects.length === 0 ? (
        <p className="rounded-lg bg-white px-3 py-6 text-center text-sm text-stone-500 ring-1 ring-stone-200">Još nema sačuvanih objekata.</p>
      ) : (
        <ul className="space-y-1.5">
          {projects.map((project) => {
            const open = project.id === activeProjectId
            const confirming = pendingDeleteId === project.id
            return (
              <li key={project.id} className={`rounded-lg bg-white px-2 py-1.5 ring-1 ${open ? 'ring-orange-400' : 'ring-stone-200'}`}>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={open}
                    onClick={() => requestSwitch({ type: 'open', id: project.id })}
                    className="min-w-0 flex-1 rounded-md px-2 py-1.5 text-left text-sm text-stone-900 hover:bg-stone-50 disabled:hover:bg-transparent"
                  >
                    <span className="block truncate font-medium">{project.name}</span>
                    <span className="block text-[11px] text-stone-500">
                      {formatMeters(project.scene.dimensions.width)} × {formatMeters(project.scene.dimensions.length)} · {open ? 'otvoren' : formatSavedAt(project.updatedAt)}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Obriši ${project.name}`}
                    onClick={() => setPendingDeleteId(confirming ? null : project.id)}
                    className="rounded-md p-2 text-stone-400 hover:bg-stone-50 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {confirming && (
                  <div className="flex gap-2 px-2 pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteProject(project.id)
                        setPendingDeleteId(null)
                      }}
                      className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white"
                    >
                      Obriši
                    </button>
                    <button type="button" onClick={() => setPendingDeleteId(null)} className="rounded-md px-2 py-1 text-xs text-stone-500">
                      Odustani
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* ---------- Primitive ---------- */

function Section({ icon: Icon, title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">
        <Icon size={14} />
        {title}
      </h2>
      {children}
    </section>
  )
}

function Editor({ children }) {
  return <div className="space-y-3 rounded-xl bg-white p-3 ring-1 ring-orange-200">{children}</div>
}

function Hint({ children }) {
  return <p className="text-xs leading-relaxed text-stone-500">{children}</p>
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-stone-200">
      <p className="text-[11px] text-stone-500">{label}</p>
      <p className="text-sm font-semibold text-stone-900 tabular-nums">{value}</p>
    </div>
  )
}

function IconButton({ label, icon: Icon, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="rounded-lg p-2 text-stone-600 transition hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent"
      {...rest}
    >
      <Icon size={16} />
    </button>
  )
}

function SoftButton({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 rounded-lg bg-stone-100 px-3 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-200"
    >
      <Icon size={14} />
      {label}
    </button>
  )
}

function Toggle({ label, detail, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg bg-white px-3 py-2 ring-1 ring-stone-200">
      <span>
        <span className="block text-sm font-medium text-stone-800">{label}</span>
        {detail && <span className="block text-xs text-stone-500">{detail}</span>}
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span
        aria-hidden="true"
        className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full bg-stone-300 transition peer-checked:bg-orange-500 peer-focus-visible:ring-2 peer-focus-visible:ring-orange-300 after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4"
      />
    </label>
  )
}

function Segmented({ label, value, options, onChange, columns }) {
  const cols = columns ?? Math.min(4, options.length)
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-stone-800">{label}</span>
      <div className="grid gap-1 rounded-lg bg-stone-100 p-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={value === option.id}
            title={option.detail}
            onClick={() => onChange(option.id)}
            className={`truncate rounded-md px-1.5 py-1.5 text-xs font-medium transition ${
              value === option.id ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {option.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function Slider({ label, value, min, max, step = 0.05, onChange, onSettle, formatValue = formatMeters, showRange = false }) {
  const locked = max - min < 0.001
  const upper = Math.max(min, max)
  const shown = Math.min(Math.max(value, min), upper)
  const percent = locked ? 0 : ((shown - min) / (upper - min)) * 100
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-stone-700">{label}</span>
        <span className="rounded-md bg-white px-1.5 py-0.5 font-medium text-stone-900 tabular-nums ring-1 ring-stone-200">{formatValue(value)}</span>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={upper}
        step={step}
        value={shown}
        disabled={locked}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={onSettle}
        onPointerCancel={onSettle}
        onKeyUp={onSettle}
        className="range w-full disabled:opacity-40"
        style={{ '--fill': `${percent}%` }}
      />
      {showRange && (
        <span className="mt-0.5 flex justify-between text-[10px] text-stone-400">
          <span>{formatValue(min)}</span>
          <span>{formatValue(upper)}</span>
        </span>
      )}
    </label>
  )
}

function ItemList({ items, selectedId, onSelect, onRemove, labelFor }) {
  if (items.length === 0) return null
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = item.id === selectedId
        return (
          <li key={item.id} className="flex gap-1">
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(item.id)}
              className={`min-w-0 flex-1 truncate rounded-lg px-3 py-1.5 text-left text-sm transition ${
                active ? 'bg-orange-500 font-medium text-white' : 'bg-white text-stone-800 ring-1 ring-stone-200 hover:ring-stone-300'
              }`}
            >
              {labelFor(item)}
            </button>
            <button
              type="button"
              aria-label={`Ukloni ${labelFor(item)}`}
              onClick={() => onRemove(item.id)}
              className="rounded-lg bg-white px-2 text-stone-400 ring-1 ring-stone-200 hover:text-red-600"
            >
              <Trash2 size={14} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function fmtSize(a, b) {
  return `${a.toFixed(2).replace('.', ',')}×${b.toFixed(2).replace('.', ',')}`
}

function formatQuantity(value) {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(2).replace(/0$/, '').replace('.', ',')
}
