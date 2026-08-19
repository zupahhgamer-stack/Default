// One-time (or whenever-you-like) pull of live quest + map coordinate data
// from api.tarkov.dev, for inspection outside the browser. Run with:
//   npm run sync-tarkov-data
//
// This reuses the exact same fetch/transform code the app itself runs
// (src/api/tarkovApi.js) — it's not a separate implementation to keep in
// sync, just a way to see the result without opening a browser. It does NOT
// write any file the app reads; the app fetches live in-browser and caches
// to localStorage itself. This script is a diagnostic: did the live API
// respond, and does the coordinate transform produce sane output.

import { fetchQuests } from '../src/api/tarkovApi.js'

const result = await fetchQuests({ forceRefresh: true })

console.log(`source: ${result.source}${result.error ? ` (error: ${result.error})` : ''}`)
console.log(`quests: ${result.quests.length}`)

const mapIds = Object.keys(result.mapEntities ?? {})
console.log(`maps with real coordinate data: ${mapIds.length ? mapIds.join(', ') : 'none'}`)

if (mapIds.length) {
  const sampleMapId = mapIds[0]
  const sample = result.mapEntities[sampleMapId]
  console.log(`\nsample — ${sampleMapId}: ${sample.spawns.length} spawns, ${sample.extracts.length} extracts`)
  console.log(sample.extracts.slice(0, 3))
}

const questWithRealWaypoint = result.quests.find((q) => q.objectives.some((o) => o.realPosition))
if (questWithRealWaypoint) {
  const obj = questWithRealWaypoint.objectives.find((o) => o.realPosition)
  console.log(`\nsample real quest waypoint — "${questWithRealWaypoint.name}": ${obj.description}`)
  console.log(obj.realPosition)
} else if (result.source === 'live') {
  console.log('\nno quest objective in this pull resolved to a real map position (unexpected — check the query)')
}
