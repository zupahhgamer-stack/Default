import { QUESTS_FALLBACK } from '../data/questsFallback.js'

const ENDPOINT = 'https://api.tarkov.dev/graphql'
const CACHE_KEY = 'raidplan.quests.cache.v1'
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 12 // 12h — quests don't change minute to minute

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

const QUERY = `
  query RaidplanTasks {
    tasks(lang: en) {
      id
      name
      trader { name }
      minPlayerLevel
      kappaRequired
      wikiLink
      maps { normalizedName }
      objectives {
        id
        type
        description
        optional
        maps { normalizedName }
        ... on TaskObjectiveItem {
          item { name shortName }
          items { name shortName }
          count
          foundInRaid
        }
      }
      neededKeys {
        keys { name shortName }
        map { normalizedName }
      }
    }
  }
`

function normalizeMapId(normalizedName) {
  return MAP_ID_ALIASES[normalizedName] ?? null
}

function transformTask(task) {
  const maps = (task.maps ?? [])
    .map((m) => normalizeMapId(m.normalizedName))
    .filter(Boolean)

  const keysByMap = new Map()
  for (const nk of task.neededKeys ?? []) {
    const mapId = normalizeMapId(nk.map?.normalizedName)
    const names = (nk.keys ?? []).map((k) => k.shortName || k.name)
    if (!mapId) continue
    keysByMap.set(mapId, [...(keysByMap.get(mapId) ?? []), ...names])
  }

  const objectives = (task.objectives ?? []).map((obj) => {
    const items = obj.items?.length ? obj.items : obj.item ? [obj.item] : []
    return {
      id: obj.id,
      description: obj.description ?? '',
      type: obj.type ?? 'unknown',
      optional: !!obj.optional,
      mapNodeHint: null,
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

function writeCache(quests) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ quests, fetchedAt: Date.now() }))
  } catch {
    // localStorage unavailable/full — non-fatal, just skip caching
  }
}

// Resolved result for this browser session, so navigating between screens
// (quest select -> planner) doesn't re-run a slow/failing network round trip
// on every mount. Cleared only by a forceRefresh.
let sessionResult = null

/**
 * Fetch the live Tarkov task list from api.tarkov.dev. Falls back to a
 * localStorage cache, then to the bundled offline snapshot, so the app
 * always has quest data to show. Returns { quests, source, fetchedAt, error }.
 */
export async function fetchQuests({ forceRefresh = false } = {}) {
  if (!forceRefresh && sessionResult) return sessionResult

  const cache = readCache()
  const cacheIsFresh = cache && Date.now() - cache.fetchedAt < CACHE_MAX_AGE_MS

  if (!forceRefresh && cacheIsFresh) {
    sessionResult = { quests: cache.quests, source: 'cache', fetchedAt: cache.fetchedAt, error: null }
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
    writeCache(quests)
    sessionResult = { quests, source: 'live', fetchedAt: Date.now(), error: null }
  } catch (err) {
    sessionResult = cache
      ? { quests: cache.quests, source: 'cache', fetchedAt: cache.fetchedAt, error: String(err.message || err) }
      : { quests: QUESTS_FALLBACK, source: 'fallback', fetchedAt: null, error: String(err.message || err) }
  }

  return sessionResult
}
