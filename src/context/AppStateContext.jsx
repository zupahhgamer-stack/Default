import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { loadState, saveState } from '../utils/storage.js'

const AppStateContext = createContext(null)

function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => loadState(key, initial))
  useEffect(() => saveState(key, value), [key, value])
  return [value, setValue]
}

export function AppStateProvider({ children }) {
  const [mode, setMode] = usePersistentState('mode', null) // 'pmc' | 'scav'
  const [mapId, setMapId] = usePersistentState('mapId', null)
  const [selectedQuestIds, setSelectedQuestIds] = usePersistentState('selectedQuestIds', [])
  const [safety, setSafety] = usePersistentState('safety', 0.5) // 0 shortest .. 1 safest
  const [avoidKeyLocked, setAvoidKeyLocked] = usePersistentState('avoidKeyLocked', false)
  const [spawnId, setSpawnId] = usePersistentState('spawnId', null)
  const [extractId, setExtractId] = usePersistentState('extractId', null)

  function toggleQuest(id) {
    setSelectedQuestIds((prev) => (prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]))
  }

  function resetRun() {
    setMode(null)
    setMapId(null)
    setSelectedQuestIds([])
    setSpawnId(null)
    setExtractId(null)
  }

  const value = useMemo(
    () => ({
      mode,
      setMode,
      mapId,
      setMapId,
      selectedQuestIds,
      setSelectedQuestIds,
      toggleQuest,
      safety,
      setSafety,
      avoidKeyLocked,
      setAvoidKeyLocked,
      spawnId,
      setSpawnId,
      extractId,
      setExtractId,
      resetRun,
    }),
    [mode, mapId, selectedQuestIds, safety, avoidKeyLocked, spawnId, extractId],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}
