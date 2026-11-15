import { sceneMaterials } from './materials'

// Sadržaj paketa „Uradi sam” koji se sklapa iz scene i računice:
// specifikacija ploče, redosled montaže, alat i lista za nabavku.

const SLAB_THICKNESS = 0.15

const fmt = (value, digits = 2) => value.toFixed(digits).replace('.', ',')

export function slabSpec(scene, estimate) {
  const { width, length } = scene.dimensions
  const units = scene.units || 1
  const area = width * length * units
  const find = (name) => estimate.lines.find((line) => line.section === 'Temelj' && line.item.startsWith(name))
  const anchors = estimate.lines.find((line) => line.item.startsWith('Anker vijci'))
  return {
    width: width * units,
    length,
    thickness: SLAB_THICKNESS,
    area,
    volume: area * SLAB_THICKNESS,
    diagonal: Math.hypot(width * units, length),
    cement: find('Cement'),
    gravel: find('Šljunak'),
    sand: find('Pesak'),
    mesh: find('Armaturna'),
    anchors: anchors?.quantity ?? 0,
  }
}

export function assemblySteps(scene, estimate) {
  const { width, length, height } = scene.dimensions
  const units = scene.units || 1
  const { wallMaterial, roofMaterial } = sceneMaterials(scene)
  const slab = slabSpec(scene, estimate)
  const posts = estimate.lines.find((line) => line.item.startsWith('Stubovi'))?.quantity ?? 0
  const truss = Boolean(estimate.sizing?.truss)
  const rooms = scene.rooms || []
  const steps = []
  const add = (title, text) => steps.push({ title, text })

  add(
    'Obeleži osnovu',
    `Iskolči pravougaonik ${fmt(slab.width)} × ${fmt(slab.length)} m i proveri dijagonale: obe moraju biti ${fmt(slab.diagonal)} m. Razlika veća od 1 cm znači da osnova nije pod pravim uglom.`,
  )
  add(
    'Izlij ploču',
    `Skini humus, nasipaj i nabij tampon šljunka, postavi oplatu i mrežu na podmetače. Ploča je ${Math.round(SLAB_THICKNESS * 100)} cm, oko ${fmt(slab.volume)} m³ betona.${
      scene.electric?.enabled || rooms.some((room) => room.kind === 'wc') ? ' Cevi za struju, vodu i odvod polažu se pre betoniranja.' : ''
    } Beton kvasi prvih nekoliko dana i sačekaj bar 7 dana pre bušenja za ankere.`,
  )
  add(
    'Postavi stubove',
    `${posts} stubova ide na uglove, uz otvore i na pozicije sa crteža osnove. Svaki stub se ankeriše sa 2 ankera, dovodi u visak u oba pravca i privremeno podupire dok se ne povežu venci.`,
  )
  add('Poveži vence i zidne pojaseve', 'Venci idu po vrhu stubova i zatvaraju ram. Zidni pojasevi se postavljaju vodoravno između stubova, na razmaku sa crteža izgleda. Nadvratnici idu iznad svakog otvora.')
  add('Ugradi dijagonale', 'Dijagonale u krajnjim poljima zidova postavi pre krova. Bez njih skelet nije stabilan i ne sme da ostane preko noći na vetru.')
  add(
    'Podigni krovnu konstrukciju',
    truss
      ? 'Rešetkasti nosači se vare na ravnoj podlozi i podižu u komadu. Prvi nosač ukruti privremenim kosnicima, ostale veži rožnjačama redom. Na kraju ugradi krovne spregove.'
      : 'Krovni nosači idu preko kraćeg raspona na razmaku sa crteža krova. Poveži ih rožnjačama ako ih projekat ima i ugradi krovne spregove u krajnja polja.',
  )
  add(
    'Pokrij krov',
    `${roofMaterial.name}: kreni od strehe ka slemenu, sa strane suprotne od vetra koji najčešće duva. Prvu tablu postavi pod konac, jer sve ostale prate nju. Samorezi idu u svaki drugi talas, a na strehi i slemenu u svaki.`,
  )
  if (scene.gutters !== false) add('Opšivke i oluk', 'Postavi čeone i slemenske opšivke, pa kuke oluka sa padom od oko 3 mm po metru ka olučnoj cevi.')
  else add('Opšivke', 'Postavi čeone i slemenske opšivke pre zidne obloge.')
  add(
    'Obloži zidove',
    `${wallMaterial.name}: kreni od ugla, prvu tablu dovedi u visak. Otvore za vrata i prozore iseci pre dizanja table.${
      scene.insulation && scene.insulation !== 'none' ? ' Izolacija ide između pojaseva pre unutrašnje obloge, bez praznina.' : ''
    }`,
  )
  add('Ugradi vrata i prozore', 'Proveri mere otvora na licu mesta pre poručivanja. Glavna vrata ugrađuje monter, jer od podešavanja opruga i vođica zavisi garancija.')
  if (rooms.length > 0) add('Pregradi prostorije', 'Pregradni paneli idu na pod posle ploče i pre završnog poda, u U profil ankerisan u beton.')
  if (scene.electric?.enabled) add('Struja', 'Razvod, tablu i priključak radi električar sa licencom. Kablove vodi u kanalicama po konstrukciji, ne ispod lima.')
  if (scene.canopy?.enabled || (scene.ventilation && scene.ventilation !== 'none')) {
    add('Dodaci', 'Nadstrešnica se vezuje za stubove objekta i svoje stubove na posebnim stopama. Otvori za ventilaciju se seku posle oblaganja, uz opšivku oko svakog.')
  }

  const notes = []
  if (units > 1) notes.push(`Niz od ${units} jedinica se montira jedna po jedna, od jednog kraja, a zajednički zid se oblaže jednom.`)
  if (width > 8 || length > 12 || height > 3.5) notes.push('Za ove mere konstrukciju mora da potvrdi statičar pre poručivanja materijala.')
  return { steps, notes }
}

export function toolList(scene) {
  const tools = [
    'Metar od 8 m, konac, visak i libela od bar 1 m (laserski nivelir ubrzava posao)',
    'Ugaona brusilica 230 mm ili testera za metal, sa reznim pločama',
    'Aparat za zavarivanje i elektrode, ili bušilica i vijci M10 ako se konstrukcija šrafi',
    'Udarna bušilica sa burgijom za ankere',
    'Akumulatorski odvijač sa nasadnim ključem 8 mm za samoreze',
    'Makaze za lim ili nibler (brusilica pregoreva pocinkovani sloj na limu)',
    'Stege i privremeni kosnici za držanje stubova',
    'Skela ili stabilne merdevine do visine venca',
    'Mešalica ili naručen beton iz betonjerke, ravnjača i vibrator ili letva',
    'Zaštitne naočare, rukavice, maska za zavarivanje i antifoni',
  ]
  if (scene.dimensions.height > 3 || scene.dimensions.width > 7) tools.push('Dizalica ili viljuškar za podizanje krovnih nosača')
  return tools
}

const SUPPLIERS = [
  { name: 'Stovarište čelika', sections: ['Konstrukcija', 'Nadstrešnica', 'Galerija'] },
  { name: 'Limarija i paneli', sections: ['Zidovi', 'Krov', 'Izolacija', 'Oluk', 'Prostorije'] },
  { name: 'Spojni materijal i okov', sections: ['Spojni materijal'] },
  { name: 'Građevinski materijal', sections: ['Temelj', 'Pod'] },
  { name: 'Vrata i stolarija', sections: ['Vrata', 'Stolarija'] },
  { name: 'Elektro materijal', sections: ['Struja'] },
]

// Zbirna lista za nabavku: redovi računice složeni po tome gde se kupuju.
export function shoppingList(estimate) {
  const groups = SUPPLIERS.map((supplier) => ({ name: supplier.name, items: [] }))
  const other = { name: 'Ostalo', items: [] }
  estimate.lines.forEach((line) => {
    const index = SUPPLIERS.findIndex((supplier) => supplier.sections.includes(line.section))
    ;(index >= 0 ? groups[index] : other).items.push(line)
  })
  return [...groups, other].filter((group) => group.items.length > 0)
}
