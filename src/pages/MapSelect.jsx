import { useNavigate, Link } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext.jsx'
import { MAP_LIST } from '../data/maps/index.js'

export default function MapSelect() {
  const { mode, setMapId } = useAppState()
  const navigate = useNavigate()

  function choose(id) {
    setMapId(id)
    navigate('/quests')
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <div>
          <span className="kicker">Step 2 / 4 &middot; {mode ? mode.toUpperCase() : ''}</span>
          <h1>Select Map</h1>
        </div>
        <Link className="back-link" to="/mode">
          &laquo; Mode
        </Link>
      </div>

      <div className="card-grid">
        {MAP_LIST.map((m) => (
          <button key={m.id} className="select-card" onClick={() => choose(m.id)}>
            <span className="card-top">
              <span className="card-title">{m.name}</span>
              <span className="card-badge">{m.nodes.filter((n) => n.requiredItem).length} key-locked</span>
            </span>
            <span className="card-sub">
              {m.nodes.filter((n) => n.type === 'extract').length} extracts &middot;{' '}
              {m.nodes.filter((n) => n.type === 'spawn').length} spawn zones
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
