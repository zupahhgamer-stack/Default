import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext.jsx'
import { getMap } from '../data/maps/index.js'
import { fetchQuests } from '../api/tarkovApi.js'
import { planRoute } from '../utils/astar.js'
import MapView from '../components/MapView.jsx'

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

  useEffect(() => {
    fetchQuests().then((res) => setQuests(res.quests))
  }, [])

  const spawnOptions = useMemo(
    () => (map ? map.nodes.filter((n) => n.type === 'spawn' && (n.faction === 'shared' || n.faction === mode)) : []),
    [map, mode],
  )
  const extractOptions = useMemo(
    () => (map ? map.nodes.filter((n) => n.type === 'extract' && (n.faction === 'shared' || n.faction === mode)) : []),
    [map, mode],
  )

  const selectedQuests = useMemo(
    () => quests.filter((q) => selectedQuestIds.includes(q.id) && (q.maps.length === 0 || q.maps.includes(mapId))),
    [quests, selectedQuestIds, mapId],
  )

  const waypointIds = useMemo(() => {
    if (!map) return []
    const ids = []
    for (const q of selectedQuests) {
      for (const obj of q.objectives) {
        if (obj.mapNodeHint && map.nodes.some((n) => n.id === obj.mapNodeHint) && !ids.includes(obj.mapNodeHint)) {
          ids.push(obj.mapNodeHint)
        }
      }
    }
    return ids
  }, [map, selectedQuests])

  const route = useMemo(() => {
    if (!map || !spawnId || !extractId) return null
    return planRoute(map, spawnId, waypointIds, extractId, { safety, avoidKeyLocked })
  }, [map, spawnId, extractId, waypointIds, safety, avoidKeyLocked])

  const nodesById = useMemo(() => new Map(map ? map.nodes.map((n) => [n.id, n]) : []), [map])

  const keyLockedOnRoute = useMemo(
    () => (route?.path ?? []).map((id) => nodesById.get(id)).filter((n) => n?.requiredItem),
    [route, nodesById],
  )

  const itemsToBring = useMemo(() => {
    const items = new Map()
    for (const q of selectedQuests) {
      for (const obj of q.objectives) {
        for (const it of obj.requiredItems) {
          const key = it.name
          const existing = items.get(key)
          items.set(key, { ...it, count: Math.max(existing?.count ?? 0, it.count) })
        }
      }
      for (const key of q.requiredKeys ?? []) {
        items.set(key, { name: key, count: 1, foundInRaid: false, isKey: true })
      }
    }
    for (const n of keyLockedOnRoute) {
      items.set(n.requiredItem, { name: n.requiredItem, count: 1, foundInRaid: false, isKey: true })
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
          {map && <MapView map={map} spawnId={spawnId} extractId={extractId} route={route} onNodeClick={handleNodeClick} />}
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
