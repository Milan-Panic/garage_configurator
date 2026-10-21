export const DEFAULT_PRICES = [
  { id: 'post-80x80x2', group: 'Metalna konstrukcija', name: 'Kutija 80×80×2', unit: 'm', price: 980 },
  { id: 'post-80x80x3', group: 'Metalna konstrukcija', name: 'Kutija 80×80×3', unit: 'm', price: 1350 },
  { id: 'post-100x100x3', group: 'Metalna konstrukcija', name: 'Kutija 100×100×3', unit: 'm', price: 1750 },
  { id: 'box-80x40x3', group: 'Metalna konstrukcija', name: 'Kutija 80×40×3', unit: 'm', price: 1100 },
  { id: 'box-80x40x2', group: 'Metalna konstrukcija', name: 'Kutija 80×40×2', unit: 'm', price: 820 },
  { id: 'box-60x40x2', group: 'Metalna konstrukcija', name: 'Kutija 60×40×2', unit: 'm', price: 690 },
  { id: 'box-40x40x2', group: 'Metalna konstrukcija', name: 'Kutija 40×40×2', unit: 'm', price: 480 },
  { id: 'screw', group: 'Metalna konstrukcija', name: 'Samorez 4,8×35', unit: 'kom', price: 4 },
  { id: 'anchor', group: 'Metalna konstrukcija', name: 'Anker za stub', unit: 'kom', price: 85 },
  { id: 'wall-m2', group: 'Zidna obloga', name: 'Lim ili daska', unit: 'm²', price: 1650 },
  { id: 'masonry-m2', group: 'Zidna obloga', name: 'Zidana obloga', unit: 'm²', price: 4200 },
  { id: 'sheet-m2', group: 'Krov', name: 'Limeni pokrivač', unit: 'm²', price: 1900 },
  { id: 'tile-m2', group: 'Krov', name: 'Crep, šindra ili vlaknocement', unit: 'm²', price: 2600 },
  { id: 'ridge-m', group: 'Krov', name: 'Slemenska opšivka', unit: 'm', price: 950 },
  { id: 'gutter-m', group: 'Oluk', name: 'Polukružni oluk', unit: 'm', price: 1450 },
  { id: 'downpipe', group: 'Oluk', name: 'Olučna cev', unit: 'kom', price: 2800 },
  { id: 'cement-bag', group: 'Betonska ploča', name: 'Cement 50 kg', unit: 'vreća', price: 950 },
  { id: 'gravel-m3', group: 'Betonska ploča', name: 'Šljunak', unit: 'm³', price: 3200 },
  { id: 'sand-m3', group: 'Betonska ploča', name: 'Pesak', unit: 'm³', price: 2800 },
  { id: 'rebar-kg', group: 'Betonska ploča', name: 'Armatura / mreža', unit: 'kg', price: 165 },
  { id: 'roller-m2', group: 'Rolo vrata', name: 'Rolo vrata po površini otvora', unit: 'm²', price: 32000 },
  { id: 'window-m2', group: 'Stolarija', name: 'Prozor po površini', unit: 'm²', price: 22000 },
  { id: 'swing-m2', group: 'Stolarija', name: 'Krilna garažna vrata po površini', unit: 'm²', price: 18000 },
  { id: 'pedestrian', group: 'Stolarija', name: 'Bočna pešačka vrata', unit: 'kom', price: 28000 },
]

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

export function orientationQuote(scene, estimate, catalog) {
  const priceOf = (id) => {
    const found = catalog.find((item) => item.id === id)
    return found ? Number(found.price) || 0 : 0
  }
  const groups = {}
  function add(skill, name, quantity, unit, unitPrice) {
    if (!quantity || !unitPrice) return
    if (!groups[skill]) groups[skill] = { items: [], total: 0 }
    const total = Math.round(quantity * unitPrice)
    groups[skill].items.push({
      name,
      quantity: Math.round(quantity * 100) / 100,
      unit,
      unitPrice,
      total,
    })
    groups[skill].total += total
  }

  estimate.lines.forEach((entry) => {
    if (!entry.priceId) return
    add(entry.skill, entry.item, entry.meters ?? entry.quantity, entry.priceUnit || entry.unit, priceOf(entry.priceId))
  })

  const windowArea = (scene.windows || []).reduce((sum, item) => sum + item.width * item.height, 0)
  add('stolarija', 'Prozori po površini otvora', windowArea, 'm²', priceOf('window-m2'))
  add('stolarija', 'Bočna pešačka vrata', (scene.pedestrianDoors || []).length, 'kom', priceOf('pedestrian'))
  if (scene.door?.style === 'roller') {
    add('rolo', 'Rolo vrata po površini otvora', scene.door.width * scene.door.height, 'm²', priceOf('roller-m2'))
  } else if (scene.door && scene.door.style !== 'none') {
    add('stolarija', 'Krilna vrata po površini otvora', scene.door.width * scene.door.height, 'm²', priceOf('swing-m2'))
  }
  return groups
}

export function formatDin(value) {
  return `${Math.round(value).toLocaleString('sr-RS')} RSD`
}
