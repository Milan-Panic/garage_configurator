// Paketi su celine koje jedna firma nudi komplet, da kupac ne skuplja lim i šrafove sa više strana.
export const PACKAGES = [
  { id: 'konstrukcija', name: 'Konstrukcija', detail: 'Profili, ankeri i spojni materijal' },
  { id: 'omotac', name: 'Omotač', detail: 'Zidni lim i paneli, krov, opšivke, oluk, izolacija' },
  { id: 'otvori', name: 'Vrata i prozori', detail: 'Rolo, sekcijska i krilna vrata, stolarija' },
  { id: 'podloga', name: 'Ploča i pod', detail: 'Materijal za betonsku ploču i završni pod' },
  { id: 'struja', name: 'Struja', detail: 'Tabla, kablovi, rasveta, punjač, solarni paneli' },
  { id: 'oprema', name: 'Dodaci', detail: 'Nadstrešnica, ventilacija i sanitarije' },
]

const GROUP_PACKAGE = {
  'Metalna konstrukcija': 'konstrukcija',
  'Zidna obloga': 'omotac',
  Izolacija: 'omotac',
  Krov: 'omotac',
  Oluk: 'omotac',
  'Betonska ploča i pod': 'podloga',
  'Rolo i sekcijska vrata': 'otvori',
  Stolarija: 'otvori',
  Struja: 'struja',
  'Punjač i solar': 'struja',
  Dodaci: 'oprema',
}

const CATALOG = [
  { id: 'post-80x80x2', group: 'Metalna konstrukcija', name: 'Kutija 80×80×2', unit: 'm', price: 980 },
  { id: 'post-80x80x3', group: 'Metalna konstrukcija', name: 'Kutija 80×80×3', unit: 'm', price: 1350 },
  { id: 'post-100x100x3', group: 'Metalna konstrukcija', name: 'Kutija 100×100×3', unit: 'm', price: 1750 },
  { id: 'box-140x80x4', group: 'Metalna konstrukcija', name: 'Kutija 140×80×4', unit: 'm', price: 3000 },
  { id: 'box-120x60x4', group: 'Metalna konstrukcija', name: 'Kutija 120×60×4', unit: 'm', price: 2250 },
  { id: 'box-100x50x3', group: 'Metalna konstrukcija', name: 'Kutija 100×50×3', unit: 'm', price: 1500 },
  { id: 'box-80x40x3', group: 'Metalna konstrukcija', name: 'Kutija 80×40×3', unit: 'm', price: 1100 },
  { id: 'box-80x40x2', group: 'Metalna konstrukcija', name: 'Kutija 80×40×2', unit: 'm', price: 820 },
  { id: 'box-60x40x2', group: 'Metalna konstrukcija', name: 'Kutija 60×40×2', unit: 'm', price: 690 },
  { id: 'box-40x40x2', group: 'Metalna konstrukcija', name: 'Kutija 40×40×2', unit: 'm', price: 480 },
  { id: 'screw', group: 'Metalna konstrukcija', name: 'Samorez 4,8×35', unit: 'kom', price: 4 },
  { id: 'anchor', group: 'Metalna konstrukcija', name: 'Anker za stub', unit: 'kom', price: 85 },
  { id: 'trapez-t18-m2', group: 'Zidna obloga', name: 'Trapezni lim T18', unit: 'm²', price: 1650 },
  { id: 'trapez-t35-m2', group: 'Zidna obloga', name: 'Trapezni lim T35', unit: 'm²', price: 1650 },
  { id: 'trapez-dekor-m2', group: 'Zidna obloga', name: 'Trapezni lim, dekor drvo', unit: 'm²', price: 1650 },
  { id: 'sinus-m2', group: 'Zidna obloga', name: 'Sinusni lim', unit: 'm²', price: 1650 },
  { id: 'panel-m2', group: 'Zidna obloga', name: 'Sendvič panel 60 mm', unit: 'm²', price: 3400 },
  { id: 'fasadni-panel-m2', group: 'Zidna obloga', name: 'Fasadni panel 80 mm', unit: 'm²', price: 3400 },
  { id: 'wpc-m2', group: 'Zidna obloga', name: 'WPC fasadne letvice', unit: 'm²', price: 2400 },
  { id: 'seam-wall-m2', group: 'Zidna obloga', name: 'Falcovani lim na zidu', unit: 'm²', price: 3600 },
  { id: 'panel-mw-m2', group: 'Zidna obloga', name: 'Sendvič panel 100 mm, mineralna vuna', unit: 'm²', price: 4300 },
  { id: 'cassette-m2', group: 'Zidna obloga', name: 'Kasetna fasada', unit: 'm²', price: 6500 },
  { id: 'alubond-m2', group: 'Zidna obloga', name: 'Alubond ploče', unit: 'm²', price: 7500 },
  { id: 'fibercement-m2', group: 'Zidna obloga', name: 'Vlaknocementne ploče', unit: 'm²', price: 4200 },
  { id: 'polycarb-m2', group: 'Zidna obloga', name: 'Polikarbonat komorni 16 mm', unit: 'm²', price: 2900 },
  { id: 'partition-m2', group: 'Zidna obloga', name: 'Pregradni sendvič panel 50 mm', unit: 'm²', price: 2900 },
  { id: 'flashing-m', group: 'Zidna obloga', name: 'Lajsne i opšivke', unit: 'm', price: 420 },
  { id: 'wool-m2', group: 'Izolacija', name: 'Mineralna vuna 10 cm', unit: 'm²', price: 950 },
  { id: 'osb-sheet', group: 'Izolacija', name: 'OSB 12 mm, ploča 2,50×1,25', unit: 'ploča', price: 2300 },
  { id: 'roof-t35-m2', group: 'Krov', name: 'Krovni trapezni lim T35', unit: 'm²', price: 1900 },
  { id: 'roof-t18-m2', group: 'Krov', name: 'Krovni trapezni lim T18', unit: 'm²', price: 1900 },
  { id: 'limeni-crep-m2', group: 'Krov', name: 'Limeni crep', unit: 'm²', price: 1900 },
  { id: 'seam-m2', group: 'Krov', name: 'Falcovani lim', unit: 'm²', price: 3600 },
  { id: 'zinc-seam-m2', group: 'Krov', name: 'Falc, titan-cink', unit: 'm²', price: 3600 },
  { id: 'roofpanel-m2', group: 'Krov', name: 'Krovni sendvič panel', unit: 'm²', price: 4200 },
  { id: 'ondulin-m2', group: 'Krov', name: 'Bitumenska valovita ploča', unit: 'm²', price: 1900 },
  { id: 'bitumen-m2', group: 'Krov', name: 'Bitumenska traka', unit: 'm²', price: 1900 },
  { id: 'membrane-m2', group: 'Krov', name: 'EPDM membrana', unit: 'm²', price: 2900 },
  { id: 'roof-t55-m2', group: 'Krov', name: 'Krovni trapezni lim T55', unit: 'm²', price: 2300 },
  { id: 'roofpanel-mw-m2', group: 'Krov', name: 'Krovni sendvič panel, mineralna vuna', unit: 'm²', price: 5200 },
  { id: 'rooflight-m2', group: 'Krov', name: 'Svetlosna trapezna ploča', unit: 'm²', price: 2600 },
  { id: 'tpo-m2', group: 'Krov', name: 'TPO membrana', unit: 'm²', price: 3100 },
  { id: 'skylight-dome', group: 'Krov', name: 'Svetlosna kupola 1×1 m', unit: 'kom', price: 28000 },
  { id: 'skylight-strip-m2', group: 'Krov', name: 'Svetlosna traka', unit: 'm²', price: 6500 },
  { id: 'ridge-m', group: 'Krov', name: 'Slemenska opšivka', unit: 'm', price: 950 },
  { id: 'gutter-m', group: 'Oluk', name: 'Polukružni oluk', unit: 'm', price: 1450 },
  { id: 'downpipe', group: 'Oluk', name: 'Olučna cev', unit: 'kom', price: 2800 },
  { id: 'cement-bag', group: 'Betonska ploča i pod', name: 'Cement 50 kg', unit: 'vreća', price: 950 },
  { id: 'gravel-m3', group: 'Betonska ploča i pod', name: 'Šljunak', unit: 'm³', price: 3200 },
  { id: 'sand-m3', group: 'Betonska ploča i pod', name: 'Pesak', unit: 'm³', price: 2800 },
  { id: 'rebar-kg', group: 'Betonska ploča i pod', name: 'Armatura / mreža', unit: 'kg', price: 165 },
  { id: 'epoxy-m2', group: 'Betonska ploča i pod', name: 'Epoksi premaz', unit: 'm²', price: 2400 },
  { id: 'pvc-floor-m2', group: 'Betonska ploča i pod', name: 'PVC podne ploče na klik', unit: 'm²', price: 3900 },
  { id: 'ceramic-m2', group: 'Betonska ploča i pod', name: 'Industrijska keramika sa lepkom', unit: 'm²', price: 3300 },
  { id: 'polished-m2', group: 'Betonska ploča i pod', name: 'Brušenje i impregnacija betona', unit: 'm²', price: 2200 },
  { id: 'rubber-m2', group: 'Betonska ploča i pod', name: 'Gumene podne ploče', unit: 'm²', price: 3400 },
  { id: 'roller-m2', group: 'Rolo i sekcijska vrata', name: 'Rolo vrata po površini otvora', unit: 'm²', price: 32000 },
  { id: 'sectional-m2', group: 'Rolo i sekcijska vrata', name: 'Sekcijska vrata po površini otvora', unit: 'm²', price: 28000 },
  { id: 'motor', group: 'Rolo i sekcijska vrata', name: 'Motor sa daljinskim', unit: 'kom', price: 38000 },
  { id: 'window-m2', group: 'Stolarija', name: 'Prozor po površini', unit: 'm²', price: 22000 },
  { id: 'bars-m2', group: 'Stolarija', name: 'Zaštitna rešetka', unit: 'm²', price: 9000 },
  { id: 'swing-m2', group: 'Stolarija', name: 'Krilna i kipna vrata po površini', unit: 'm²', price: 18000 },
  { id: 'pedestrian', group: 'Stolarija', name: 'Bočna pešačka vrata', unit: 'kom', price: 28000 },
  { id: 'interior-door', group: 'Stolarija', name: 'Unutrašnja vrata sa štokom', unit: 'kom', price: 16000 },
  { id: 'el-board-1f', group: 'Struja', name: 'Razvodna tabla, monofazna', unit: 'kom', price: 12000 },
  { id: 'el-board-3f', group: 'Struja', name: 'Razvodna tabla, trofazna', unit: 'kom', price: 22000 },
  { id: 'el-feed-1f', group: 'Struja', name: 'Napojni kabl, monofazni', unit: 'm', price: 450 },
  { id: 'el-feed-3f', group: 'Struja', name: 'Napojni kabl, trofazni', unit: 'm', price: 850 },
  { id: 'el-cable-m', group: 'Struja', name: 'Instalacioni kabl', unit: 'm', price: 180 },
  { id: 'el-socket', group: 'Struja', name: 'Utičnica', unit: 'kom', price: 1200 },
  { id: 'el-socket-3f', group: 'Struja', name: 'Trofazna utičnica', unit: 'kom', price: 3500 },
  { id: 'el-light', group: 'Struja', name: 'LED svetiljka', unit: 'kom', price: 3500 },
  { id: 'el-switch', group: 'Struja', name: 'Prekidač', unit: 'kom', price: 900 },
  { id: 'ev-ready', group: 'Punjač i solar', name: 'Priprema za punjač', unit: 'kompl', price: 25000 },
  { id: 'ev-charger-7', group: 'Punjač i solar', name: 'Punjač 7,4 kW, monofazni', unit: 'kom', price: 90000 },
  { id: 'ev-charger-11', group: 'Punjač i solar', name: 'Punjač 11 kW, trofazni', unit: 'kom', price: 120000 },
  { id: 'pv-kw', group: 'Punjač i solar', name: 'Solarna elektrana, komplet', unit: 'kW', price: 110000 },
  { id: 'canopy-m2', group: 'Dodaci', name: 'Nadstrešnica, komplet', unit: 'm²', price: 9000 },
  { id: 'vent-grille', group: 'Dodaci', name: 'Ventilaciona rešetka', unit: 'kom', price: 2500 },
  { id: 'vent-fan', group: 'Dodaci', name: 'Zidni ventilator', unit: 'kom', price: 18000 },
  { id: 'osb22-sheet', group: 'Dodaci', name: 'OSB 22 mm, ploča 2,50×1,25', unit: 'ploča', price: 4200 },
  { id: 'railing-m', group: 'Dodaci', name: 'Čelična ograda galerije', unit: 'm', price: 6500 },
  { id: 'loft-stairs', group: 'Dodaci', name: 'Stepenice za galeriju', unit: 'kom', price: 45000 },
  { id: 'wc-set', group: 'Dodaci', name: 'Sanitarni komplet za WC', unit: 'kompl', price: 32000 },
]

export const DEFAULT_PRICES = CATALOG.map((item) => ({ ...item, pack: GROUP_PACKAGE[item.group] }))

export function packageName(id) {
  return PACKAGES.find((entry) => entry.id === id)?.name ?? id
}

export function mergePrices(saved) {
  const overrides = new Map()
  if (Array.isArray(saved)) {
    saved.forEach((item) => {
      if (item && item.id) overrides.set(item.id, Number(item.price))
    })
  }
  return DEFAULT_PRICES.map((item) => ({
    ...item,
    price: overrides.has(item.id) && Number.isFinite(overrides.get(item.id)) ? overrides.get(item.id) : item.price,
  }))
}

// Sve stavke koje imaju cenu, sa količinom u jedinici cene.
export function quoteItems(scene, estimate) {
  const items = []
  const add = (skill, name, quantity, unit, priceId) => {
    if (quantity) items.push({ skill, name, quantity, unit, priceId })
  }

  estimate.lines.forEach((entry) => {
    if (!entry.priceId) return
    add(entry.skill, entry.item, entry.meters ?? entry.quantity, entry.priceUnit || entry.unit, entry.priceId)
  })

  const units = scene.units || 1
  const windowArea = (scene.windows || []).reduce((sum, item) => sum + item.width * item.height, 0) * units
  add('stolarija', 'Prozori po površini otvora', windowArea, 'm²', 'window-m2')
  add('stolarija', 'Bočna pešačka vrata', (scene.pedestrianDoors || []).length * units + (scene.canopy?.enabled && scene.canopy.closed ? 1 : 0), 'kom', 'pedestrian')
  const door = scene.door
  if (door && door.style !== 'none') {
    const area = door.width * door.height * units
    if (door.style === 'roller') add('rolo', 'Rolo vrata po površini otvora', area, 'm²', 'roller-m2')
    else if (door.style === 'sectional') add('rolo', 'Sekcijska vrata po površini otvora', area, 'm²', 'sectional-m2')
    else add('stolarija', door.style === 'tilt' ? 'Kipna vrata po površini otvora' : 'Krilna vrata po površini otvora', area, 'm²', 'swing-m2')
  }
  return items
}

export function orientationQuote(scene, estimate, catalog) {
  const groups = {}
  quoteItems(scene, estimate).forEach((item) => {
    const unitPrice = Number(catalog.find((entry) => entry.id === item.priceId)?.price) || 0
    if (!unitPrice) return
    if (!groups[item.skill]) groups[item.skill] = { items: [], total: 0 }
    const total = Math.round(item.quantity * unitPrice)
    groups[item.skill].items.push({
      name: item.name,
      quantity: Math.round(item.quantity * 100) / 100,
      unit: item.unit,
      unitPrice,
      total,
    })
    groups[item.skill].total += total
  })
  return groups
}

export function quoteTotal(groups) {
  return Object.values(groups).reduce((sum, group) => sum + group.total, 0)
}

export function formatDin(value) {
  return `${Math.round(value).toLocaleString('sr-RS')} RSD`
}
