export const SKILLS = [
  { id: 'konstrukcija', name: 'Metalna konstrukcija' },
  { id: 'krov', name: 'Krovni pokrivač' },
  { id: 'oluk', name: 'Oluk' },
  { id: 'temelj', name: 'Betonska ploča' },
  { id: 'rolo', name: 'Rolo i sekcijska vrata' },
  { id: 'stolarija', name: 'Prozori, krilna i kipna vrata' },
  { id: 'struja', name: 'Struja, punjač i solar' },
  { id: 'oprema', name: 'Ventilacija' },
]

export function jobsFor(scene) {
  const jobs = [
    {
      skill: 'konstrukcija',
      title: 'Metalna konstrukcija',
      detail: 'Stubovi, venci, rogovi i pojasevi. Ne meša se sa olukom ni pločom.',
      send: true,
    },
    {
      skill: 'krov',
      title: 'Krovni pokrivač',
      detail: 'Pokrivač i sleme. Oluk ide drugim upitom.',
      send: true,
    },
  ]
  if (scene.gutters !== false) {
    jobs.push({
      skill: 'oluk',
      title: 'Oluk',
      detail: 'Uključen je u prikazu. Limari sa ovim skilom dobijaju poseban upit.',
      send: true,
    })
  }
  const finishedFloor = scene.floor && scene.floor !== 'beton'
  jobs.push({
    skill: 'temelj',
    title: finishedFloor ? 'Betonska ploča i pod' : 'Betonska ploča',
    detail: finishedFloor
      ? 'Ploča i završni pod idu istom majstoru. Upit se šalje samo ako ga ovde uključiš.'
      : 'Ploča stoji u prikazu. Upit majstoru šalje se samo ako ga ovde uključiš.',
    send: false,
  })
  const style = scene.door?.style
  if (style === 'roller' || style === 'sectional') {
    jobs.push({
      skill: 'rolo',
      title: style === 'roller' ? 'Rolo vrata' : 'Sekcijska vrata',
      detail: `Poseban upit monteru vrata. Cena ide po površini otvora${scene.door.motor ? ', motor je uključen' : ''}.`,
      send: true,
    })
  }
  const swing = style === 'single' || style === 'double' || style === 'tilt'
  const joinery = (scene.windows || []).length > 0 || (scene.pedestrianDoors || []).length > 0 || swing
  if (joinery) {
    jobs.push({
      skill: 'stolarija',
      title: 'Prozori, krilna i kipna vrata',
      detail: 'Prozori i krila po površini, bočna pešačka vrata po komadu.',
      send: true,
    })
  }
  if (scene.electric?.enabled || scene.electric?.solar > 0) {
    jobs.push({
      skill: 'struja',
      title: 'Struja',
      detail: 'Instalacija, punjač i solarni paneli, koliko je uključeno. Radi električar.',
      send: true,
    })
  }
  if (scene.ventilation && scene.ventilation !== 'none') {
    jobs.push({
      skill: 'oprema',
      title: 'Ventilacija',
      detail: 'Upit se šalje samo ako ga ovde uključiš.',
      send: false,
    })
  }
  return jobs
}

export function skillName(id) {
  return SKILLS.find((entry) => entry.id === id)?.name ?? id
}
