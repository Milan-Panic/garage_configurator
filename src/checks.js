// Provere preseka: greda, pritisnut pojas, stub i zategnuta dijagonala.
// Čelik S235, napon iz opterećenja sa faktorima do fy, ugib iz opterećenja bez
// faktora do L/200. Ovo je gruba provera, ne statički proračun po SRPS EN 1993.

export const STEEL_E = 210000
export const FY = 235

// Kutijasti profil visine h, širine b i debljine t (mm), postavljen visinom uspravno.
// Računa se sa oštrim uglovima i umanjuje 5%, jer pravi profil ima zaobljene uglove.
function box(name, priceId, h, b, t) {
  const H = h / 10
  const B = b / 10
  const T = t / 10
  const area = (B * H - (B - 2 * T) * (H - 2 * T)) * 0.95
  const inertia = ((B * H ** 3 - (B - 2 * T) * (H - 2 * T) ** 3) / 12) * 0.95
  const weak = ((H * B ** 3 - (H - 2 * T) * (B - 2 * T) ** 3) / 12) * 0.95
  return { name, priceId, area, inertia, modulus: inertia / (H / 2), radius: Math.sqrt(inertia / area), weakRadius: Math.sqrt(weak / area) }
}

const BOXES = {
  '40x40x2': box('kutija 40×40×2', 'box-40x40x2', 40, 40, 2),
  '60x40x2': box('kutija 60×40×2', 'box-60x40x2', 60, 40, 2),
  '80x40x2': box('kutija 80×40×2', 'box-80x40x2', 80, 40, 2),
  '80x40x3': box('kutija 80×40×3', 'box-80x40x3', 80, 40, 3),
  '100x50x3': box('kutija 100×50×3', 'box-100x50x3', 100, 50, 3),
  '120x60x4': box('kutija 120×60×4', 'box-120x60x4', 120, 60, 4),
  '140x80x4': box('kutija 140×80×4', 'box-140x80x4', 140, 80, 4),
  '80x80x2': box('kutija 80×80×2', 'post-80x80x2', 80, 80, 2),
  '80x80x3': box('kutija 80×80×3', 'post-80x80x3', 80, 80, 3),
  '100x100x3': box('kutija 100×100×3', 'post-100x100x3', 100, 100, 3),
  '120x120x4': box('kutija 120×120×4', 'post-120x120x4', 120, 120, 4),
}

// Katalozi su poređani od najlakšeg; provera bira prvi koji prolazi.
export const RAFTER_PROFILES = ['80x40x2', '80x40x3', '100x50x3', '120x60x4', '140x80x4'].map((id) => BOXES[id])
export const CHORD_PROFILES = ['60x40x2', '80x40x3', '100x50x3', '80x80x3', '100x100x3', '120x60x4', '140x80x4'].map((id) => BOXES[id])
export const BEAM_PROFILES = ['40x40x2', '60x40x2', '80x40x2', '80x40x3', '100x50x3', '120x60x4', '140x80x4'].map((id) => BOXES[id])
export const POST_PROFILES = ['80x80x2', '80x80x3', '100x100x3', '120x120x4'].map((id) => BOXES[id])
export const BRACE_PROFILES = ['40x40x2', '60x40x2', '80x40x2'].map((id) => BOXES[id])

export function from(catalog, name) {
  const index = catalog.findIndex((profile) => profile.name === name)
  return index > 0 ? catalog.slice(index) : catalog
}

function pick(checks, extra) {
  const fit = checks.find((entry) => entry.use <= 1) ?? checks[checks.length - 1]
  return { ...fit, ...extra, ok: fit.use <= 1 }
}

// Greda pod ravnomernim opterećenjem (kN/m): `design` sa faktorima za napon,
// `service` bez faktora za ugib. Kontinualna greda preko bar dva polja ima isti
// moment nad osloncem (qL²/8), a ugib oko upola manji od proste grede.
export function checkBeam(span, design, service, catalog, { continuous = false } = {}) {
  const L = span * 1000
  const moment = (design * span * span) / 8
  const sagFactor = continuous ? 0.5 : 1
  return pick(
    catalog.map((profile) => {
      const stress = (moment * 1000) / (profile.modulus * (profile.effective ?? 1))
      const sag = (sagFactor * 5 * service * L ** 4) / (384 * STEEL_E * profile.inertia * 1e4)
      const allowed = L / 200
      return { profile, stress, sag, allowed, use: Math.max(stress / FY, sag / allowed) }
    }),
    { span, moment, continuous },
  )
}

// Greda zadata momentom (kNm) sa faktorima i bez njih. Ugib se procenjuje kao
// M·L²/(10·EI), između ravnomernog opterećenja i sile u sredini.
export function checkBeamMoment(span, design, service, catalog) {
  const L = span * 1000
  return pick(
    catalog.map((profile) => {
      const stress = (design * 1000) / profile.modulus
      const sag = (service * 1e6 * L * L) / (10 * STEEL_E * profile.inertia * 1e4)
      const allowed = L / 200
      return { profile, stress, sag, allowed, use: Math.max(stress / FY, sag / allowed) }
    }),
    { span, moment: design },
  )
}

// Faktor izvijanja χ po SRPS EN 1993-1-1, kriva c (hladno oblikovane kutije).
export function bucklingFactor(length, radius) {
  const slenderness = (length * 100) / radius / 93.9
  const phi = 0.5 * (1 + 0.49 * (slenderness - 0.2) + slenderness ** 2)
  return Math.min(1, 1 / (phi + Math.sqrt(Math.max(0, phi * phi - slenderness ** 2))))
}

// Pritisnut pojas: sila (kN) sa izvijanjem u polju `panel` (m) i iz ravni na razmaku
// `brace` (m), plus savijanje od opterećenja `bending` (kN/m) između čvorova.
export function checkChord(force, panel, bending, brace, catalog = CHORD_PROFILES) {
  const moment = (bending * panel * panel) / 8
  return pick(
    catalog.map((profile) => {
      const chi = Math.min(bucklingFactor(panel, profile.radius), bucklingFactor(brace, profile.weakRadius))
      const axial = (force * 10) / (chi * profile.area)
      const flexural = (moment * 1000) / profile.modulus
      const stress = axial + flexural
      return { profile, chi, axial, flexural, stress, use: stress / FY }
    }),
    { force, panel, moment },
  )
}

// Stub: sila sa krova (kN) i vetar po visini (kN/m), zglob dole i gore jer zidove
// drže dijagonale. Svaka kombinacija daje svoje N i w; merodavna je najgora.
export function checkColumn(height, combos, catalog = POST_PROFILES) {
  return pick(
    catalog.map((profile) => {
      const chi = bucklingFactor(height, Math.min(profile.radius, profile.weakRadius))
      const worst = combos
        .map((combo) => {
          const moment = (combo.wall * height * height) / 8
          const axial = (combo.force * 10) / (chi * profile.area)
          const flexural = (moment * 1000) / (profile.modulus * (profile.effective ?? 1))
          return { label: combo.label, force: combo.force, moment, axial, flexural, stress: axial + flexural }
        })
        .reduce((a, b) => (b.stress > a.stress ? b : a))
      return { profile, chi, ...worst, use: worst.stress / FY }
    }),
    { height },
  )
}

// Zategnuta dijagonala. Rupa za zavrtanj i ekscentričan spoj uzimaju se kroz 80% preseka.
export function checkTie(force, catalog = BRACE_PROFILES) {
  return pick(
    catalog.map((profile) => {
      const stress = (force * 10) / (profile.area * 0.8)
      return { profile, stress, use: stress / FY }
    }),
    { force },
  )
}

// ---------------------------------------------------------------------------
// Ramovi bez rešetke: vruće valjani I profili, hladno oblikovani C/Z i cevi.
// Svaki presek ima i masu po metru (kg) i krivu izvijanja za obe ose.

const CURVE = { a: 0.21, b: 0.34, c: 0.49 }

function chiOf(length, radius, alpha) {
  const slenderness = (length * 100) / radius / 93.9
  const phi = 0.5 * (1 + alpha * (slenderness - 0.2) + slenderness ** 2)
  return Math.min(1, 1 / (phi + Math.sqrt(Math.max(0, phi * phi - slenderness ** 2))))
}

// Vruće valjani profil iz tablica: A cm², Iy cm⁴, Wy cm³, iy i iz cm, kg/m.
// Profili su klase 1, pa nose plastični moment (oko 1,13·W); to pokriva umanjenje za
// bočno izvijanje između rožnjača i kosnika, pa se računa sa elastičnim W bez umanjenja.
function rolled(name, kind, area, inertia, modulus, radius, weakRadius, kg) {
  const ipe = kind === 'ipe'
  return { name, priceId: `${kind}-${name.split(' ')[1]}`, kind: 'rolled', area, inertia, modulus, radius, weakRadius, kg, effective: 1, strong: CURVE[ipe ? 'a' : 'b'], weak: CURVE[ipe ? 'b' : 'c'] }
}

export const IPE = [
  rolled('IPE 160', 'ipe', 20.1, 869, 109, 6.58, 1.84, 15.8),
  rolled('IPE 180', 'ipe', 23.9, 1317, 146, 7.42, 2.05, 18.8),
  rolled('IPE 200', 'ipe', 28.5, 1943, 194, 8.26, 2.24, 22.4),
  rolled('IPE 220', 'ipe', 33.4, 2772, 252, 9.11, 2.48, 26.2),
  rolled('IPE 240', 'ipe', 39.1, 3892, 324, 9.97, 2.69, 30.7),
  rolled('IPE 270', 'ipe', 45.9, 5790, 429, 11.2, 3.02, 36.1),
  rolled('IPE 300', 'ipe', 53.8, 8356, 557, 12.5, 3.35, 42.2),
  rolled('IPE 330', 'ipe', 62.6, 11770, 713, 13.7, 3.55, 49.1),
]
export const HEA = [
  rolled('HEA 140', 'hea', 31.4, 1033, 155, 5.73, 3.52, 24.7),
  rolled('HEA 160', 'hea', 38.8, 1673, 220, 6.57, 3.98, 30.4),
  rolled('HEA 180', 'hea', 45.3, 2510, 294, 7.45, 4.52, 35.5),
  rolled('HEA 200', 'hea', 53.8, 3692, 389, 8.28, 4.98, 42.3),
  rolled('HEA 220', 'hea', 64.3, 5410, 515, 9.17, 5.51, 50.5),
  rolled('HEA 240', 'hea', 76.8, 7763, 675, 10.1, 6.0, 60.3),
]

// Hladno oblikovani C ili Z sa povijenim ivicama: visina h, pojas b, ivica c, debljina t (mm).
// Bruto presek po srednjoj liniji. Tanki zidovi se lokalno izbočavaju, pa se nosivost
// umanjuje po vitkosti rebra. To je procena dok ne stignu tablice proizvođača.
function formed(kind, h, b, c, t, double = false) {
  const H = h / 10
  const B = b / 10
  const C = c / 10
  const T = t / 10
  const n = double ? 2 : 1
  const single = T * (H + 2 * B + 2 * C)
  const strong = (T * H ** 3) / 12 + 2 * B * T * (H / 2) ** 2 + 2 * ((T * C ** 3) / 12 + C * T * (H / 2 - C / 2) ** 2)
  // Slaba osa jednog C: kod duplog C leđa uz leđa težište je u rebrima, pa pojasevi i
  // ivice leže na b/2 i b. Sam C ima težište oko trećine pojasa od rebra.
  const weakSingle = double
    ? 2 * ((T * B ** 3) / 12 + B * T * (B / 2) ** 2) + 2 * C * T * B ** 2
    : (2 * T * B ** 3) / 12 + 2 * B * T * (B / 6) ** 2 + 2 * C * T * ((2 * B) / 3) ** 2
  const area = n * single
  const inertia = n * strong
  const weak = n * weakSingle
  const slender = h / t
  const effective = slender > 100 ? 0.75 : slender > 70 ? 0.85 : 0.95
  const label = `${kind}${h}/${String(t).replace('.', ',')}`
  return {
    name: double ? `2×${label}` : label,
    priceId: `${kind.toLowerCase()}-${h}x${String(t).replace('.', '')}`,
    pieces: n,
    kind: 'formed',
    area,
    inertia,
    modulus: inertia / (H / 2),
    radius: Math.sqrt(inertia / area),
    weakRadius: Math.sqrt(weak / area),
    kg: area * 0.785,
    effective,
    strong: CURVE.b,
    weak: CURVE.c,
  }
}

// Rožnjače i rigle: Z na preklop, kontinualne preko oslonaca.
export const Z_PROFILES = [formed('Z', 140, 50, 15, 1.5), formed('Z', 170, 60, 18, 1.5), formed('Z', 200, 65, 20, 1.5), formed('Z', 200, 65, 20, 2), formed('Z', 250, 75, 20, 2.5)]
// Stubovi i rogovi C/Z rama: dva C profila leđa uz leđa.
export const C_FRAME_PROFILES = [
  formed('C', 150, 50, 15, 2, true),
  formed('C', 200, 65, 20, 2, true),
  formed('C', 200, 65, 20, 2.5, true),
  formed('C', 250, 75, 20, 2.5, true),
  formed('C', 300, 85, 25, 3, true),
]

// Pocinkovana okrugla cev prečnika D i debljine t (mm), za kit sisteme.
function tube(d, t) {
  const D = d / 10
  const T = t / 10
  const area = Math.PI * (D - T) * T
  const inertia = (Math.PI * (D - T) ** 3 * T) / 8
  const radius = Math.sqrt(inertia / area)
  return {
    name: `cev Ø${String(d).replace('.', ',')}×${String(t).replace('.', ',')}`,
    priceId: `tube-${Math.round(d)}x${String(t).replace('.', '')}`,
    kind: 'tube',
    area,
    inertia,
    modulus: inertia / (D / 2),
    radius,
    weakRadius: radius,
    kg: area * 0.785,
    effective: 1,
    strong: CURVE.c,
    weak: CURVE.c,
  }
}

export const TUBE_PROFILES = [tube(48.3, 2), tube(60.3, 2), tube(76.1, 2), tube(88.9, 2.5)]

// Svi preseci ramova, za cenovnik i masu po metru.
export const FRAME_SECTIONS = [...IPE, ...HEA, ...Z_PROFILES, ...C_FRAME_PROFILES, ...TUBE_PROFILES]

// Portalni ram: dva stuba sa zglobom u stopi i rog kruto vezan za stub u uglu.
// Moment u uglu od ravnomernog opterećenja q po Kleinlogelu je qL²/(4(2K+3)), gde je
// K = (I roga / I stuba)·(h/L). Vetar sa strane dodaje oko w·h²/4 u uglu.
// Kosina krova se zanemaruje, što je na strani sigurnosti za polje roga.
// Bira se najlakši par roga i stuba koji prolazi.
// Vuta je klin ispod roga u uglu, dug desetinu raspona i visok kao rog. U uglu je
// presek dvostruko viši, pa je merodavan rog na kraju vute, gde je moment manji
// za oko 0,045·qL², i stub ispod vute.
export const HAUNCH_RATIO = 0.1
export function checkPortal({ span, height, spacing, design, service, combos, rafters, columns, haunch = false }) {
  const L = span
  const h = height
  const trials = []
  rafters.forEach((rafter) => {
    columns.forEach((column) => {
      const K = (rafter.inertia / column.inertia) * (h / L)
      const corner = (q) => (q * L * L) / (4 * (2 * K + 3))
      // Rog: savijanje u uglu ili u polju, plus horizontalna sila kao pritisak.
      const cornerDesign = corner(design)
      const midDesign = (design * L * L) / 8 - cornerDesign
      const thrust = cornerDesign / h
      const atHaunch = haunch ? Math.max(0, cornerDesign - 0.045 * design * L * L) : cornerDesign
      const rafterMoment = Math.max(atHaunch, midDesign)
      // Visina roga iz poluprečnika inercije: kod I i C profila h ≈ 2,4·i.
      const below = haunch ? Math.max(0, 1 - (2.4 * rafter.radius) / 100 / h) : 1
      const rafterStress = (rafterMoment * 1000) / (rafter.modulus * rafter.effective) + (thrust * 10) / rafter.area
      const EI = STEEL_E * rafter.inertia * 1e4
      const Lmm = L * 1000
      const sag = Math.max(0, (5 * service * Lmm ** 4) / (384 * EI) - (corner(service) * 1e6 * Lmm * Lmm) / (8 * EI))
      const allowed = Lmm / 200
      const rafterUse = Math.max(rafterStress / FY, sag / allowed)
      // Stub: pritisak od krova i moment iz ugla. Ram se ljulja, pa je dužina izvijanja
      // u ravni rama 2h. Iz ravni ga drži rigla sa kosnikom na pola visine.
      const chi = Math.min(chiOf(2 * h, column.radius, column.strong), chiOf(h / 2, column.weakRadius, column.weak))
      const worst = combos
        .map((combo) => {
          const q = combo.roof * spacing
          const w = combo.wall * spacing
          const force = (q * L) / 2
          const moment = (corner(q) + (w * h * h) / 4) * below
          const stress = (force * 10) / (chi * column.area) + (moment * 1000) / (column.modulus * column.effective)
          return { label: combo.label, force, moment, stress }
        })
        .reduce((a, b) => (b.stress > a.stress ? b : a))
      const columnUse = worst.stress / FY
      trials.push({
        kg: rafter.kg * L * (haunch ? 1 + 2 * HAUNCH_RATIO : 1) + column.kg * 2 * h,
        use: Math.max(rafterUse, columnUse),
        rafter: { profile: rafter, stress: rafterStress, sag, allowed, moment: rafterMoment, corner: cornerDesign, span: L, use: rafterUse, ok: rafterUse <= 1 },
        column: { profile: column, chi, height: h, ...worst, use: columnUse, ok: columnUse <= 1 },
      })
    })
  })
  const passing = trials.filter((trial) => trial.use <= 1).sort((a, b) => a.kg - b.kg)
  const best = passing[0] ?? trials.reduce((a, b) => (b.use < a.use ? b : a))
  return { ...best, ok: best.use <= 1 }
}
