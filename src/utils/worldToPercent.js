import { MAP_CALIBRATION } from '../data/mapCalibration.js'

// Replicates tarkov.dev's Leaflet CRS pixel transform (see mapCalibration.js
// for the source) so a raw in-game world position lands in the same
// normalized space as our hand-built node graphs.
function applyRotation(x, z, rotationDegrees) {
  if (!rotationDegrees) return { x, y: z }
  const rad = (rotationDegrees * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return { x: x * cos - z * sin, y: x * sin + z * cos }
}

function worldToPixel(position, mapId) {
  const cal = MAP_CALIBRATION[mapId]
  if (!cal || !position) return null
  const [scaleX, marginX, scaleY0, marginY] = cal.transform
  const scaleY = scaleY0 * -1
  const rotated = applyRotation(position.x, position.z, cal.coordinateRotation)
  return { x: scaleX * rotated.x + marginX, y: scaleY * rotated.y + marginY }
}

/**
 * Convert a raw world position { x, y, z } into a { x, y } pair on the 0-100
 * percent scale used by our map node graphs. Returns null if we have no
 * calibration for the map or the position is missing. Clamped loosely
 * outside 0-100 so off-map positions (e.g. underground/rooftop zones with
 * odd bounds) don't silently vanish — they'll just render near an edge.
 */
export function worldToPercent(position, mapId) {
  const cal = MAP_CALIBRATION[mapId]
  const pixel = worldToPixel(position, mapId)
  if (!cal || !pixel) return null

  const [[x1, y1], [x2, y2]] = cal.bounds
  const minX = Math.min(x1, x2)
  const maxX = Math.max(x1, x2)
  const minY = Math.min(y1, y2)
  const maxY = Math.max(y1, y2)
  if (maxX === minX || maxY === minY) return null

  const xPct = ((pixel.x - minX) / (maxX - minX)) * 100
  const yPct = ((pixel.y - minY) / (maxY - minY)) * 100
  const clamp = (v) => Math.max(-15, Math.min(115, v))
  return { x: clamp(xPct), y: clamp(yPct) }
}
