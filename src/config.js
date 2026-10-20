export const PANEL_THICKNESS = 0.1
export const ROOF_THICKNESS = 0.12
export const ROOF_OVERHANG = 0.22
export const FLOOR_LEVEL = 0.08

export const DEFAULT_DIMENSIONS = {
  width: 6,
  length: 8,
  height: 2.6,
}

export const DIMENSION_LIMITS = {
  width: { min: 3, max: 8, step: 0.1, label: 'Širina' },
  length: { min: 4, max: 12, step: 0.1, label: 'Dužina' },
  height: { min: 2.4, max: 3.5, step: 0.1, label: 'Visina' },
}

export function clampDimension(key, value) {
  const { min, max } = DIMENSION_LIMITS[key]
  const rounded = Math.round(Number(value) * 10) / 10
  if (Number.isNaN(rounded)) return min
  return Math.min(max, Math.max(min, rounded))
}

export function formatMeters(value) {
  return `${value.toFixed(1).replace('.', ',')} m`
}
