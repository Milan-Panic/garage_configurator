// Katalog gotovih modela: kupac kreće od objekta koji liči na ono što mu treba,
// a ne od praznog platna. Model je ime, kratak opis i scena za konfigurator.
import { CAR_COLORS, CAR_PRESETS, FURNITURE_TYPES } from './layout'
import { initialScene, normalizeScene } from './scene'

export const CATEGORIES = [
  { id: 'garaze', name: 'Garaže' },
  { id: 'nadstresnice', name: 'Sa nadstrešnicom' },
  { id: 'ostave', name: 'Ostave i šupe' },
  { id: 'radionice', name: 'Radionice' },
  { id: 'servis', name: 'Auto-servis' },
  { id: 'magacini', name: 'Magacini i hale' },
  { id: 'poljoprivreda', name: 'Poljoprivreda' },
  { id: 'poslovni', name: 'Kancelarija i lokal' },
  { id: 'hobi', name: 'Teretana i druženje' },
]

let serial = 0
function item(type, x, z, rotation = 0, size = {}) {
  const spec = FURNITURE_TYPES.find((entry) => entry.id === type)
  serial += 1
  return { id: `furniture-${serial}`, type, x, z, rotation, width: spec.width, depth: spec.depth, height: spec.height, ...size }
}

function car(kind, x = 0, z = 0, color = CAR_COLORS[0]) {
  const preset = CAR_PRESETS.find((entry) => entry.id === kind)
  return { kind, color, x, z, rotation: 0, elevation: 0, length: preset.length, width: preset.width, height: preset.height }
}

function windows(...list) {
  return list.map(([type, wall, along, sill, width, height, frame = 'antracit'], index) => ({ id: `window-${index + 1}`, type, wall, along, sill, width, height, frame }))
}

const RIGHT = Math.PI / 2
const LEFT = -Math.PI / 2

// Svaki model: id, kategorija, naziv, opis u jednoj-dve rečenice i scena.
const RAW = [
  // Garaže
  {
    id: 'garaza-jedan-auto',
    category: 'garaze',
    name: 'Garaža za jedan auto',
    description: 'Najčešći izbor: auto ispod krova, sekcijska vrata i malo mesta za police uz zid.',
    scene: { buildingType: 'garaza', dimensions: { width: 3.5, length: 6, height: 2.5 }, wallMaterialId: 'trapez-t18-antracit', roofMaterialId: 'krov-trapez-antracit', doorMaterialId: 'sekcijska-antracit', roof: { kind: 'mono', pitch: 5, fall: 'back' }, door: { style: 'sectional', wall: 'front', along: 0, width: 2.5, height: 2.1 }, car: car('sedan', 0, 0.2), furniture: [item('shelf', 0, -2.75)] },
  },
  {
    id: 'garaza-sa-ostavom',
    category: 'garaze',
    name: 'Garaža sa ostavom',
    description: 'Auto napred, a uz zadnji zid regal i radni sto za alat, gume i baštu.',
    scene: { buildingType: 'garaza', dimensions: { width: 4.5, length: 7, height: 2.6 }, wallMaterialId: 'trapez-t18-srebro', roofMaterialId: 'krov-trapez-antracit', doorMaterialId: 'sekcijska-bela', roof: { kind: 'mono', pitch: 5, fall: 'back' }, door: { style: 'sectional', wall: 'front', along: -0.4, width: 2.7, height: 2.1 }, car: car('hatch', -0.5, 0.9, CAR_COLORS[1]), furniture: [item('rack', 1.4, -3, 0), item('workbench', -0.8, -3.05), item('tirerack', 1.75, 0.5, LEFT)], windows: windows(['tilt', 'right', 0, 1.7, 1, 0.5, 'bela']) },
  },
  {
    id: 'garaza-dva-auta',
    category: 'garaze',
    name: 'Garaža za dva auta',
    description: 'Široka vrata od 5 m za dva auta jedan pored drugog, sa prozorom za dnevno svetlo.',
    scene: { buildingType: 'garaza', dimensions: { width: 6, length: 6.5, height: 2.6 }, wallMaterialId: 'trapez-t18-antracit', roofMaterialId: 'krov-trapez-antracit', doorMaterialId: 'sekcijska-rebro-srebro', roof: { kind: 'duo', pitch: 12, ridge: 'length' }, door: { style: 'sectional', wall: 'front', along: 0, width: 5, height: 2.2, motor: true }, car: car('suv', -1.3, 0.3, CAR_COLORS[3]), furniture: [item('bike', 1.6, -2.6, RIGHT), item('shelf', 1.2, -3, 0)], windows: windows(['single', 'left', 0, 1.2, 0.8, 0.8]) },
  },
  {
    id: 'garaza-moderna',
    category: 'garaze',
    name: 'Moderna garaža od panela',
    description: 'Ravne fasadne ploče u grafitu, falcovani krov i motorna vrata. Izgleda kao deo kuće.',
    scene: { buildingType: 'garaza', dimensions: { width: 6, length: 6.5, height: 2.7 }, wallMaterialId: 'fasadni-panel-grafit', wallColor: '7016', roofMaterialId: 'falc-antracit', doorMaterialId: 'sekcijska-glatka-crna', roof: { kind: 'mono', pitch: 6, fall: 'back' }, door: { style: 'sectional', wall: 'front', along: 0, width: 5, height: 2.2, motor: true }, car: car('wagon', -1.2, 0.2, CAR_COLORS[4]), windows: windows(['strip', 'right', 0, 1.9, 2.4, 0.42]) },
  },
  {
    id: 'garaza-drvo',
    category: 'garaze',
    name: 'Garaža sa dekorom drveta',
    description: 'Lim koji izgleda kao drvo i crveni limeni crep. Uklapa se uz staru kuću ili vikendicu.',
    scene: { buildingType: 'garaza', dimensions: { width: 4, length: 6, height: 2.5 }, wallMaterialId: 'trapez-drvo-hrast', roofMaterialId: 'limeni-crep-crveni', doorMaterialId: 'sekcijska-hrast', roof: { kind: 'duo', pitch: 22, ridge: 'length' }, door: { style: 'sectional', wall: 'front', along: 0, width: 2.6, height: 2.1 }, car: car('hatch', 0, 0.4, CAR_COLORS[5]) },
  },
  {
    id: 'garaza-kombi',
    category: 'garaze',
    name: 'Garaža za kombi',
    description: 'Viša vrata i plafon za kombi, kamper ili pikap, sa mestom za opremu pozadi.',
    scene: { buildingType: 'garaza', dimensions: { width: 4.2, length: 7.5, height: 3.1 }, wallMaterialId: 'trapez-t18-bela', roofMaterialId: 'krov-trapez-antracit', doorMaterialId: 'rolo-bela', roof: { kind: 'mono', pitch: 5, fall: 'back' }, door: { style: 'roller', wall: 'front', along: 0, width: 2.8, height: 2.6, motor: true }, car: car('van', 0, 0.8, CAR_COLORS[2]), furniture: [item('rack', 0, -3.4)] },
  },
  {
    id: 'garaza-motori',
    category: 'garaze',
    name: 'Garaža za motore i bicikle',
    description: 'Mala garaža za motor, bicikle i kosilicu. Rolo vrata ne zauzimaju mesto unutra.',
    scene: { buildingType: 'garaza', dimensions: { width: 3, length: 4.5, height: 2.4 }, wallMaterialId: 'trapez-t18-antracit', roofMaterialId: 'krov-trapez-antracit', doorMaterialId: 'rolo-antracit', roof: { kind: 'mono', pitch: 5, fall: 'back' }, door: { style: 'roller', wall: 'front', along: 0, width: 2.2, height: 2 }, furniture: [item('motorbike', -0.5, 0, RIGHT), item('bike', 0.9, -0.6, RIGHT), item('mower', 0.8, -1.6), item('pegboard', 0, -2.1)] },
  },
  {
    id: 'garaze-u-nizu',
    category: 'garaze',
    name: 'Tri garaže u nizu',
    description: 'Niz garaža za zgradu, komšije ili izdavanje. Svaka ima svoja vrata.',
    scene: { buildingType: 'garaza', units: 3, dimensions: { width: 3.2, length: 6, height: 2.5 }, wallMaterialId: 'trapez-t18-srebro', roofMaterialId: 'krov-trapez-antracit', doorMaterialId: 'krilna-lim', roof: { kind: 'mono', pitch: 5, fall: 'back' }, door: { style: 'tilt', wall: 'front', along: 0, width: 2.4, height: 2.1 } },
  },
  {
    id: 'garaza-punjac',
    category: 'garaze',
    name: 'Garaža sa punjačem za električni auto',
    description: 'Struja, svetla i zidni punjač od 7,4 kW su već u računici.',
    scene: { buildingType: 'garaza', dimensions: { width: 4, length: 6.5, height: 2.6 }, wallMaterialId: 'sendvic-antracit', roofMaterialId: 'krovni-sendvic', doorMaterialId: 'sekcijska-antracit', insulation: 'full', roof: { kind: 'mono', pitch: 5, fall: 'back' }, door: { style: 'sectional', wall: 'front', along: 0, width: 2.6, height: 2.2, motor: true }, car: car('suv', 0, 0.3, CAR_COLORS[2]), electric: { enabled: true, sockets: 4, lights: 3, charger: 'charger' } },
  },
  // Sa nadstrešnicom
  {
    id: 'garaza-i-nadstresnica',
    category: 'nadstresnice',
    name: 'Garaža i nadstrešnica za drugi auto',
    description: 'Jedan auto u garaži, drugi ispod nadstrešnice sa strane. Jeftinije od garaže za dva.',
    scene: { buildingType: 'garaza', dimensions: { width: 3.5, length: 6, height: 2.5 }, wallMaterialId: 'trapez-t18-antracit', roofMaterialId: 'krov-trapez-antracit', doorMaterialId: 'sekcijska-antracit', roof: { kind: 'mono', pitch: 5, fall: 'back' }, door: { style: 'sectional', wall: 'front', along: 0, width: 2.5, height: 2.1 }, canopy: { enabled: true, wall: 'left', depth: 3, length: 6 }, car: car('sedan', 0, 0.2) },
  },
  {
    id: 'ostava-drvarnik',
    category: 'nadstresnice',
    name: 'Ostava sa nadstrešnicom za drva',
    description: 'Zatvorena ostava za alat i otvoren deo pozadi gde se drva suše ispod krova.',
    scene: { buildingType: 'ostava', dimensions: { width: 3, length: 4, height: 2.4 }, wallMaterialId: 'trapez-drvo-hrast', roofMaterialId: 'krov-trapez-braon', doorMaterialId: 'krilna-lim', roof: { kind: 'mono', pitch: 8, fall: 'back' }, door: { style: 'double', wall: 'front', along: 0, width: 1.6, height: 2 }, canopy: { enabled: true, wall: 'back', depth: 1.5, length: 3 }, furniture: [item('shelf', -0.8, -1.75), item('mower', 0.7, -1.2)] },
  },
  {
    id: 'garaza-nadstresnica-ispred',
    category: 'nadstresnice',
    name: 'Garaža sa nadstrešnicom ispred',
    description: 'Natkriven prostor ispred vrata za drugi auto, roštilj ili sklanjanje od kiše.',
    scene: { buildingType: 'garaza', dimensions: { width: 4, length: 6, height: 2.6 }, wallMaterialId: 'fasadni-panel-grafit', roofMaterialId: 'falc-antracit', doorMaterialId: 'sekcijska-glatka-crna', roof: { kind: 'mono', pitch: 5, fall: 'back' }, door: { style: 'sectional', wall: 'front', along: 0, width: 2.6, height: 2.1 }, canopy: { enabled: true, wall: 'front', depth: 3, length: 4 }, car: car('hatch', 0, 0.3, CAR_COLORS[4]) },
  },
  // Ostave i šupe
  {
    id: 'ostava-alat',
    category: 'ostave',
    name: 'Ostava za alat i baštu',
    description: 'Police, kosilica i mesto za lopate i creva. Dvokrilna vrata za lako unošenje.',
    scene: { buildingType: 'ostava', dimensions: { width: 3, length: 4, height: 2.4 }, wallMaterialId: 'trapez-t35-braon', roofMaterialId: 'krov-trapez-braon', doorMaterialId: 'krilna-lim', roof: { kind: 'mono', pitch: 6, fall: 'back' }, door: { style: 'double', wall: 'front', along: 0, width: 1.6, height: 2 }, furniture: [item('shelf', -0.8, -1.75), item('mower', 0.6, -1.3), item('ladder', -1.25, 0.3, RIGHT)], windows: windows(['tilt', 'left', 0, 1.6, 1, 0.5, 'bela']) },
  },
  {
    id: 'basta-kucica',
    category: 'ostave',
    name: 'Baštenska kućica',
    description: 'Dve vode, crveni crep i prozor. Lepo izgleda u dvorištu, a čuva alat i bicikle.',
    scene: { buildingType: 'ostava', dimensions: { width: 3, length: 4, height: 2.3 }, wallMaterialId: 'trapez-drvo-hrast', roofMaterialId: 'limeni-crep-crveni', doorMaterialId: 'krilna-lim', roof: { kind: 'duo', pitch: 25, ridge: 'length' }, door: { style: 'single', wall: 'front', along: 0, width: 1, height: 2 }, furniture: [item('bike', 0.8, -0.8, RIGHT), item('shelf', -0.8, -1.75)], windows: windows(['single', 'left', 0, 1, 0.8, 0.8, 'bela']) },
  },
  {
    id: 'ostava-bicikli',
    category: 'ostave',
    name: 'Ostava za bicikle i kosilicu',
    description: 'Sve što ne staje u stan: bicikli, kosilica, zimske gume i kutije.',
    scene: { buildingType: 'ostava', dimensions: { width: 4, length: 4, height: 2.4 }, wallMaterialId: 'trapez-t18-srebro', roofMaterialId: 'krov-trapez-antracit', doorMaterialId: 'rolo-srebro', roof: { kind: 'mono', pitch: 6, fall: 'back' }, door: { style: 'roller', wall: 'front', along: 0, width: 2, height: 2 }, furniture: [item('bike', -1.3, 0.2, RIGHT), item('bike', -0.6, 0.2, RIGHT), item('mower', 1, 0.6), item('tirerack', 1.2, -1.4), item('boxes', -0.6, -1.5)] },
  },
  {
    id: 'ostava-zimnica',
    category: 'ostave',
    name: 'Ostava za zimnicu',
    description: 'Izolovani zidovi, zamrzivač i police za tegle. Ne smrzava se zimi i ne greje se leti.',
    scene: { buildingType: 'ostava', dimensions: { width: 4, length: 5, height: 2.4 }, wallMaterialId: 'sendvic-bela', roofMaterialId: 'krovni-sendvic', doorMaterialId: 'krilna-sendvic', insulation: 'full', roof: { kind: 'mono', pitch: 6, fall: 'back' }, door: { style: 'single', wall: 'front', along: 1, width: 1, height: 2 }, furniture: [item('freezer', -1.2, -2), item('shelf', 0.2, -2.25), item('shelf', 1.6, -1, LEFT), item('fridge', -1.6, 0, RIGHT)], electric: { enabled: true, sockets: 3, lights: 2 } },
  },
  {
    id: 'drvarnica',
    category: 'ostave',
    name: 'Drvarnica',
    description: 'Prostor za drva sa velikim otvorom i krovom koji štiti od kiše.',
    scene: { buildingType: 'ostava', dimensions: { width: 4, length: 4, height: 2.3 }, wallMaterialId: 'trapez-t35-braon', roofMaterialId: 'krov-trapez-braon', roof: { kind: 'mono', pitch: 8, fall: 'back' }, door: { style: 'opening', wall: 'front', along: 0, width: 3, height: 2 }, furniture: [item('firewood', -1, -1.2), item('firewood', 1, -1.2)] },
  },
  // Radionice
  {
    id: 'hobi-radionica',
    category: 'radionice',
    name: 'Hobi radionica',
    description: 'Radni sto, tabla za alat, stubna bušilica i kolica. Za vikend majstore.',
    scene: { buildingType: 'radionica', dimensions: { width: 5, length: 7, height: 2.8 }, wallMaterialId: 'sendvic-antracit', roofMaterialId: 'krovni-sendvic', doorMaterialId: 'krilna-sendvic', insulation: 'full', roof: { kind: 'mono', pitch: 5, fall: 'back' }, door: { style: 'double', wall: 'front', along: 0, width: 1.8, height: 2.1 }, furniture: [item('workbench', 0, -3.1), item('pegboard', 0, -3.35), item('drillpress', 1.9, -3), item('toolchest', -1.8, -3), item('shelf', -2.2, 0, RIGHT)], windows: windows(['double', 'left', -1, 1, 1.4, 1.1], ['double', 'right', -1, 1, 1.4, 1.1]), electric: { enabled: true, phase: 'single', sockets: 8, lights: 4 } },
  },
  {
    id: 'stolarska-radionica',
    category: 'radionice',
    name: 'Stolarska radionica',
    description: 'Dovoljno mesta za ploče i mašine, regali za drvo i dobro svetlo kroz trakaste prozore.',
    scene: { buildingType: 'radionica', dimensions: { width: 6, length: 8, height: 3 }, wallMaterialId: 'sendvic-antracit', roofMaterialId: 'krovni-sendvic', doorMaterialId: 'sekcijska-antracit', insulation: 'full', roof: { kind: 'duo', pitch: 12, ridge: 'length' }, door: { style: 'sectional', wall: 'front', along: 0, width: 3, height: 2.4 }, furniture: [item('workbench', -1, -3.5, 0, { width: 2.2 }), item('rack', 2.2, -2, LEFT), item('rack', 2.2, 0, LEFT), item('drillpress', -2.4, -1.5)], windows: windows(['strip', 'left', 0, 1.9, 3, 0.5], ['strip', 'right', 0, 1.9, 3, 0.5]), electric: { enabled: true, phase: 'three', sockets: 8, lights: 6 } },
  },
  {
    id: 'bravarska-radionica',
    category: 'radionice',
    name: 'Bravarska radionica',
    description: 'Aparat za varenje, kompresor i jak radni sto. Trofazna struja i rolo vrata za materijal.',
    scene: { buildingType: 'radionica', dimensions: { width: 7, length: 9, height: 3.2 }, wallMaterialId: 'sendvic-antracit', roofMaterialId: 'krovni-sendvic', doorMaterialId: 'rolo-antracit', insulation: 'full', roof: { kind: 'mono', pitch: 6, fall: 'back' }, structure: { system: 'radionica', frameSpacing: 4 }, door: { style: 'roller', wall: 'front', along: 0, width: 3.6, height: 2.7, motor: true }, pedestrianDoors: [{ id: 'pesacka-1', wall: 'right', along: 2, width: 0.9, height: 2.05 }], furniture: [item('workbench', 0, -4.1, 0, { width: 2.2 }), item('welder', 2, -4), item('compressor', -2.6, -4), item('locker', -3, 0, RIGHT), item('extinguisher', 3.3, 3, LEFT)], windows: windows(['strip', 'left', 0, 2, 3, 0.5]), electric: { enabled: true, phase: 'three', sockets: 8, lights: 6 }, ventilation: 'fan' },
  },
  {
    id: 'garaza-radionica',
    category: 'radionice',
    name: 'Garaža i kućna radionica',
    description: 'Auto napred, a pozadi radni sto i alat. Za one koji sami popravljaju.',
    scene: { buildingType: 'radionica', dimensions: { width: 6, length: 8, height: 2.8 }, wallMaterialId: 'trapez-t18-antracit', roofMaterialId: 'krov-trapez-antracit', doorMaterialId: 'sekcijska-antracit', insulation: 'walls', roof: { kind: 'mono', pitch: 5, fall: 'back' }, door: { style: 'sectional', wall: 'front', along: -1, width: 2.7, height: 2.2 }, car: car('sedan', -1.2, 1, CAR_COLORS[0]), furniture: [item('workbench', 1, -3.55), item('pegboard', 1, -3.85), item('toolchest', 2.4, -2.4), item('locker', -2.5, -3.5)], electric: { enabled: true, phase: 'single', sockets: 6, lights: 4 } },
  },
  {
    id: 'radionica-kancelarija',
    category: 'radionice',
    name: 'Radionica sa kancelarijom',
    description: 'Radni prostor i kutak sa stolom za papire i dogovor sa mušterijom.',
    scene: { buildingType: 'radionica', dimensions: { width: 8, length: 10, height: 3.2 }, wallMaterialId: 'sendvic-antracit', roofMaterialId: 'krovni-sendvic', doorMaterialId: 'sekcijska-antracit', insulation: 'full', roof: { kind: 'duo', pitch: 10, ridge: 'length' }, door: { style: 'sectional', wall: 'front', along: -1.5, width: 3.5, height: 2.7 }, pedestrianDoors: [{ id: 'pesacka-1', wall: 'front', along: 2.6, width: 0.9, height: 2.05, glass: true }], furniture: [item('desk', 2.8, 3.8, Math.PI), item('chair', 2.8, 3.1, 0), item('workbench', -1, -4.5, 0, { width: 2.2 }), item('rack', 3.5, -2, LEFT), item('compressor', -3.4, -4.4)], windows: windows(['double', 'right', 3, 1, 1.4, 1.1], ['strip', 'left', 0, 2, 3, 0.5]), electric: { enabled: true, phase: 'three', sockets: 10, lights: 8 } },
  },
  {
    id: 'atelje',
    category: 'radionice',
    name: 'Atelje i hobi soba',
    description: 'Topao i svetao prostor za crtanje, šivenje ili modelarstvo, sa velikim prozorima.',
    scene: { buildingType: 'radionica', dimensions: { width: 4, length: 5, height: 2.7 }, wallMaterialId: 'sendvic-bela', roofMaterialId: 'krovni-sendvic', doorMaterialId: 'krilna-sendvic', insulation: 'full', roof: { kind: 'mono', pitch: 5, fall: 'back' }, door: { style: 'single', wall: 'front', along: -1, width: 1, height: 2.05 }, furniture: [item('table', 0, -0.8), item('dinchair', -0.5, -0.1, Math.PI), item('dinchair', 0.5, -0.1, Math.PI), item('shelf', 1.6, -2.25), item('armchair', -1.4, 1.6)], windows: windows(['double', 'left', 0, 0.9, 1.4, 1.2, 'bela'], ['double', 'right', 0, 0.9, 1.4, 1.2, 'bela'], ['fixed', 'front', 0.9, 0.9, 1, 1.2, 'bela']), electric: { enabled: true, sockets: 6, lights: 3 } },
  },
  // Auto-servis
  {
    id: 'servis-jedno-mesto',
    category: 'servis',
    name: 'Auto-servis za jedno mesto',
    description: 'Dvostubna dizalica, kompresor i radni sto. Visina 3,5 m za pun hod dizalice.',
    scene: { buildingType: 'radionica', dimensions: { width: 5, length: 8, height: 3.8 }, wallMaterialId: 'sendvic-antracit', roofMaterialId: 'krovni-sendvic', doorMaterialId: 'sekcijska-antracit', insulation: 'full', roof: { kind: 'mono', pitch: 5, fall: 'back' }, door: { style: 'sectional', wall: 'front', along: 0, width: 3, height: 3, motor: true }, car: car('sedan', 0, 0.3, CAR_COLORS[1]), furniture: [item('lift2', 0, 0.3), item('workbench', 0, -3.6), item('compressor', 2, -3.5), item('toolchest', -1.9, -3.4)], electric: { enabled: true, phase: 'three', sockets: 8, lights: 6 } },
  },
  {
    id: 'servis-dva-mesta',
    category: 'servis',
    name: 'Auto-servis za dva mesta',
    description: 'Dve dizalice, rolo vrata sa motorom i mesto za gume i alat.',
    scene: { buildingType: 'radionica', dimensions: { width: 8, length: 9, height: 3.8 }, wallMaterialId: 'sendvic-antracit', roofMaterialId: 'krovni-sendvic', doorMaterialId: 'rolo-antracit', insulation: 'full', roof: { kind: 'mono', pitch: 5, fall: 'back' }, structure: { system: 'cz', frameSpacing: 4.5 }, door: { style: 'roller', wall: 'front', along: 0, width: 6, height: 3, motor: true }, car: car('suv', -1.9, 0.4, CAR_COLORS[3]), furniture: [item('lift2', -1.9, 0.4), item('lift4', 1.9, 0.6), item('tirerack', 3.4, -3.6, LEFT), item('workbench', 0, -4.1), item('compressor', -3.3, -4)], electric: { enabled: true, phase: 'three', sockets: 10, lights: 8 }, ventilation: 'fan' },
  },
  {
    id: 'vulkanizer',
    category: 'servis',
    name: 'Vulkanizerska radnja',
    description: 'Regali za gume, kompresor i široka vrata. Mali lokal pored puta.',
    scene: { buildingType: 'radionica', dimensions: { width: 6, length: 7, height: 3.2 }, wallMaterialId: 'trapez-t18-bela', roofMaterialId: 'krov-trapez-antracit', doorMaterialId: 'sekcijska-bela', insulation: 'walls', roof: { kind: 'mono', pitch: 5, fall: 'back' }, door: { style: 'sectional', wall: 'front', along: 0, width: 3.5, height: 2.7 }, furniture: [item('tirerack', -2.5, -2, RIGHT), item('tirerack', -2.5, 0.2, RIGHT), item('tirerack', 2.5, -2, LEFT), item('compressor', 2.4, 1.6), item('workbench', 0, -3.1)], electric: { enabled: true, phase: 'three', sockets: 6, lights: 4 } },
  },
  // Magacini i hale
  {
    id: 'mali-magacin',
    category: 'magacini',
    name: 'Mali magacin',
    description: 'Paletni regal i sekcijska vrata za viljuškar. Za robu, internet prodavnicu ili zanat.',
    scene: { buildingType: 'magacin', dimensions: { width: 6, length: 10, height: 3.2 }, wallMaterialId: 'trapez-t18-srebro', roofMaterialId: 'krov-trapez-antracit', doorMaterialId: 'sekcijska-rebro-srebro', roof: { kind: 'duo', pitch: 10, ridge: 'length' }, door: { style: 'sectional', wall: 'front', along: 0, width: 3.2, height: 2.8 }, furniture: [item('palletrack', -2.2, -2, RIGHT, { width: 2.4 }), item('palletrack', 2.2, -2, LEFT, { width: 2.4 }), item('pallet', 0, -4)], electric: { enabled: true, sockets: 4, lights: 6 } },
  },
  {
    id: 'magacin-8x12',
    category: 'magacini',
    name: 'Magacin 8 × 12 m',
    description: 'Najtraženija veličina za magacin: 96 m², dva reda regala i prolaz za viljuškar.',
    scene: { buildingType: 'magacin', dimensions: { width: 8, length: 12, height: 3.5 }, wallMaterialId: 'sinus-lim', roofMaterialId: 'krov-trapez-antracit', doorMaterialId: 'sekcijska-rebro-srebro', roof: { kind: 'duo', pitch: 12, ridge: 'length' }, door: { style: 'sectional', wall: 'front', along: 0, width: 4, height: 3 }, furniture: [item('palletrack', -3.2, -2, RIGHT, { width: 2.4 }), item('palletrack', -3.2, 1, RIGHT, { width: 2.4 }), item('palletrack', 3.2, -2, LEFT, { width: 2.4 }), item('pallet', 0, -5)], windows: windows(['strip', 'left', 0, 2.4, 4, 0.5, 'bela']), electric: { enabled: true, sockets: 4, lights: 8 } },
  },
  {
    id: 'magacin-materijal',
    category: 'magacini',
    name: 'Magacin za građevinski materijal',
    description: 'Velika rolo vrata, palete i mesto za kamion ispred. 160 m² pod krovom.',
    scene: { buildingType: 'magacin', dimensions: { width: 10, length: 16, height: 4.5 }, wallMaterialId: 'trapez-t35-braon', roofMaterialId: 'krov-trapez-t55', doorMaterialId: 'rolo-srebro', roof: { kind: 'duo', pitch: 10, ridge: 'length' }, door: { style: 'roller', wall: 'front', along: 0, width: 4.5, height: 4, motor: true }, furniture: [item('pallet', -3, -5), item('pallet', -1.5, -5), item('pallet', 1.5, -5), item('palletrack', 4.2, -2, LEFT, { width: 2.4 })], electric: { enabled: true, phase: 'three', sockets: 4, lights: 10 } },
  },
  {
    id: 'hala-12x20',
    category: 'magacini',
    name: 'Hala 12 × 20 m',
    description: 'Ramovi bez stubova u sredini, 240 m² slobodnog prostora za proizvodnju ili skladište.',
    scene: { buildingType: 'magacin', dimensions: { width: 12, length: 20, height: 5 }, wallMaterialId: 'sendvic-antracit', roofMaterialId: 'krovni-sendvic', doorMaterialId: 'sekcijska-antracit', insulation: 'full', roof: { kind: 'duo', pitch: 10, ridge: 'length' }, door: { style: 'sectional', wall: 'front', along: 0, width: 4.5, height: 4.2, motor: true }, pedestrianDoors: [{ id: 'pesacka-1', wall: 'front', along: 4, width: 1, height: 2.1 }], structure: { system: 'radionica', frameSpacing: 4 }, furniture: [item('palletrack', -5.2, -4, RIGHT, { width: 2.4 }), item('palletrack', -5.2, 0, RIGHT, { width: 2.4 }), item('pallet', 2, -7)], windows: windows(['strip', 'left', 0, 3, 6, 0.6], ['strip', 'right', 0, 3, 6, 0.6]), electric: { enabled: true, phase: 'three', sockets: 8, lights: 12 } },
  },
  // Poljoprivreda
  {
    id: 'supa-mehanizacija',
    category: 'poljoprivreda',
    name: 'Šupa za traktor i mašine',
    description: 'Visok otvor bez vrata za traktor, prikolicu i priključke. Brzo i jeftino pod krov.',
    scene: { buildingType: 'magacin', dimensions: { width: 8, length: 12, height: 4 }, wallMaterialId: 'trapez-t35-braon', roofMaterialId: 'krov-trapez-braon', roof: { kind: 'mono', pitch: 6, fall: 'back' }, structure: { system: 'cz', frameSpacing: 4.5 }, door: { style: 'opening', wall: 'front', along: 0, width: 5, height: 3.6 }, furniture: [item('barrels', 3.2, -5), item('rack', -3.3, -4, RIGHT)] },
  },
  {
    id: 'skladiste-seno',
    category: 'poljoprivreda',
    name: 'Skladište za seno i alat',
    description: 'Dve vode, prozračne rešetke i veliki otvor sa strane za utovar.',
    scene: { buildingType: 'magacin', dimensions: { width: 10, length: 15, height: 4.5 }, wallMaterialId: 'trapez-t18-srebro', roofMaterialId: 'krov-trapez-antracit', roof: { kind: 'duo', pitch: 15, ridge: 'length' }, door: { style: 'opening', wall: 'front', along: 0, width: 5, height: 4 }, ventilation: 'grilles', furniture: [item('pallet', -2, -5), item('pallet', 0, -5), item('pallet', 2, -5)] },
  },
  {
    id: 'hladnjaca',
    category: 'poljoprivreda',
    name: 'Ostava za voće i povrće',
    description: 'Beli sendvič paneli i potpuna izolacija drže stalnu temperaturu za voće, povrće i zimnicu.',
    scene: { buildingType: 'magacin', dimensions: { width: 6, length: 8, height: 3 }, wallMaterialId: 'sendvic-bela', roofMaterialId: 'krovni-sendvic', doorMaterialId: 'sekcijska-bela', insulation: 'full', roof: { kind: 'mono', pitch: 5, fall: 'back' }, door: { style: 'sectional', wall: 'front', along: 0, width: 2.5, height: 2.5 }, furniture: [item('palletrack', -2.2, -1, RIGHT, { width: 2.4 }), item('palletrack', 2.2, -1, LEFT, { width: 2.4 }), item('freezer', 0, -3.4)], electric: { enabled: true, phase: 'three', sockets: 4, lights: 4 } },
  },
  // Kancelarija i lokal
  {
    id: 'kancelarija-gradiliste',
    category: 'poslovni',
    name: 'Kancelarija na placu',
    description: 'Mala izolovana kancelarija sa stolom, stolicama i prozorom. Za gradilište ili stovarište.',
    scene: { buildingType: 'ostava', dimensions: { width: 3, length: 6, height: 2.6 }, wallMaterialId: 'sendvic-bela', roofMaterialId: 'krovni-sendvic', insulation: 'full', roof: { kind: 'mono', pitch: 4, fall: 'back' }, door: { style: 'none', wall: 'front', along: 0, width: 1, height: 2 }, pedestrianDoors: [{ id: 'pesacka-1', wall: 'right', along: 1.6, width: 0.9, height: 2.05 }], furniture: [item('desk', -0.6, -2.3), item('chair', -0.6, -1.7, Math.PI), item('cabinet', 0.9, -2.5), item('dinchair', -0.9, 1.5, RIGHT), item('table', 0, 1.5, 0, { width: 1.2, depth: 0.7 })], windows: windows(['double', 'left', -1, 1, 1.4, 1.1, 'bela'], ['single', 'front', 0, 1, 0.8, 1.1, 'bela']), electric: { enabled: true, sockets: 6, lights: 2 } },
  },
  {
    id: 'lokal-kiosk',
    category: 'poslovni',
    name: 'Mali lokal',
    description: 'Prostor za prodavnicu, kafić ili prodaju sa placa, sa velikim izlogom napred.',
    scene: { buildingType: 'ostava', dimensions: { width: 4, length: 6, height: 2.8 }, wallMaterialId: 'kasetna-fasada', roofMaterialId: 'krovni-sendvic', insulation: 'full', roof: { kind: 'mono', pitch: 4, fall: 'back' }, door: { style: 'none', wall: 'front', along: 0, width: 1, height: 2 }, pedestrianDoors: [{ id: 'pesacka-1', wall: 'front', along: 1.2, width: 1, height: 2.1, glass: true }], furniture: [item('cabinet', -1, 1.6, Math.PI, { width: 1.6 }), item('shelf', 0, -2.75, 0, { width: 2 }), item('fridge', 1.5, -2.6)], windows: windows(['fixed', 'front', -0.8, 0.6, 1.8, 1.6]), electric: { enabled: true, sockets: 8, lights: 4 } },
  },
  // Teretana i druženje
  {
    id: 'kucna-teretana',
    category: 'hobi',
    name: 'Kućna teretana',
    description: 'Traka za trčanje, klupa sa tegovima i mnogo svetla. Bez članarine, iza kuće.',
    scene: { buildingType: 'radionica', dimensions: { width: 5, length: 6, height: 2.8 }, wallMaterialId: 'sendvic-antracit', roofMaterialId: 'krovni-sendvic', doorMaterialId: 'krilna-sendvic', floor: 'gumene-ploce', insulation: 'full', roof: { kind: 'mono', pitch: 5, fall: 'back' }, door: { style: 'double', wall: 'front', along: 0, width: 1.8, height: 2.1 }, furniture: [item('treadmill', -1.6, -1.6), item('weightbench', 1, -1.8), item('shelf', 1.9, 1.6, LEFT, { width: 1 })], windows: windows(['double', 'left', 0, 1, 1.4, 1.1], ['double', 'right', 0, 1, 1.4, 1.1]), electric: { enabled: true, sockets: 4, lights: 4 }, ventilation: 'fan' },
  },
  {
    id: 'bilijar-soba',
    category: 'hobi',
    name: 'Soba za bilijar i utakmice',
    description: 'Bilijar, dvosed i TV. Mesto za društvo, odvojeno od kuće.',
    scene: { buildingType: 'radionica', dimensions: { width: 5, length: 7, height: 2.8 }, wallMaterialId: 'trapez-drvo-hrast', roofMaterialId: 'krovni-sendvic', doorMaterialId: 'krilna-sendvic', floor: 'pvc-ploce', insulation: 'full', roof: { kind: 'duo', pitch: 15, ridge: 'length' }, door: { style: 'double', wall: 'front', along: 0, width: 1.8, height: 2.1 }, furniture: [item('billiard', 0, -1.4), item('sofa', 0, 2, Math.PI), item('tv', 0, 3.2, Math.PI), item('fridge', 2, -3)], windows: windows(['double', 'left', 0, 1, 1.4, 1.1], ['double', 'right', 0, 1, 1.4, 1.1]), electric: { enabled: true, sockets: 6, lights: 4 } },
  },
  {
    id: 'letnja-kuhinja',
    category: 'hobi',
    name: 'Prostor za druženje',
    description: 'Sto za osam, frižider i fotelje. Za slave, rođendane i roštilj kad pada kiša.',
    scene: { buildingType: 'radionica', dimensions: { width: 5, length: 6, height: 2.7 }, wallMaterialId: 'trapez-drvo-hrast', roofMaterialId: 'limeni-crep-crveni', doorMaterialId: 'krilna-sendvic', floor: 'keramika', insulation: 'walls', roof: { kind: 'duo', pitch: 20, ridge: 'length' }, door: { style: 'double', wall: 'front', along: 0, width: 1.8, height: 2.1 }, canopy: { enabled: true, wall: 'front', depth: 2.5, length: 5 }, furniture: [item('table', 0, -0.8, 0, { width: 2.4, depth: 1 }), item('dinchair', -0.7, -1.6), item('dinchair', 0.7, -1.6), item('dinchair', -0.7, 0, Math.PI), item('dinchair', 0.7, 0, Math.PI), item('fridge', 2, -2.6), item('sink', 0.6, -2.65), item('armchair', -1.8, 1.9)], windows: windows(['double', 'left', 0, 1, 1.4, 1.1, 'bela'], ['double', 'right', 0, 1, 1.4, 1.1, 'bela']), electric: { enabled: true, sockets: 6, lights: 4 } },
  },
  {
    id: 'stoni-tenis',
    category: 'hobi',
    name: 'Igraonica sa stonim tenisom',
    description: 'Sto za stoni tenis, mesto za klupu i tegove. Za decu i odrasle, zimi i leti.',
    scene: { buildingType: 'radionica', dimensions: { width: 6, length: 8, height: 3 }, wallMaterialId: 'sendvic-bela', roofMaterialId: 'krovni-sendvic', doorMaterialId: 'sekcijska-bela', floor: 'gumene-ploce', insulation: 'full', roof: { kind: 'mono', pitch: 5, fall: 'back' }, door: { style: 'sectional', wall: 'front', along: 0, width: 2.6, height: 2.2 }, furniture: [item('pingpong', 0, -1.2, RIGHT), item('weightbench', 2, 2.6), item('sofa', -2.3, 2.4, RIGHT)], windows: windows(['strip', 'left', 0, 1.9, 3, 0.5, 'bela'], ['strip', 'right', 0, 1.9, 3, 0.5, 'bela']), electric: { enabled: true, sockets: 4, lights: 6 } },
  },
]

export const MODELS = RAW.map((model) => ({ ...model, scene: normalizeScene({ ...initialScene, ...model.scene }) }))

export function modelById(id) {
  return MODELS.find((model) => model.id === id) ?? null
}

export function categoryName(id) {
  return CATEGORIES.find((entry) => entry.id === id)?.name ?? id
}
