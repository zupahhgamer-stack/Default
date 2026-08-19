import { useNavigate, Link } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext.jsx'

const MODES = [
  {
    id: 'pmc',
    title: 'PMC',
    sub: 'Player vs Everyone — full quest access, high stakes',
    className: 'mode-pmc',
  },
  {
    id: 'scav',
    title: 'Scav',
    sub: 'Free raid entry — limited extracts, low commitment',
    className: 'mode-scav',
  },
]

export default function ModeSelect() {
  const { setMode } = useAppState()
  const navigate = useNavigate()

  function choose(id) {
    setMode(id)
    navigate('/map')
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <div>
          <span className="kicker">Step 1 / 4</span>
          <h1>Select Raid Mode</h1>
        </div>
        <Link className="back-link" to="/">
          &laquo; Main Menu
        </Link>
      </div>

      <div className="card-grid">
        {MODES.map((m) => (
          <button key={m.id} className={`select-card ${m.className}`} onClick={() => choose(m.id)}>
            <span className="card-title">{m.title}</span>
            <span className="card-sub">{m.sub}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
