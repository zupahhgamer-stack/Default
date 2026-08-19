import { QUESTS_FALLBACK } from '../data/questsFallback.js'
import { worldToPercent } from '../utils/worldToPercent.js'

const ENDPOINT = 'https://api.tarkov.dev/graphql'
const CACHE_KEY = 'raidplan.data.cache.v2'
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 12 // 12h — quests/positions don't change minute to minute

// tarkov.dev `normalizedName` -> our internal map ids (src/data/maps/*).
const MAP_ID_ALIASES = {
  customs: 'customs',
  factory: 'factory',
  'factory-day': 'factory',
  'factory-night': 'factory',
  interchange: 'interchange',
  reserve: 'reserve',
  shoreline: 'shoreline',
  woods: 'woods',
  lighthouse: 'lighthouse',
  'streets-of-tarkov': 'streets',
  'the-lab': 'lab',
  labs: 'lab',
  'ground-zero': 'groundzero',
  'ground-zero-21': 'groundzero',
}

// One combined request: task/quest data plus each map's real spawn/extract
// world positions and, where a quest objective has a physical location, its
// zone position too. Validated offline against the tarkov-api project's own
// schema SDL (see /scripts/sync-tarkov-data.mjs) since api.tarkov.dev itself
// was down for the entirety of this app's development — field names here
// are confirmed correct against their schema, not guessed.
const QUERY = `
  query RaidplanData {
    tasks(lang: en) {
      id
      name
      trader { name }
      minPlayerLevel
      kappaRequired
      wikiLink
      map { normalizedName }
      objectives {
        id
        type
        description
        optional
        maps { normalizedName }
        ... on TaskObjectiveItem {
          items { name shortName }
          count
          foundInRaid
          zones { position { x y z } map { normalizedName } }
          requiredKeys { name shortName }
        }
        ... on TaskObjectiveBasic {
          zones { position { x y z } map { normalizedName } }
          requiredKeys { name shortName }
        }
        ... on TaskObjectiveMark {
          markerItem { name shortName }
          zones { position { x y z } map { normalizedName } }
          requiredKeys { name shortName }
        }
        ... on TaskObjectiveQuestItem {
          questItem { name }
          count
          zones { position { x y z } map { normalizedName } }
          requiredKeys { name shortName }
        }
        ... on TaskObjectiveShoot {
          zoneNames
          zones { position { x y z } map { normalizedName } }
          requiredKeys { name shortName }
        }
        ... on TaskObjectiveUseItem {
          zoneNames
          zones { position { x y z } map { normalizedName } }
          requiredKeys { name shortName }
        }
        ... on TaskObjectiveExtract {
          exitName
          zoneNames
          requiredKeys { name shortName }
        }
      }
      neededKeys {
        keys { name shortName }
        map { normalizedName }
      }
    }
    maps {
      normalizedName
      spawns { zoneName position { x y z } sides categories }
      extracts { id name faction position { x y z } }
    }
  }
`

function normalizeMapId(normalizedName) {
  return MAP_ID_ALIASES[normalizedName] ?? null
}

// Pick the first zone that resolves to one of our known maps and convert its
// raw world position into our 0-100 node-graph percent space.
function realPositionFromZones(zones) {
  for (const zone of zones ?? []) {
    const mapId = normalizeMapId(zone.map?.normalizedName)
    if (!mapId || !zone.position) continue
    const pct = worldToPercent(zone.position, mapId)
    if (pct) return { mapId, x: pct.x, y: pct.y }
  }
  return null
}

function transformTask(task) {
  const maps = task.map ? [normalizeMapId(task.map.normalizedName)].filter(Boolean) : []

  const keysByMap = new Map()
  for (const nk of task.neededKeys ?? []) {
    const mapId = normalizeMapId(nk.map?.normalizedName)
    const names = (nk.keys ?? []).map((k) => k.shortName || k.name)
    if (!mapId) continue
    keysByMap.set(mapId, [...(keysByMap.get(mapId) ?? []), ...names])
  }

  const objectives = (task.objectives ?? []).map((obj) => {
    const items = obj.items ?? []
    const objectiveKeys = [...new Set((obj.requiredKeys ?? []).map((k) => k.shortName || k.name))]
    return {
      id: obj.id,
      description: obj.description ?? '',
      type: obj.type ?? 'unknown',
      optional: !!obj.optional,
      mapNodeHint: null, // set only by the bundled fallback dataset (src/data/questsFallback.js)
      realPosition: realPositionFromZones(obj.zones), // { mapId, x, y } in 0-100 percent, from real API zone data
      requiredKeys: objectiveKeys,
      requiredItems: items.map((it) => ({
        name: it.shortName || it.name,
        count: obj.count ?? 1,
        foundInRaid: !!obj.foundInRaid,
      })),
    }
  })

  const requiredKeys = [...new Set([...keysByMap.values()].flat())]

  return {
    id: task.id,
    name: task.name,
    trader: task.trader?.name ?? 'Unknown',
    minPlayerLevel: task.minPlayerLevel ?? 1,
    kappaRequired: !!task.kappaRequired,
    maps,
    wikiLink: task.wikiLink ?? null,
    objectives,
    requiredKeys,
  }
}

// Real spawn/extract world positions per map, converted to our 0-100 percent
// space. Keyed by our internal map id; entries missing a calibrated map (see
// src/data/mapCalibration.js) or without a resolvable position are dropped.
function transformMapEntities(apiMaps) {
  const byMapId = {}
  for (const m of apiMaps ?? []) {
    const mapId = normalizeMapId(m.normalizedName)
    if (!mapId) continue

    const spawns = (m.spawns ?? [])
      .map((s) => {
        const pct = worldToPercent(s.position, mapId)
        if (!pct) return null
        return { name: s.zoneName || 'Spawn', sides: s.sides ?? [], x: pct.x, y: pct.y }
      })
      .filter(Boolean)

    const extracts = (m.extracts ?? [])
      .map((ex) => {
        const pct = worldToPercent(ex.position, mapId)
        if (!pct) return null
        return { id: ex.id, name: ex.name, faction: ex.faction, x: pct.x, y: pct.y }
      })
      .filter(Boolean)

    if (spawns.length || extracts.length) byMapId[mapId] = { spawns, extracts }
  }
  return byMapId
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.quests)) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(quests, mapEntities) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ quests, mapEntities, fetchedAt: Date.now() }))
  } catch {
    // localStorage unavailable/full — non-fatal, just skip caching
  }
}

// Resolved result for this browser session, so navigating between screens
// (quest select -> planner) doesn't re-run a slow/failing network round trip
// on every mount. Cleared only by a forceRefresh.
let sessionResult = null

/**
 * Fetch the live Tarkov task list AND real map spawn/extract/objective
 * positions from api.tarkov.dev in one request. Falls back to a localStorage
 * cache, then to the bundled offline snapshot (quests only — no real
 * positions), so the app always has quest data to show. Returns
 * { quests, mapEntities, source, fetchedAt, error }.
 */
export async function fetchQuests({ forceRefresh = false } = {}) {
  if (!forceRefresh && sessionResult) return sessionResult

  const cache = readCache()
  const cacheIsFresh = cache && Date.now() - cache.fetchedAt < CACHE_MAX_AGE_MS

  if (!forceRefresh && cacheIsFresh) {
    sessionResult = { quests: cache.quests, mapEntities: cache.mapEntities ?? {}, source: 'cache', fetchedAt: cache.fetchedAt, error: null }
    return sessionResult
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY }),
    })
    const json = await res.json()
    if (json.errors?.length) throw new Error(json.errors[0]?.message || json.errors[0] || 'GraphQL error')
    const tasks = json.data?.tasks
    if (!Array.isArray(tasks) || tasks.length === 0) throw new Error('Empty task list from API')

    const quests = tasks.map(transformTask)
    const mapEntities = transformMapEntities(json.data?.maps)
    writeCache(quests, mapEntities)
    sessionResult = { quests, mapEntities, source: 'live', fetchedAt: Date.now(), error: null }
  } catch (err) {
    sessionResult = cache
      ? { quests: cache.quests, mapEntities: cache.mapEntities ?? {}, source: 'cache', fetchedAt: cache.fetchedAt, error: String(err.message || err) }
      : { quests: QUESTS_FALLBACK, mapEntities: {}, source: 'fallback', fetchedAt: null, error: String(err.message || err) }
  }

  return sessionResult
}
