import { sceneMaterials } from './materials'
import { buildEstimate } from './estimate'
import { mergePrices, orientationQuote, quoteTotal } from './prices'

const PRICES = mergePrices(null)

// Zbir po stavkama za scenu, po osnovnim cenama. Kupcu se pokazuje kao raspon.
export function modelPrice(scene) {
  return quoteTotal(orientationQuote(scene, buildEstimate(scene), PRICES))
}

// Svojstva za GarageView iz scene.
export function sceneViewProps(scene) {
  return {
    dimensions: scene.dimensions,
    ...sceneMaterials(scene),
    windows: scene.windows,
    door: scene.door,
    roof: scene.roof,
    gutters: scene.gutters !== false,
    pedestrianDoors: scene.pedestrianDoors || [],
    canopy: scene.canopy,
    scene,
  }
}
