import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchLootLocations } from '../api/lootApi.js'
import { getMap, MAP_LIST } from '../data/maps/index.js'
import MapView from '../components/MapView.jsx'

const SOURCE_LABEL = {
  live: 'LIVE — api.tarkov.dev',
  cache: 'CACHED — last successful sync',
  fallback: 'OFFLINE SNAPSHOT — api.tarkov.dev unreachable (run `npm run sync-loot-data` to refresh this snapshot)',
}

const MAX_MARKERS_SHOWN = 120

export default function ItemFinder() {
  const [status, setStatus] = useState({ items: [], source: null, error: null, loading: true })
  const [query, setQuery] = useState('')
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [selectedMapId, setSelectedMapId] = useState(null)

  useEffect(() => {
    fetchLootLocations().then((res) => setStatus({ ...res, loading: false }))
  }, [])

  function refresh() {
    setStatus((s) => ({ ...s, loading: true }))
    fetchLootLocations({ forceRefresh: true }).then((res) => setStatus({ ...res, loading: false }))
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return status.items.filter((it) => it.name.toLowerCase().includes(q)).slice(0, 60)
  }, [status.items, query])

  const selectedItem = useMemo(() => status.items.find((it) => it.id === selectedItemId) ?? null, [status.items, selectedItemId])

  const spawnsByMap = useMemo(() => {
    if (!selectedItem) return {}
    const grouped = {}
    for (const s of selectedItem.spawns) {
      grouped[s.mapId] = grouped[s.mapId] ?? []
      grouped[s.mapId].push(s)
    }
    return grouped
  }, [selectedItem])

  const mapIdsWithSpawns = useMemo(() => {
    return Object.keys(spawnsByMap).sort((a, b) => spawnsByMap[b].length - spawnsByMap[a].length)
  }, [spawnsByMap])

  function selectItem(item) {
    setSelectedItemId(item.id)
    const sorted = [...item.spawns].reduce((acc, s) => {
      acc[s.mapId] = (acc[s.mapId] ?? 0) + 1
      return acc
    }, {})
    const topMap = Object.keys(sorted).sort((a, b) => sorted[b] - sorted[a])[0]
    setSelectedMapId(topMap ?? null)
  }

  const activeMap = selectedMapId ? getMap(selectedMapId) : null
  const activeSpawns = selectedMapId ? (spawnsByMap[selectedMapId] ?? []) : []
  const markers = activeSpawns.slice(0, MAX_MARKERS_SHOWN).map((s) => ({ x: s.x, y: s.y }))

  return (
    <div className="finder-screen">
      <div className="screen-header">
        <div>
          <span className="kicker">Utility</span>
          <h1>Find Item / Key</h1>
        </div>
        <Link className="back-link" to="/">
          &laquo; Main Menu
        </Link>
      </div>

      {status.source && (
        <div className={`status-banner ${status.source === 'fallback' ? 'warn' : ''}`}>
          <span>
            {SOURCE_LABEL[status.source]}
            {status.error ? ` — ${status.error}` : ''}
          </span>
          <button onClick={refresh} disabled={status.loading}>
            {status.loading ? 'Syncing…' : 'Refresh'}
          </button>
        </div>
      )}

      <div className="finder-layout">
        <div className="finder-sidebar">
          <input
            className="search-input"
            type="text"
            placeholder="Search item or key name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />

          {status.loading && status.items.length === 0 && <div className="route-summary">Loading loot data…</div>}

          {!status.loading && status.items.length === 0 && (
            <div className="route-summary">
              No loot location data available. Try running <code>npm run sync-loot-data</code> to rebuild the offline
              snapshot.
            </div>
          )}

          <div className="item-result-list">
            {results.map((it) => (
              <button
                key={it.id}
                className={`item-result-row ${it.id === selectedItemId ? 'selected' : ''}`}
                onClick={() => selectItem(it)}
              >
                <span className="name">{it.name}</span>
                <span className="count">{it.spawns.length} spawn(s)</span>
              </button>
            ))}
            {query && results.length === 0 && <div className="route-summary">No match.</div>}
          </div>
        </div>

        <div className="finder-map-pane">
          {!selectedItem && <div className="empty-state">Search for an item or key to see where it spawns.</div>}

          {selectedItem && (
            <>
              <div className="map-tabs">
                {mapIdsWithSpawns.map((id) => (
                  <button key={id} className={`map-tab ${id === selectedMapId ? 'active' : ''}`} onClick={() => setSelectedMapId(id)}>
                    {MAP_LIST.find((m) => m.id === id)?.name ?? id} ({spawnsByMap[id].length})
                  </button>
                ))}
              </div>
              {activeSpawns.length > MAX_MARKERS_SHOWN && (
                <div className="status-banner" style={{ margin: '0 0 12px' }}>
                  <span>
                    Showing {MAX_MARKERS_SHOWN} of {activeSpawns.length} spawn points on this map (very common item).
                  </span>
                </div>
              )}
              <div className="planner-map-pane finder-map-svg">
                {activeMap && <MapView map={activeMap} markers={markers} />}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
