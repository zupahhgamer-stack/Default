import { Routes, Route } from 'react-router-dom'
import { AppStateProvider } from './context/AppStateContext.jsx'
import MainMenu from './pages/MainMenu.jsx'
import ModeSelect from './pages/ModeSelect.jsx'
import MapSelect from './pages/MapSelect.jsx'
import QuestSelect from './pages/QuestSelect.jsx'
import RoutePlanner from './pages/RoutePlanner.jsx'
import ItemFinder from './pages/ItemFinder.jsx'

export default function App() {
  return (
    <AppStateProvider>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/mode" element={<ModeSelect />} />
          <Route path="/map" element={<MapSelect />} />
          <Route path="/quests" element={<QuestSelect />} />
          <Route path="/planner" element={<RoutePlanner />} />
          <Route path="/find-item" element={<ItemFinder />} />
        </Routes>
      </div>
    </AppStateProvider>
  )
}
