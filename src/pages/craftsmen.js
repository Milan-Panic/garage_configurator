export const SKILLS = [
  { id: 'konstrukcija', name: 'Metalna konstrukcija' },
  { id: 'krov', name: 'Krovni pokrivač' },
  { id: 'oluk', name: 'Oluk' },
  { id: 'temelj', name: 'Betonska ploča' },
  { id: 'rolo', name: 'Rolo vrata' },
  { id: 'stolarija', name: 'Prozori i krilna vrata' },
]

export const CRAFTSMEN = [
  {
    id: 'bravar-ns',
    profession: 'Bravar čelične konstrukcije',
    shop: 'Radionica okvira',
    city: 'Novi Sad',
    skills: ['konstrukcija'],
    does: 'Stubovi, venci, rogovi i zidni pojasevi po crtežu.',
  },
  {
    id: 'limar-krov',
    profession: 'Limar pokrivača',
    shop: 'Krov i opšivka',
    city: 'Beograd',
    skills: ['krov'],
    does: 'Trapez, limeni crep i slemenska opšivka. Oluk ne ulazi u ovaj upit.',
  },
  {
    id: 'limar-oluk',
    profession: 'Limar oluka',
    shop: 'Oluci na strehi',
    city: 'Beograd',
    skills: ['oluk'],
    does: 'Polukružni oluk, čela i olučne cevi.',
  },
  {
    id: 'limar-oba',
    profession: 'Limar',
    shop: 'Lim i oluk',
    city: 'Zemun',
    skills: ['krov', 'oluk'],
    does: 'Radi i krov i oluk. Svaki posao stiže kao poseban upit.',
  },
  {
    id: 'rolo-pancevo',
    profession: 'Monter rolo vrata',
    shop: 'Rolo servis',
    city: 'Pančevo',
    skills: ['rolo'],
    does: 'Rolo vrata po širini i visini otvora.',
  },
  {
    id: 'stolarija-pancevo',
    profession: 'Bravar krila i prozora',
    shop: 'Krilo i prozor',
    city: 'Pančevo',
    skills: ['stolarija'],
    does: 'Krilna garažna vrata, bočna pešačka vrata i prozori.',
  },
  {
    id: 'zidar-su',
    profession: 'Zidar',
    shop: 'Temelj i ploča',
    city: 'Subotica',
    skills: ['temelj'],
    does: 'Betonska ploča: cement, pesak, šljunak i armaturna mreža.',
  },
]

export function craftsmenWith(skill) {
  return CRAFTSMEN.filter((entry) => entry.skills.includes(skill))
}

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
  jobs.push({
    skill: 'temelj',
    title: 'Betonska ploča',
    detail: 'Ploča stoji u prikazu. Upit zidaru šalje se samo ako ga ovde uključiš.',
    send: false,
  })
  if (scene.door?.style === 'roller') {
    jobs.push({
      skill: 'rolo',
      title: 'Rolo vrata',
      detail: 'Poseban upit majstoru koji ugrađuje rolo vrata. Cena ide po površini otvora.',
      send: true,
    })
  }
  const swing = scene.door && scene.door.style !== 'none' && scene.door.style !== 'roller'
  const joinery = (scene.windows || []).length > 0 || (scene.pedestrianDoors || []).length > 0 || swing
  if (joinery) {
    jobs.push({
      skill: 'stolarija',
      title: 'Prozori i krilna vrata',
      detail: 'Prozori i krila po površini, bočna pešačka vrata po komadu.',
      send: true,
    })
  }
  return jobs
}

export function skillName(id) {
  return SKILLS.find((entry) => entry.id === id)?.name ?? id
}
