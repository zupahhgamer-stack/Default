// Shared helpers for building map node graphs.
//
// Node: { id, name, type: 'spawn'|'extract'|'landmark', x, y (0-100 viewBox units),
//         danger (0-10), faction: 'pmc'|'scav'|'shared', requiredItem: string|null }
// Edge: { from, to, dist } — dist is a plausible relative distance unit, not meters.

export function n(id, name, type, x, y, danger, faction = 'shared', requiredItem = null) {
  return { id, name, type, x, y, danger, faction, requiredItem }
}

export function e(from, to, dist) {
  return { from, to, dist }
}
