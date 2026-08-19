import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext.jsx'
import { getMap } from '../data/maps/index.js'
import { fetchQuests } from '../api/tarkovApi.js'

const SOURCE_LABEL = {
  live: 'LIVE — api.tarkov.dev',
  cache: 'CACHED — last synced from api.tarkov.dev',
  fallback: 'OFFLINE SNAPSHOT — api.tarkov.dev unreachable',
}

export default function QuestSelect() {
  const { mode, mapId, selectedQuestIds, toggleQuest } = useAppState()
  const navigate = useNavigate()
  const map = getMap(mapId)

  const [status, setStatus] = useState({ quests: [], source: null, error: null, loading: true })

  useEffect(() => {
    let cancelled = false
    fetchQuests().then((res) => {
      if (!cancelled) setStatus({ ...res, loading: false })
    })
    return () => {
      cancelled = true
    }
  }, [])

  function refresh() {
    setStatus((s) => ({ ...s, loading: true }))
    fetchQuests({ forceRefresh: true }).then((res) => setStatus({ ...res, loading: false }))
  }

  const mapQuests = useMemo(() => {
    if (!mapId) return []
    return status.quests.filter((q) => q.maps.length === 0 || q.maps.includes(mapId))
  }, [status.quests, mapId])

  if (!map) {
    return (
      <div className="screen">
        <div className="empty-state">No map selected. Go back and choose one.</div>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <div>
          <span className="kicker">
            Step 3 / 4 &middot; {mode?.toUpperCase()} &middot; {map.name}
          </span>
          <h1>Select Objectives</h1>
        </div>
        <Link className="back-link" to="/map">
          &laquo; Map
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

      {mapQuests.length === 0 && !status.loading && (
        <div className="empty-state">No tracked quests for this map yet — proceed to free-route the map instead.</div>
      )}

      <div className="quest-list">
        {mapQuests.map((q) => {
          const selected = selectedQuestIds.includes(q.id)
          const items = q.objectives.flatMap((o) => o.requiredItems)
          const keys = q.requiredKeys ?? []
          return (
            <div
              key={q.id}
              className={`quest-row ${selected ? 'selected' : ''}`}
              onClick={() => toggleQuest(q.id)}
              role="checkbox"
              aria-checked={selected}
            >
              <span className="checkbox" />
              <div className="quest-info">
                <div className="quest-name">{q.name}</div>
                <div className="quest-meta">
                  Lvl {q.minPlayerLevel} &middot; {q.objectives.length} objective{q.objectives.length === 1 ? '' : 's'}
                  {items.length > 0 && <> &middot; Bring: {items.map((i) => `${i.name}${i.count > 1 ? ` x${i.count}` : ''}`).join(', ')}</>}
                </div>
              </div>
              {keys.length > 0 && <span className="key-tag">🔒 {keys.join(', ')}</span>}
              <span className="trader-tag">{q.trader}</span>
            </div>
          )
        })}
      </div>

      <div className="quest-select-footer">
        <button className="primary-btn" onClick={() => navigate('/planner')}>
          Plan Route ({selectedQuestIds.length} objective{selectedQuestIds.length === 1 ? '' : 's'}) &raquo;
        </button>
      </div>
    </div>
  )
}
