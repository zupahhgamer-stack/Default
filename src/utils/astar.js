// A* pathfinding over a map's node graph.
//
// `safety` is 0 (shortest, ignore danger) .. 1 (safest, minimize danger contact).
// Edge cost blends physical distance with the danger of the node being entered,
// so the slider trades raw travel distance against PMC/boss contact risk.
// `avoidKeyLocked` removes any node that requires an item/key from the graph
// entirely, so routes never cross a locked door or use a locked extract.

function buildAdjacency(map, { avoidKeyLocked }) {
  const blocked = new Set()
  if (avoidKeyLocked) {
    for (const node of map.nodes) {
      if (node.requiredItem) blocked.add(node.id)
    }
  }

  const adjacency = new Map()
  for (const node of map.nodes) adjacency.set(node.id, [])

  for (const edge of map.edges) {
    if (blocked.has(edge.from) || blocked.has(edge.to)) continue
    adjacency.get(edge.from)?.push(edge)
    adjacency.get(edge.to)?.push({ from: edge.to, to: edge.from, dist: edge.dist })
  }

  return { adjacency, blocked }
}

function edgeCost(map, nodesById, edge, safety) {
  const target = nodesById.get(edge.to)
  const dangerPenalty = (target?.danger ?? 0) * edge.dist * 1.5
  return edge.dist * (1 - safety) + dangerPenalty * safety
}

function heuristic(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy) * 0.15
}

/** Find a single A* path between two node ids. Returns { path: string[], cost, dist } or null. */
export function findPath(map, startId, goalId, { safety = 0.5, avoidKeyLocked = false } = {}) {
  const nodesById = new Map(map.nodes.map((n) => [n.id, n]))
  const start = nodesById.get(startId)
  const goal = nodesById.get(goalId)
  if (!start || !goal) return null
  if (avoidKeyLocked && (start.requiredItem || goal.requiredItem)) return null

  const { adjacency } = buildAdjacency(map, { avoidKeyLocked })

  const open = new Set([startId])
  const cameFrom = new Map()
  const gScore = new Map([[startId, 0]])
  const fScore = new Map([[startId, heuristic(start, goal)]])
  const realDist = new Map([[startId, 0]])

  while (open.size > 0) {
    let current = null
    let currentF = Infinity
    for (const id of open) {
      const f = fScore.get(id) ?? Infinity
      if (f < currentF) {
        currentF = f
        current = id
      }
    }

    if (current === goalId) {
      const path = [current]
      let cur = current
      while (cameFrom.has(cur)) {
        cur = cameFrom.get(cur)
        path.unshift(cur)
      }
      return { path, cost: gScore.get(goalId), dist: realDist.get(goalId) }
    }

    open.delete(current)
    const neighbors = adjacency.get(current) ?? []
    for (const edge of neighbors) {
      const tentativeG = (gScore.get(current) ?? Infinity) + edgeCost(map, nodesById, edge, safety)
      if (tentativeG < (gScore.get(edge.to) ?? Infinity)) {
        cameFrom.set(edge.to, current)
        gScore.set(edge.to, tentativeG)
        realDist.set(edge.to, (realDist.get(current) ?? 0) + edge.dist)
        fScore.set(edge.to, tentativeG + heuristic(nodesById.get(edge.to), goal))
        open.add(edge.to)
      }
    }
  }

  return null
}

/**
 * Chain a route through an ordered list of waypoint node ids (quest objectives),
 * ending at the extract. Runs A* leg-by-leg and concatenates the results.
 * Returns { path, legs, totalDist, totalCost, unreachable } or null if the
 * start/extract themselves are unreachable/invalid.
 */
export function planRoute(map, startId, waypointIds, extractId, options = {}) {
  const stops = [startId, ...waypointIds.filter((id) => id !== startId), extractId]
  const legs = []
  let fullPath = []
  let totalDist = 0
  let totalCost = 0
  const unreachable = []

  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i]
    const to = stops[i + 1]
    if (from === to) continue
    const leg = findPath(map, from, to, options)
    if (!leg) {
      unreachable.push(to)
      continue
    }
    legs.push({ from, to, ...leg })
    totalDist += leg.dist
    totalCost += leg.cost
    const pathToAppend = fullPath.length > 0 ? leg.path.slice(1) : leg.path
    fullPath = fullPath.concat(pathToAppend)
  }

  if (fullPath.length === 0) return null
  return { path: fullPath, legs, totalDist, totalCost, unreachable }
}
