import { useState } from 'react'
import {
  AppWindow,
  Archive,
  CarFront,
  Copy,
  DoorOpen,
  FolderOpen,
  Library,
  Palette,
  Plus,
  Redo2,
  RotateCw,
  Ruler,
  Save,
  ScrollText,
  Table2,
  Trash2,
  Undo2,
  Warehouse,
} from 'lucide-react'
import { DIMENSION_LIMITS, formatMeters } from '../config'
import { buildEstimate, hingeCount } from '../estimate'
import { DOOR_MATERIALS, ROOF_MATERIALS, WALL_MATERIALS } from '../materials'
import { navigate } from '../nav'
import { formatSavedAt } from '../projects'
import { PITCH_LIMITS, ROOF_FALLS, ROOF_KINDS, ROOF_RIDGES, roofGeometry } from '../roof'
import {
  FURNITURE_TYPES,
  WINDOW_TYPES,
  WALL_IDS,
  carSliderLimits,
  doorSliderLimits,
  furnitureSliderLimits,
  pedestrianSliderLimits,
  wallFrame,
  windowSliderLimits,
} from '../layout'
import { PatternSwatch } from './PatternSwatch'

const dimensionKeys = ['width', 'length', 'height']

const furnitureIcons = {
  workbench: Table2,
  shelf: Library,
  rack: Library,
  cabinet: Archive,
}

export function ControlPanel({
  dimensions,
  onDimensionChange,
  wallMaterialId,
  roofMaterialId,
  doorMaterialId,
  onWallMaterialChange,
  onRoofMaterialChange,
  onDoorMaterialChange,
  windows,
  furniture,
  door,
  roof,
  car,
  selected,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  projectName,
  projects,
  activeProjectId,
  projectDirty,
  saveError,
  saveNotice,
  storagePath,
  onProjectNameChange,
  onSaveProject,
  onNewProject,
  onOpenProject,
  onDeleteProject,
  onSettle,
  onSelect,
  onAddWindow,
  onCopyWindow,
  onAddFurniture,
  onChangeWindow,
  onChangeFurniture,
  onDoorChange,
  onRoofChange,
  gutters,
  onGuttersChange,
  pedestrianDoors,
  onAddPedestrian,
  onChangePedestrian,
  onAddCar,
  onChangeCar,
  onRemoveCar,
  onRemove,
}) {
  const footprint = dimensions.width * dimensions.length
  const roofShape = roofGeometry(dimensions, roof)
  const estimate = buildEstimate({
    dimensions,
    roof,
    door,
    windows,
    wallMaterialId,
    roofMaterialId,
  })
  const selectedWindow = windows.find((item) => selected?.kind === 'window' && item.id === selected.id)
  const selectedFurniture = furniture.find(
    (item) => selected?.kind === 'furniture' && item.id === selected.id,
  )

  return (
    <aside className="flex max-h-[52dvh] w-full shrink-0 flex-col overflow-y-auto border-b border-stone-300 bg-[#f7f4ef] md:max-h-none md:w-[380px] md:border-r md:border-b-0">
      <header className="border-b border-stone-200 px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-stone-800 text-stone-100">
            <Warehouse size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs tracking-wide text-stone-500 uppercase">Montažni objekti</p>
            <h1 className="text-lg font-semibold text-stone-900">Garaža i radionica</h1>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Poništi"
              title="Poništi (Ctrl+Z)"
              disabled={!canUndo}
              onClick={onUndo}
              className="rounded-md border border-stone-300 bg-white p-2 text-stone-700 disabled:opacity-35"
            >
              <Undo2 size={16} />
            </button>
            <button
              type="button"
              aria-label="Ponovi"
              title="Ponovi (Ctrl+Y)"
              disabled={!canRedo}
              onClick={onRedo}
              className="rounded-md border border-stone-300 bg-white p-2 text-stone-700 disabled:opacity-35"
            >
              <Redo2 size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-7 px-5 py-5">
        <ProjectSection
          name={projectName}
          projects={projects}
          activeProjectId={activeProjectId}
          dirty={projectDirty}
          saveError={saveError}
          saveNotice={saveNotice}
          storagePath={storagePath}
          onNameChange={onProjectNameChange}
          onSave={onSaveProject}
          onNew={onNewProject}
          onOpen={onOpenProject}
          onDelete={onDeleteProject}
        />

        <section className="space-y-4">
          <SectionTitle icon={Ruler} label="Dimenzije" />
          {dimensionKeys.map((key) => {
            const limit = DIMENSION_LIMITS[key]
            return (
              <label key={key} className="block">
                <span className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-stone-800">{limit.label}</span>
                  <span className="tabular-nums text-stone-600">{formatMeters(dimensions[key])}</span>
                </span>
                <input
                  type="range"
                  min={limit.min}
                  max={limit.max}
                  step={limit.step}
                  value={dimensions[key]}
                  aria-label={limit.label}
                  onChange={(event) => onDimensionChange(key, event.target.value)}
                  onPointerUp={onSettle}
                  onPointerCancel={onSettle}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-300 accent-stone-800"
                />
                <span className="mt-1 flex justify-between text-xs text-stone-400">
                  <span>{formatMeters(limit.min)}</span>
                  <span>{formatMeters(limit.max)}</span>
                </span>
              </label>
            )
          })}
          <p className="rounded-lg bg-stone-200/70 px-3 py-2 text-sm text-stone-700">
            Tlocrt{' '}
            <span className="font-medium tabular-nums">
              {footprint.toFixed(1).replace('.', ',')} m²
            </span>
            {roof.kind !== 'flat' && (
              <>
                {' '}
                · slemen{' '}
                <span className="font-medium tabular-nums">
                  {formatMeters(dimensions.height + roofShape.rise)}
                </span>
              </>
            )}
          </p>
          {roof.kind !== 'flat' && (
            <p className="text-sm leading-relaxed text-stone-500">
              Visina je do niže strehe. Slemen i viši zid idu iznad toga, po nagibu.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <SectionTitle icon={Palette} label="Materijali" />
          <MaterialSelect
            label="Zidovi"
            value={wallMaterialId}
            options={WALL_MATERIALS}
            onChange={onWallMaterialChange}
          />
          <MaterialSelect
            label="Krov"
            value={roofMaterialId}
            options={ROOF_MATERIALS}
            onChange={onRoofMaterialChange}
          />
          <div className="grid grid-cols-3 gap-2">
            {ROOF_KINDS.map((kind) => (
              <button
                key={kind.id}
                type="button"
                aria-pressed={roof.kind === kind.id}
                onClick={() => onRoofChange({ kind: kind.id })}
                className={`rounded-lg border px-2 py-2 text-sm font-medium ${
                  roof.kind === kind.id
                    ? 'border-stone-800 bg-stone-800 text-white'
                    : 'border-stone-300 bg-white text-stone-900'
                }`}
              >
                {kind.name}
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
            <ChoiceRow
              label="Pad prema"
              value={roof.fall}
              options={ROOF_FALLS}
              onChange={(fall) => onRoofChange({ fall })}
            />
          )}
          {roof.kind === 'duo' && (
            <ChoiceRow
              label="Slemen"
              value={roof.ridge}
              options={ROOF_RIDGES}
              onChange={(ridge) => onRoofChange({ ridge })}
            />
          )}
          <p className="text-sm leading-relaxed text-stone-500">
            Dezeni prate obloge i pokrivače koji se kod nas najčešće stavljaju na garaže i pomoćne objekte.
            {roof.kind === 'duo' && ' Uzduž znači slemen od prednje do zadnje strane.'}
          </p>
          <label className="flex items-center gap-2 text-sm text-stone-800">
            <input
              type="checkbox"
              aria-label="Oluk na strehi"
              checked={gutters}
              onChange={(event) => onGuttersChange(event.target.checked)}
            />
            Oluk na strehi
          </label>
          <p className="text-sm leading-relaxed text-stone-500">
            Oluk je uključen u prikazu. Isključi ga ako ne ide u ovu garažu. Upit limaru za oluk šalje se posebno.
            Betonska ploča je uvek u prikazu, a upit zidaru biraš na strani Majstori.
          </p>
        </section>

        <section className="space-y-3">
          <SectionTitle icon={DoorOpen} label="Vrata" />
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'none', name: 'Bez vrata' },
              { id: 'single', name: 'Panelna' },
              { id: 'double', name: 'Dvokrilna' },
              { id: 'roller', name: 'Rolo' },
            ].map((style) => (
              <button
                key={style.id}
                type="button"
                aria-pressed={door.style === style.id}
                onClick={() => onDoorChange({ style: style.id })}
                className={`rounded-lg border px-2 py-2 text-sm font-medium ${
                  door.style === style.id
                    ? 'border-stone-800 bg-stone-800 text-white'
                    : 'border-stone-300 bg-white text-stone-900'
                }`}
              >
                {style.name}
              </button>
            ))}
          </div>
          {door.style !== 'none' && (
            <>
              <ChoiceRow
                label="Zid"
                value={door.wall}
                options={WALL_IDS.map((id) => ({ id, name: wallFrame(id, dimensions).label.replace(' zid', '') }))}
                onChange={(wall) => onDoorChange({ wall })}
              />
              <MaterialSelect
                label="Materijal vrata"
                value={doorMaterialId}
                options={DOOR_MATERIALS}
                onChange={onDoorMaterialChange}
              />
              <Slider
                label="Širina vrata"
                value={door.width}
                {...doorSliderLimits(door, dimensions).width}
                onChange={(width) => onDoorChange({ width })}
                onSettle={onSettle}
              />
              <Slider
                label="Visina vrata"
                value={door.height}
                {...doorSliderLimits(door, dimensions).height}
                onChange={(height) => onDoorChange({ height })}
                onSettle={onSettle}
              />
              <Slider
                label="Položaj na zidu"
                value={door.along}
                {...doorSliderLimits(door, dimensions).along}
                onChange={(along) => onDoorChange({ along })}
                onSettle={onSettle}
              />
            </>
          )}
          <label className={`flex items-center gap-2 text-sm ${door.style === 'single' || door.style === 'double' ? 'text-stone-800' : 'text-stone-400'}`}>
            <input
              type="checkbox"
              aria-label="Pešačka vrata"
              checked={door.wicket}
              disabled={door.style !== 'single' && door.style !== 'double'}
              onChange={(event) => onDoorChange({ wicket: event.target.checked })}
            />
            Pešačka vrata na krilu
          </label>
          {door.style !== 'none' && (
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
          )}
          <p className="text-sm leading-relaxed text-stone-500">
            {door.style === 'roller'
              ? 'Rolo plašt silazi odozgo kroz vođice. Otvorenost ga diže u kutiju.'
              : 'Panelna i dvokrilna vrata se otvaraju na šarkama. Krilo više od 2 m dobija 3 šarke, do 2 m dobija 2.'}
            {door.style === 'single' || door.style === 'double'
              ? ` Na ovoj visini svako krilo nosi ${hingeCount(door.height)} šarke.`
              : ''}
          </p>
        </section>

        <section className="space-y-3">
          <SectionTitle icon={AppWindow} label="Prozori" />
          <div className="grid grid-cols-3 gap-2">
            {WINDOW_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                aria-label={type.addLabel}
                onClick={() => onAddWindow(type.id)}
                className="rounded-lg border border-stone-300 bg-white px-2 py-2 text-center transition hover:border-stone-500"
              >
                <span className="block text-sm font-medium text-stone-900">{type.name}</span>
                <span className="block text-[11px] text-stone-500">{type.detail}</span>
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
              const wall = wallFrame(item.wall, dimensions)
              return `${type?.name ?? 'Prozor'} · ${wall.label}`
            }}
          />
          {selectedWindow && (
            <WindowEditor
              item={selectedWindow}
              dimensions={dimensions}
              onChange={(patch) => onChangeWindow(selectedWindow.id, patch)}
              onSettle={onSettle}
              onCopy={() => onCopyWindow(selectedWindow.id)}
              onRemove={() => onRemove({ kind: 'window', id: selectedWindow.id })}
            />
          )}
          <p className="text-sm leading-relaxed text-stone-500">
            Klikni prozor u prikazu i prevuci ga po zidu. Tačan položaj možeš da namestiš i klizačima.
          </p>
        </section>

        <section className="space-y-3">
          <SectionTitle icon={DoorOpen} label="Bočna pešačka vrata" />
          <button
            type="button"
            onClick={onAddPedestrian}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-900"
          >
            Dodaj bočna vrata
          </button>
          <ItemList
            items={pedestrianDoors}
            selectedId={selected?.kind === 'pedestrian' ? selected.id : null}
            onSelect={(id) => onSelect({ kind: 'pedestrian', id })}
            onRemove={(id) => onRemove({ kind: 'pedestrian', id })}
            labelFor={(item) => `Vrata ${item.width.toFixed(2)} × ${item.height.toFixed(2)} m · ${wallFrame(item.wall, dimensions).label}`}
          />
          {selected?.kind === 'pedestrian' && pedestrianDoors.some((item) => item.id === selected.id) && (
            <PedestrianEditor
              item={pedestrianDoors.find((item) => item.id === selected.id)}
              dimensions={dimensions}
              onChange={(patch) => onChangePedestrian(selected.id, patch)}
              onSettle={onSettle}
              onRemove={() => onRemove({ kind: 'pedestrian', id: selected.id })}
            />
          )}
          <p className="text-sm leading-relaxed text-stone-500">
            Početna mera je 0,90 × 2,05 m. Zid, položaj, širina i visina se nameštaju kao kod prozora.
          </p>
        </section>

        <section className="space-y-3">
          <SectionTitle icon={Table2} label="Nameštaj" />
          <div className="grid grid-cols-2 gap-2">
            {FURNITURE_TYPES.map((type) => {
              const Icon = furnitureIcons[type.id] ?? Table2
              return (
                <button
                  key={type.id}
                  type="button"
                  aria-label={type.addLabel}
                  onClick={() => onAddFurniture(type.id)}
                  className="flex items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-900 transition hover:border-stone-500"
                >
                  <Icon size={15} />
                  {type.name}
                </button>
              )
            })}
          </div>
          <ItemList
            items={furniture}
            selectedId={selectedFurniture?.id}
            onSelect={(id) => onSelect({ kind: 'furniture', id })}
            onRemove={(id) => onRemove({ kind: 'furniture', id })}
            labelFor={(item) => FURNITURE_TYPES.find((entry) => entry.id === item.type)?.name ?? 'Nameštaj'}
          />
          {selectedFurniture && (
            <FurnitureEditor
              item={selectedFurniture}
              dimensions={dimensions}
              onChange={(patch) => onChangeFurniture(selectedFurniture.id, patch)}
              onSettle={onSettle}
              onRemove={() => onRemove({ kind: 'furniture', id: selectedFurniture.id })}
            />
          )}
          <p className="text-sm leading-relaxed text-stone-500">
            Prevuci nameštaj po podu. Širinu, dubinu i visinu menjaš klizačima dok je izabran.
          </p>
        </section>

        <section className="space-y-3">
          <SectionTitle icon={CarFront} label="Automobil" />
          {!car ? (
            <button
              type="button"
              aria-label="Ubaci automobil"
              onClick={onAddCar}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-stone-800 px-4 py-3 text-sm font-medium text-stone-50"
            >
              <CarFront size={16} />
              Ubaci automobil
            </button>
          ) : (
            <CarEditor
              item={car}
              dimensions={dimensions}
              onChange={onChangeCar}
              onSettle={onSettle}
              onRemove={onRemoveCar}
            />
          )}
          <p className="text-sm leading-relaxed text-stone-500">
            Automobil je rekvizit za osećaj prostora. Prevuci ga po podu i podesi dužinu, širinu i visinu.
          </p>
        </section>

        <EstimateSection estimate={estimate} />
      </div>
    </aside>
  )
}

function ProjectSection({
  name,
  projects,
  activeProjectId,
  dirty,
  saveError,
  saveNotice,
  storagePath,
  onNameChange,
  onSave,
  onNew,
  onOpen,
  onDelete,
}) {
  const [pending, setPending] = useState(null)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const active = projects.find((project) => project.id === activeProjectId) ?? null

  function requestSwitch(action) {
    if (!dirty) {
      runSwitch(action)
      return
    }
    setPending(action)
  }

  function runSwitch(action) {
    setPending(null)
    if (action.type === 'open') onOpen(action.id)
    else onNew()
  }

  return (
    <section className="space-y-3">
      <SectionTitle icon={FolderOpen} label="Projekti" />
      <input
        value={name}
        placeholder="Naziv garaže"
        aria-label="Naziv garaže"
        maxLength={60}
        onChange={(event) => onNameChange(event.target.value)}
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-600"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onSave}
          className="flex items-center justify-center gap-2 rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-stone-50"
        >
          <Save size={15} />
          {active ? 'Update' : 'Sačuvaj'}
        </button>
        <button
          type="button"
          onClick={() => requestSwitch({ type: 'new' })}
          className="flex items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-900"
        >
          <Plus size={15} />
          Nova garaža
        </button>
      </div>
      {saveError ? (
        <p className="text-sm leading-relaxed text-red-700" role="alert">
          {saveError}
        </p>
      ) : saveNotice ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800" role="status">
          {saveNotice}
        </p>
      ) : (
        <p className="text-sm leading-relaxed text-stone-500">{projectStatus(active, dirty)}</p>
      )}
      {pending && (
        <div className="space-y-2 rounded-lg border border-stone-300 bg-white p-3">
          <p className="text-sm text-stone-800">Trenutne izmene nisu sačuvane.</p>
          <button
            type="button"
            onClick={() => {
              onSave()
              runSwitch(pending)
            }}
            className="w-full rounded-md bg-stone-800 px-3 py-2 text-sm font-medium text-white"
          >
            {active ? 'Update i nastavi' : 'Sačuvaj i nastavi'}
          </button>
          <button
            type="button"
            onClick={() => runSwitch(pending)}
            className="w-full rounded-md bg-stone-100 px-3 py-2 text-sm font-medium text-stone-800"
          >
            Odbaci izmene
          </button>
          <button
            type="button"
            onClick={() => setPending(null)}
            className="w-full px-3 py-1.5 text-sm text-stone-500"
          >
            Ostani ovde
          </button>
        </div>
      )}
      {storagePath && (
        <p className="text-xs leading-relaxed break-all text-stone-400">{storagePath}</p>
      )}
      {projects.length === 0 ? (
        <p className="text-sm text-stone-500">Nema sačuvanih garaža.</p>
      ) : (
        <ul className="space-y-1">
          {projects.map((project) => {
            const open = project.id === activeProjectId
            const confirming = pendingDeleteId === project.id
            return (
              <li key={project.id} className="rounded-lg bg-white px-2 py-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={open}
                    onClick={() => requestSwitch({ type: 'open', id: project.id })}
                    className={`min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm ${
                      open ? 'font-medium text-stone-900' : 'text-stone-800 hover:bg-stone-100'
                    }`}
                  >
                    <span className="block truncate">{project.name}</span>
                    <span className="block text-[11px] font-normal text-stone-500">
                      {formatMeters(project.scene.dimensions.width)} × {formatMeters(project.scene.dimensions.length)}
                      {' · '}
                      {open ? 'otvoren' : formatSavedAt(project.updatedAt)}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Obriši ${project.name}`}
                    onClick={() => setPendingDeleteId(confirming ? null : project.id)}
                    className="rounded-md px-2 py-2 text-stone-500 hover:text-stone-900"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {confirming && (
                  <div className="mt-1 flex gap-2 px-2 pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(project.id)
                        setPendingDeleteId(null)
                      }}
                      className="rounded-md bg-stone-800 px-2 py-1 text-xs font-medium text-white"
                    >
                      Obriši
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(null)}
                      className="rounded-md px-2 py-1 text-xs text-stone-500"
                    >
                      Odustani
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function projectStatus(active, dirty) {
  if (!active) {
    return dirty
      ? 'Još nije sačuvano. Osvježavanje stranice ne pamti ovu garažu.'
      : 'Sačuvaj garažu da možeš kasnije da je otvoriš.'
  }
  if (dirty) return 'Čuvam izmene…'
  return `Sačuvano ${formatSavedAt(active.updatedAt)}. Upisano u fajl na ovom računaru.`
}

function WindowEditor({ item, dimensions, onChange, onSettle, onCopy, onRemove }) {
  const limits = windowSliderLimits(item, dimensions)
  return (
    <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-3">
      <div className="grid grid-cols-4 gap-1">
        {WALL_IDS.map((id) => {
          const wall = wallFrame(id, dimensions)
          const active = item.wall === id
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ wall: id })}
              className={`rounded-md px-2 py-1.5 text-xs font-medium ${
                active ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-700'
              }`}
            >
              {wall.label.replace(' zid', '')}
            </button>
          )
        })}
      </div>
      <div className="grid grid-cols-3 gap-1">
        {WINDOW_TYPES.map((type) => (
          <button
            key={type.id}
            type="button"
            aria-pressed={item.type === type.id}
            onClick={() => onChange({ type: type.id })}
            className={`rounded-md px-1 py-1.5 text-[11px] font-medium ${
              item.type === type.id ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-700'
            }`}
          >
            {type.name}
          </button>
        ))}
      </div>
      <Slider label="Položaj na zidu" value={item.along} {...limits.along} onChange={(along) => onChange({ along })} onSettle={onSettle} />
      <Slider label="Visina od poda" value={item.sill} {...limits.sill} onChange={(sill) => onChange({ sill })} onSettle={onSettle} />
      <Slider label="Širina prozora" value={item.width} {...limits.width} onChange={(width) => onChange({ width })} onSettle={onSettle} />
      <Slider label="Visina prozora" value={item.height} {...limits.height} onChange={(height) => onChange({ height })} onSettle={onSettle} />
      <button
        type="button"
        onClick={onCopy}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-stone-100 px-3 py-2 text-sm font-medium text-stone-800"
      >
        <Copy size={14} />
        Kopiraj prozor
      </button>
      <RemoveButton onClick={onRemove} />
    </div>
  )
}

function FurnitureEditor({ item, dimensions, onChange, onSettle, onRemove }) {
  const limits = furnitureSliderLimits(item, dimensions)
  return (
    <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-3">
      <Slider
        label="Položaj levo/desno"
        value={item.x}
        {...limits.x}
        onChange={(x) => onChange({ x })}
        onSettle={onSettle}
      />
      <Slider
        label="Položaj napred/nazad"
        value={item.z}
        {...limits.z}
        onChange={(z) => onChange({ z })}
        onSettle={onSettle}
      />
      <Slider label="Širina nameštaja" value={item.width} {...limits.width} onChange={(width) => onChange({ width })} onSettle={onSettle} />
      <Slider label="Dubina nameštaja" value={item.depth} {...limits.depth} onChange={(depth) => onChange({ depth })} onSettle={onSettle} />
      <Slider label="Visina nameštaja" value={item.height} {...limits.height} onChange={(height) => onChange({ height })} onSettle={onSettle} />
      <button
        type="button"
        aria-label="Rotiraj nameštaj"
        onClick={() => {
          onChange({ rotation: item.rotation + Math.PI / 2 })
          onSettle?.()
        }}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-stone-100 px-3 py-2 text-sm font-medium text-stone-800"
      >
        <RotateCw size={14} />
        Rotiraj za 90°
      </button>
      <RemoveButton onClick={onRemove} />
    </div>
  )
}

function PedestrianEditor({ item, dimensions, onChange, onSettle, onRemove }) {
  const limits = pedestrianSliderLimits(item, dimensions)
  return (
    <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-3">
      <div className="grid grid-cols-4 gap-1">
        {WALL_IDS.map((id) => {
          const wall = wallFrame(id, dimensions)
          const active = item.wall === id
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ wall: id })}
              className={`rounded-md px-2 py-1.5 text-xs font-medium ${active ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-700'}`}
            >
              {wall.label.replace(' zid', '')}
            </button>
          )
        })}
      </div>
      <Slider label="Položaj na zidu" value={item.along} {...limits.along} onChange={(along) => onChange({ along })} onSettle={onSettle} />
      <Slider label="Širina vrata" value={item.width} {...limits.width} onChange={(width) => onChange({ width })} onSettle={onSettle} />
      <Slider label="Visina vrata" value={item.height} {...limits.height} onChange={(height) => onChange({ height })} onSettle={onSettle} />
      <RemoveButton onClick={onRemove} />
    </div>
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
              className={`min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm ${
                active ? 'bg-stone-800 text-white' : 'bg-white text-stone-800'
              }`}
            >
              {labelFor(item)}
            </button>
            <button
              type="button"
              aria-label={`Ukloni ${labelFor(item)}`}
              onClick={() => onRemove(item.id)}
              className="rounded-md bg-white px-2 text-stone-500 hover:text-stone-900"
            >
              <Trash2 size={14} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function CarEditor({ item, dimensions, onChange, onSettle, onRemove }) {
  const limits = carSliderLimits(item, dimensions)
  return (
    <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-3">
      <Slider
        label="Dužina automobila"
        value={item.length}
        {...limits.length}
        onChange={(length) => onChange({ length })}
        onSettle={onSettle}
      />
      <Slider
        label="Širina automobila"
        value={item.width}
        {...limits.width}
        onChange={(width) => onChange({ width })}
        onSettle={onSettle}
      />
      <Slider
        label="Visina automobila"
        value={item.height}
        {...limits.height}
        onChange={(height) => onChange({ height })}
        onSettle={onSettle}
      />
      <Slider
        label="Automobil levo/desno"
        value={item.x}
        {...limits.x}
        onChange={(x) => onChange({ x })}
        onSettle={onSettle}
      />
      <Slider
        label="Automobil napred/nazad"
        value={item.z}
        {...limits.z}
        onChange={(z) => onChange({ z })}
        onSettle={onSettle}
      />
      <button
        type="button"
        aria-label="Rotiraj automobil"
        onClick={() => {
          onChange({ rotation: item.rotation + Math.PI / 2 })
          onSettle?.()
        }}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-stone-100 px-3 py-2 text-sm font-medium text-stone-800"
      >
        <RotateCw size={14} />
        Rotiraj za 90°
      </button>
      <RemoveButton onClick={onRemove} />
    </div>
  )
}

function MaterialSelect({ label, value, options, onChange }) {
  const selected = options.find((item) => item.id === value) ?? options[0]
  const groups = []
  for (const item of options) {
    const last = groups[groups.length - 1]
    if (!last || last.label !== item.group) groups.push({ label: item.group, items: [item] })
    else last.items.push(item)
  }

  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-stone-800">{label}</span>
      <select
        value={selected.id}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
      >
        {groups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <PatternSwatch spec={selected} />
      <span className="block text-[11px] text-stone-500">{selected.detail}</span>
    </label>
  )
}

function Slider({ label, value, min, max, step = 0.05, onChange, onSettle, formatValue = formatMeters }) {
  const locked = max - min < 0.001
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-sm">
        <span className="text-stone-700">{label}</span>
        <span className="tabular-nums text-stone-500">{formatValue(value)}</span>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={Math.max(min, max)}
        step={step}
        value={Math.min(Math.max(value, min), Math.max(min, max))}
        disabled={locked}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={onSettle}
        onPointerCancel={onSettle}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-300 accent-stone-800 disabled:opacity-40"
      />
    </label>
  )
}

function RemoveButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900"
    >
      <Trash2 size={14} />
      Ukloni
    </button>
  )
}

function ChoiceRow({ label, value, options, onChange }) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-stone-800">{label}</span>
      <div className={`grid gap-2 ${options.length > 2 ? 'grid-cols-4' : 'grid-cols-2'}`}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={value === option.id}
            title={option.detail}
            onClick={() => onChange(option.id)}
            className={`rounded-lg border px-2 py-2 text-sm font-medium ${
              value === option.id
                ? 'border-stone-800 bg-stone-800 text-white'
                : 'border-stone-300 bg-white text-stone-900'
            }`}
          >
            {option.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function EstimateSection({ estimate }) {
  const sections = []
  estimate.lines.forEach((entry) => {
    const last = sections[sections.length - 1]
    if (!last || last.label !== entry.section) sections.push({ label: entry.section, items: [entry] })
    else last.items.push(entry)
  })
  return (
    <section className="space-y-3">
      <SectionTitle icon={ScrollText} label="Procena materijala" />
      <p className="text-sm leading-relaxed text-stone-500">
        Spisak koji majstor daje kupcu: profili, table i okovi po ovim merama. Nema cena.
      </p>
      <button
        type="button"
        onClick={() => navigate('/majstori')}
        className="w-full rounded-lg border border-stone-800 bg-white px-3 py-2 text-sm font-medium text-stone-900"
      >
        Crteži i upit majstoru
      </button>
      {estimate.warnings.map((warning) => (
        <p key={warning} className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-950">
          {warning}
        </p>
      ))}
      {sections.map((section) => (
        <div key={section.label} className="space-y-2">
          <h3 className="text-sm font-medium text-stone-800">{section.label}</h3>
          <ul className="space-y-2">
            {section.items.map((entry) => (
              <li key={`${entry.item}-${entry.detail}`} className="rounded-lg border border-stone-200 bg-white px-3 py-2">
                <span className="flex items-baseline justify-between gap-3 text-sm text-stone-900">
                  <span>{entry.item}</span>
                  <span className="shrink-0 tabular-nums font-medium">
                    {formatQuantity(entry.quantity)} {entry.unit}
                  </span>
                </span>
                {entry.detail && <span className="mt-1 block text-xs leading-relaxed text-stone-500">{entry.detail}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <ul className="space-y-1 text-xs leading-relaxed text-stone-500">
        {estimate.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  )
}

function formatQuantity(value) {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(2).replace(/0$/, '').replace('.', ',')
}

function SectionTitle({ icon: Icon, label }) {
  return (
    <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">
      <Icon size={14} />
      {label}
    </h2>
  )
}
