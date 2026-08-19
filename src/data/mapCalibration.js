// Per-map world-coordinate calibration: the affine transform + rotation
// needed to convert a raw in-game position { x, y, z } (Unity world space,
// x/z = ground plane, y = height) into a normalized 0-100 map-percent
// position, matching the x/y scheme used by src/data/maps/*.js node graphs.
//
// This is a one-time pull (not live) of the `transform` / `coordinateRotation`
// / `bounds` fields from api.tarkov.dev's own frontend, which pairs this exact
// calibration with the same map SVGs bundled in public/maps/. Source:
// https://github.com/the-hideout/tarkov-dev/blob/main/src/data/maps.json
// (MIT licensed). See src/utils/worldToPercent.js for the transform math,
// reverse-engineered from that project's Leaflet CRS setup at
// https://github.com/the-hideout/tarkov-dev/blob/main/src/pages/map/index.jsx
//
// `bounds` are two opposite corners, already in the same transformed
// "pixel" space that the transform below produces (confirmed against how
// tarkov-dev itself consumes `bounds` directly as map bounds in that space).
export const MAP_CALIBRATION = {
  customs: { transform: [0.239, 168.65, 0.239, 136.35], coordinateRotation: 180, bounds: [[698, -307], [-372, 237]] },
  factory: { transform: [1.629, 119.9, 1.629, 139.3], coordinateRotation: 90, bounds: [[77, -64.5], [-65.5, 67.4]] },
  interchange: { transform: [0.265, 150.6, 0.265, 134.6], coordinateRotation: 180, bounds: [[598, -442], [-433, 426]] },
  reserve: { transform: [0.395, 122.0, 0.395, 137.65], coordinateRotation: 180, bounds: [[289, -293], [-303, 244]] },
  shoreline: { transform: [0.16, 83.2, 0.16, 111.1], coordinateRotation: 180, bounds: [[504, -415], [-1056, 618]] },
  woods: { transform: [0.1855, 112.95, 0.1855, 167.85], coordinateRotation: 180, bounds: [[646, -914], [-761, 442]] },
  lighthouse: { transform: [0.2, 0, 0.2, 0], coordinateRotation: 180, bounds: [[515, -998], [-545, 725]] },
  streets: { transform: [0.38, 0, 0.38, 0], coordinateRotation: 180, bounds: [[323, -295], [-280, 532]] },
  lab: { transform: [0.575, 281.2, 0.575, 193.7], coordinateRotation: 270, bounds: [[-80, -477], [-287, -193]] },
  groundzero: { transform: [0.524, 167.3, 0.524, 65.1], coordinateRotation: 180, bounds: [[249, -124], [-99, 364]] },
}
