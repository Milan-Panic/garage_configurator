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
      const stress = (moment * 1000) / profile.modulus
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
          const flexural = (moment * 1000) / profile.modulus
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
