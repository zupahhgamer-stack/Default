import { Link } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext.jsx'

export default function MainMenu() {
  const { mode, mapId, resetRun } = useAppState()

  return (
    <div className="main-menu">
      <div className="brand">
        RAIDPLAN
        <small>Tactical Route Planning &mdash; Escape From Tarkov</small>
      </div>
      <nav>
        <Link className="menu-btn" to="/mode" onClick={resetRun}>
          New Raid Plan <span className="arrow">&raquo;</span>
        </Link>
        <Link
          className="menu-btn"
          to="/map"
          aria-disabled={!mode}
          onClick={(evt) => {
            if (!mode) evt.preventDefault()
          }}
          style={!mode ? { opacity: 0.35, pointerEvents: 'none' } : undefined}
        >
          Continue{mode ? ` (${mode.toUpperCase()}${mapId ? ` / ${mapId}` : ''})` : ''} <span className="arrow">&raquo;</span>
        </Link>
        <Link className="menu-btn" to="/find-item">
          Find Item / Key <span className="arrow">&raquo;</span>
        </Link>
      </nav>
      <footer>No telemetry &middot; Local-only &middot; Data cached in your browser</footer>
    </div>
  )
}
