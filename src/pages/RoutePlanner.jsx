import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext.jsx'
import { getMap } from '../data/maps/index.js'
import { fetchQuests } from '../api/tarkovApi.js'
import { planRoute } from '../utils/astar.js'
import MapView from '../components/MapView.jsx'

// A node's percent-space distance to its nearest neighbor, scaled down to
// roughly match the hand-tuned `dist` units already used on the graph's
// real edges (see src/data/maps/*.js) — approximate by construction, since
// there's no walkable-path data for a straight-line API point.
const REAL_NODE_EDGE_SCALE = 0.15

function buildEffectiveMap(map, selectedQuests, mapId) {
  if (!map) return map
  const extraNodes = []
  const seen = new Set()

  for (const q of selectedQuests) {
    for (const obj of q.objectives) {
      if (obj.realPosition?.mapId !== mapId) continue
      const nodeId = `real_${obj.id}`
      if (seen.has(nodeId)) continue
      seen.add(nodeId)
      extraNodes.push({
        id: nodeId,
        name: obj.description?.length > 40 ? `${obj.description.slice(0, 37)}…` : obj.description || 'Objective',
        type: 'landmark',
        x: obj.realPosition.x,
        y: obj.realPosition.y,
        danger: 3,
        faction: 'shared',
        requiredItem: null,
        isRealPosition: true,
      })
    }
  }

  if (extraNodes.length === 0) return map

  const extraEdges = extraNodes.map((node) => {
    let nearest = null
    let nearestDist = Infinity
    for (const base of map.nodes) {
      const d = Math.hypot(base.x - node.x, base.y - node.y)
      if (d < nearestDist) {
        nearestDist = d
        nearest = base
      }
    }
    return { from: node.id, to: nearest.id, dist: Math.max(1, nearestDist * REAL_NODE_EDGE_SCALE) }
  })

  return { ...map, nodes: [...map.nodes, ...extraNodes], edges: [...map.edges, ...extraEdges] }
}

export default function RoutePlanner() {
  const {
    mode,
    mapId,
    selectedQuestIds,
    safety,
    setSafety,
    avoidKeyLocked,
    setAvoidKeyLocked,
    spawnId,
    setSpawnId,
    extractId,
    setExtractId,
  } = useAppState()

  const map = getMap(mapId)
  const [quests, setQuests] = useState([])
  const [mapEntities, setMapEntities] = useState({})

  useEffect(() => {
    fetchQuests().then((res) => {
      setQuests(res.quests)
      setMapEntities(res.mapEntities ?? {})
    })
  }, [])

  const spawnOptions = useMemo(
    () => (map ? map.nodes.filter((n) => n.type === 'spawn' && (n.faction === 'shared' || n.faction === mode)) : []),
    [map, mode],
  )
  const extractOptions = useMemo(
    () => (map ? map.nodes.filter((n) => n.type === 'extract' && (n.faction === 'shared' || n.faction === mode)) : []),
    [map, mode],
  )
  const usingRealMapData = mapEntities?.[mapId]

  const selectedQuests = useMemo(
    () => quests.filter((q) => selectedQuestIds.includes(q.id) && (q.maps.length === 0 || q.maps.includes(mapId))),
    [quests, selectedQuestIds, mapId],
  )

  // Quest objectives with a real in-game position (from the live tarkov.dev
  // API, see src/api/tarkovApi.js) get inserted as their own node at that
  // exact spot, wired into the hand-built graph via a nearest-neighbor edge
  // to whatever known node sits closest — since the API gives us a point,
  // not a walkable path to it. Objectives without real position data (API
  // unreachable, or the objective has no physical location) fall back to
  // the old hand-picked `mapNodeHint`, which only the bundled fallback
  // quests carry. This is what lets ANY quest with live zone data become a
  // routable waypoint, not just the handful pinned by hand.
  const effectiveMap = useMemo(() => buildEffectiveMap(map, selectedQuests, mapId), [map, selectedQuests, mapId])

  const waypointIds = useMemo(() => {
    if (!effectiveMap) return []
    const ids = []
    for (const q of selectedQuests) {
      for (const obj of q.objectives) {
        const realId = obj.realPosition?.mapId === mapId ? `real_${obj.id}` : null
        const id =
          realId && effectiveMap.nodes.some((n) => n.id === realId)
            ? realId
            : obj.mapNodeHint && effectiveMap.nodes.some((n) => n.id === obj.mapNodeHint)
              ? obj.mapNodeHint
              : null
        if (id && !ids.includes(id)) ids.push(id)
      }
    }
    return ids
  }, [effectiveMap, selectedQuests, mapId])

  const route = useMemo(() => {
    if (!effectiveMap || !spawnId || !extractId) return null
    return planRoute(effectiveMap, spawnId, waypointIds, extractId, { safety, avoidKeyLocked })
  }, [effectiveMap, spawnId, extractId, waypointIds, safety, avoidKeyLocked])

  const nodesById = useMemo(() => new Map(effectiveMap ? effectiveMap.nodes.map((n) => [n.id, n]) : []), [effectiveMap])

  const keyLockedOnRoute = useMemo(
    () => (route?.path ?? []).map((id) => nodesById.get(id)).filter((n) => n?.requiredItem),
    [route, nodesById],
  )

  const itemsToBring = useMemo(() => {
    // Keyed case-insensitively so "ZB-013 key" (a quest's required item) and
    // "ZB-013 Key" (the same item named on a node) collapse into one row.
    const items = new Map()
    const upsert = (name, extra) => {
      const dedupeKey = name.toLowerCase()
      const existing = items.get(dedupeKey)
      items.set(dedupeKey, { name: existing?.name ?? name, count: 1, foundInRaid: false, ...existing, ...extra })
    }
    for (const q of selectedQuests) {
      for (const obj of q.objectives) {
        for (const it of obj.requiredItems) {
          upsert(it.name, { count: Math.max(items.get(it.name.toLowerCase())?.count ?? 0, it.count), foundInRaid: it.foundInRaid })
        }
      }
      for (const key of q.requiredKeys ?? []) {
        upsert(key, { isKey: true })
      }
    }
    for (const n of keyLockedOnRoute) {
      upsert(n.requiredItem, { isKey: true })
    }
    return [...items.values()]
  }, [selectedQuests, keyLockedOnRoute])

  function handleNodeClick(node) {
    if (node.type === 'spawn') setSpawnId(node.id)
    if (node.type === 'extract') setExtractId(node.id)
  }

  if (!map) {
    return (
      <div className="screen">
        <div className="empty-state">
          No map selected.{' '}
          <Link className="back-link" to="/map">
            Choose a map
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell" style={{ height: '100vh' }}>
      <div className="hud-bar">
        <div className="hud-title">
          RAIDPLAN // {map.name} // {mode?.toUpperCase()}
        </div>
        <div className="hud-meta">
          <span>{selectedQuests.length} objective(s) tracked</span>
          <span>{usingRealMapData ? 'GPS: live coordinates' : 'GPS: approximate graph'}</span>
          <Link className="back-link" to="/quests">
            &laquo; Objectives
          </Link>
          <Link className="back-link" to="/">
            Main Menu
          </Link>
        </div>
      </div>

      <div className="planner-layout" style={{ flex: 1, minHeight: 0 }}>
        <div className="planner-map-pane">
          {effectiveMap && (
            <MapView map={effectiveMap} spawnId={spawnId} extractId={extractId} route={route} onNodeClick={handleNodeClick} />
          )}
        </div>

        <div className="planner-sidebar">
          <div className="sidebar-section">
            <h3>Route Endpoints</h3>
            <div className="node-select-row">
              <label>Spawn Point</label>
              <select value={spawnId ?? ''} onChange={(e) => setSpawnId(e.target.value || null)}>
                <option value="">— Select spawn —</option>
                {spawnOptions.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="node-select-row">
              <label>Extract Point</label>
              <select value={extractId ?? ''} onChange={(e) => setExtractId(e.target.value || null)}>
                <option value="">— Select extract —</option>
                {extractOptions.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                    {n.requiredItem ? ` (needs ${n.requiredItem})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <p style={{ fontSize: 10, color: 'var(--text-faint)', margin: 0 }}>
              Tip: click a spawn or extract marker on the map to set it directly.
            </p>
          </div>

          <div className="sidebar-section">
            <h3>Route Weighting</h3>
            <div className="slider-row">
              <div className="slider-labels">
                <span>Shortest</span>
                <span>Safest</span>
              </div>
              <input type="range" min={0} max={1} step={0.05} value={safety} onChange={(e) => setSafety(Number(e.target.value))} />
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Access</h3>
            <div className="toggle-row">
              <div>
                <div className="toggle-label">Avoid key-locked doors/extracts</div>
                <div className="toggle-sub">Excludes nodes requiring an item you may not have</div>
              </div>
              <button className={`switch ${avoidKeyLocked ? 'on' : ''}`} onClick={() => setAvoidKeyLocked((v) => !v)}>
                <span className="knob" />
              </button>
            </div>
          </div>

          {waypointIds.length > 0 && (
            <div className="sidebar-section">
              <h3>Quest Waypoints</h3>
              <div className="waypoint-list">
                {waypointIds.map((id, i) => {
                  const node = nodesById.get(id)
                  return (
                    <div className="waypoint-item" key={id}>
                      <span className="num">{i + 1}</span>
                      <span className="name">{node?.name ?? id}</span>
                      {node?.isRealPosition && <span className="req" style={{ color: 'var(--accent)' }}>GPS</span>}
                      {node?.requiredItem && <span className="req">🔒</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="sidebar-section">
            <h3>Route Summary</h3>
            {route ? (
              <div className="route-summary">
                <div>
                  Distance: <span className="value">{route.totalDist.toFixed(0)}</span> units over{' '}
                  <span className="value">{route.legs.length}</span> leg(s)
                </div>
                <div>
                  Avg danger exposure:{' '}
                  <span className="value">
                    {(
                      (route.path.reduce((sum, id) => sum + (nodesById.get(id)?.danger ?? 0), 0) / route.path.length) || 0
                    ).toFixed(1)}
                    /10
                  </span>
                </div>
                {keyLockedOnRoute.length > 0 && (
                  <div className="warn-line">
                    ⚠ Route crosses {keyLockedOnRoute.length} key-locked point(s): {keyLockedOnRoute.map((n) => n.name).join(', ')}
                  </div>
                )}
                {route.unreachable.length > 0 && (
                  <div className="warn-line">
                    ⚠ Unreachable with current settings: {route.unreachable.map((id) => nodesById.get(id)?.name ?? id).join(', ')}
                  </div>
                )}
              </div>
            ) : (
              <div className="route-summary">Select a spawn and extract to compute a route.</div>
            )}
          </div>

          {itemsToBring.length > 0 && (
            <div className="sidebar-section">
              <h3>What To Bring</h3>
              <div className="waypoint-list">
                {itemsToBring.map((it) => (
                  <div className="waypoint-item" key={it.name}>
                    <span className="name">
                      {it.isKey ? '🔑 ' : ''}
                      {it.name}
                      {it.count > 1 ? ` x${it.count}` : ''}
                    </span>
                    {it.foundInRaid && <span className="req">FIR</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#6c9a5e' }} /> Spawn
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#c9a961' }} /> Extract
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#8c8a76' }} /> Landmark
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: 'var(--danger)' }} /> High danger (6+)
        </span>
        <span className="legend-item">🔒 Key/item required</span>
      </div>
    </div>
  )
}
