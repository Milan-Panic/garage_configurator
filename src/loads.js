// Opterećenja na jednom mestu: sopstvena težina po pokrivaču i izolaciji, sneg,
// vetar i kombinacije po SRPS EN 1990. Vrednosti su okvirne; merodavan je statičar.
import { findMaterial, ROOF_MATERIALS } from './materials'
import { snowLoad, windPressure } from './site'

// Parcijalni faktori za granično stanje nosivosti i faktori kombinacije ψ0.
export const GAMMA_G = 1.35
export const GAMMA_Q = 1.5
const PSI_SNOW = 0.5
const PSI_WIND = 0.6

// Težina pokrivača u kN/m². Sendvič sa vunom je najteži od lakih krovova.
const COVER_WEIGHT = {
  'krovni-sendvic': 0.13,
  'krovni-sendvic-mineralna': 0.22,
  'svetlosna-ploca': 0.03,
  'ondulin-crveni': 0.04,
  'ondulin-zeleni': 0.04,
  'falc-cink': 0.08,
}
const SHEET_WEIGHT = 0.06
// Membrana leži na OSB ploči od 18 mm.
const MEMBRANE_WEIGHT = 0.15
// Vuna 10 cm, parna brana i OSB 12 mm sa unutrašnje strane krova.
const LINING_WEIGHT = 0.12
// Rožnjače, nosači i spregovi krova, procena po m².
const FRAME_WEIGHT = 0.1
export const SOLAR_LOAD = 0.15

// Koeficijenti pritiska vetra. Zid: pritisak spolja i sisanje unutra. Krov: sisanje
// u opštoj zoni sa unutrašnjim pritiskom; uglovi su jači, pa to ostaje statičaru.
const WALL_PRESSURE = 1.0
const ROOF_UPLIFT = 1.2
const ANCHOR_UPLIFT = 1.0
// Ukupna sila vetra na objekat po m² zabata (pritisak i sisanje zajedno).
const FORCE_COEFFICIENT = 1.3

export function deadLoad(scene) {
  const material = findMaterial(ROOF_MATERIALS, scene.roofMaterialId)
  const cover = material.cover?.kind === 'membrane' ? MEMBRANE_WEIGHT : (COVER_WEIGHT[material.id] ?? SHEET_WEIGHT)
  const lining = scene.insulation === 'full' && !material.insulated ? LINING_WEIGHT : 0
  const solar = (scene.electric?.solar || 0) > 0 ? SOLAR_LOAD : 0
  return { cover, lining, frame: FRAME_WEIGHT, solar, total: FRAME_WEIGHT + cover + lining + solar }
}

// Sva opterećenja krova i zidova za jedan objekat, u kN/m².
export function siteLoads(scene) {
  const dead = deadLoad(scene)
  const g = dead.total
  const s = snowLoad(scene.site)
  const q = windPressure(scene.site)
  return {
    dead,
    g,
    snow: s,
    wind: q,
    // Krov odozgo: sneg je vodeće opterećenje.
    roofDesign: GAMMA_G * g + GAMMA_Q * s,
    roofService: g + s,
    // Krov odozdo: vetar diže, a sopstvena težina drži.
    upliftDesign: Math.max(0, GAMMA_Q * ROOF_UPLIFT * q - g),
    anchorUplift: Math.max(0, GAMMA_Q * ANCHOR_UPLIFT * q - g),
    // Zid: vetar na riglu i stub.
    wallDesign: GAMMA_Q * WALL_PRESSURE * q,
    wallService: WALL_PRESSURE * q,
    // Ukupna horizontalna sila po m² zabata, za dijagonale.
    bracingDesign: GAMMA_Q * FORCE_COEFFICIENT * q,
  }
}

// Stub nosi krov i vetar zajedno. Proveravaju se dve kombinacije: sneg vodeći uz
// smanjen vetar, i vetar vodeći uz smanjen sneg.
export function columnCombinations(loads) {
  return [
    { label: 'sneg', roof: GAMMA_G * loads.g + GAMMA_Q * loads.snow, wall: GAMMA_Q * PSI_WIND * WALL_PRESSURE * loads.wind },
    { label: 'vetar', roof: GAMMA_G * loads.g + GAMMA_Q * PSI_SNOW * loads.snow, wall: GAMMA_Q * WALL_PRESSURE * loads.wind },
  ]
}
