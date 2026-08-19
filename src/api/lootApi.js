import { worldToPercent } from '../utils/worldToPercent.js'
import LOOT_FALLBACK from '../data/lootFallback.json' with { type: 'json' }

const GRAPHQL_ENDPOINT = 'https://api.tarkov.dev/graphql'
const JSON_ITEMS_ENDPOINT = 'https://json.tarkov.dev/regular/items'
const JSON_MAPS_ENDPOINT = 'https://json.tarkov.dev/regular/maps'
const CACHE_KEY = 'raidplan.loot.cache.v1'
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 12

// Same map-id mapping as tarkovApi.js (kept separate to avoid coupling the
// two fetch paths together — this one has its own REST fallback, which the
// quest fetcher doesn't need).
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
function normalizeMapId(normalizedName) {
  return MAP_ID_ALIASES[normalizedName] ?? null
}

// tarkov.dev's translation service has been degraded alongside the GraphQL
// outage this app was built against: `name`/`shortName` on items and maps
// come back as literal placeholder text ("<id> Name") instead of real
// strings. Detect that pattern and fall back to a title-cased normalizedName
// slug so the item finder still shows something readable — this
// self-corrects the moment tarkov.dev's translations come back, since we
// always prefer the real name when it doesn't look like a placeholder.
function isPlaceholderName(name, id) {
  return !name || name === `${id} Name` || name === `${id} ShortName` || name.startsWith(`${id} `)
}

// worldToPercent clamps to [-15, 115] so off-bounds positions don't vanish
// silently, but a position that clamps to the corner is usually a stray
// coordinate our flat 2D transform can't place (a different floor/elevation
// on a multi-level map, most often) rather than a real, useful marker —
// drop those rather than stacking noise in a map corner.
function isPlausiblePercent(pct) {
  return pct.x > -10 && pct.x < 110 && pct.y > -10 && pct.y < 110
}

function titleCaseFromSlug(slug) {
  if (!slug) return 'Unknown Item'
  return slug
    .split('-')
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

function displayName(rawName, shortName, id, normalizedName) {
  if (!isPlaceholderName(rawName, id)) return shortName && !isPlaceholderName(shortName, id) ? shortName : rawName
  return titleCaseFromSlug(normalizedName)
}

async function fetchViaGraphQL() {
  const query = `
    query RaidplanLoot {
      items(types: [keys]) {
        id
        name
        shortName
        normalizedName
      }
      maps {
        normalizedName
        lootLoose { position { x y z } items { id } }
      }
    }
  `
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors[0]?.message || 'GraphQL error')
  const items = json.data?.items
  const maps = json.data?.maps
  if (!Array.isArray(items) || !Array.isArray(maps)) throw new Error('Empty loot data from API')

  const itemsById = new Map(
    items.map((it) => [it.id, { id: it.id, name: displayName(it.name, it.shortName, it.id, it.normalizedName) }]),
  )
  const spawnsByItemId = new Map()
  for (const m of maps) {
    const mapId = normalizeMapId(m.normalizedName)
    if (!mapId) continue
    for (const spot of m.lootLoose ?? []) {
      const pct = worldToPercent(spot.position, mapId)
      if (!pct || !isPlausiblePercent(pct)) continue
      for (const it of spot.items ?? []) {
        if (!itemsById.has(it.id)) continue // keys-only query — skip non-key items in loose loot
        const list = spawnsByItemId.get(it.id) ?? []
        list.push({ mapId, x: pct.x, y: pct.y })
        spawnsByItemId.set(it.id, list)
      }
    }
  }
  return buildResult(itemsById, spawnsByItemId, 'live')
}

// Pulls the full ~26MB of raw items+maps JSON from tarkov.dev's static
// mirror and filters it down to key-type items with a real loose-loot
// position. This is NOT called from the running app — a client-side fetch
// of tens of megabytes on every page load is a bad idea regardless of
// whether the API is healthy. It's only used by scripts/sync-loot-data.mjs
// to bake src/data/lootFallback.json as a one-time (rerunnable) pull, the
// same pattern as the bundled quest snapshot.
export async function fetchFullSnapshotViaJsonMirror() {
  const [itemsRes, mapsRes] = await Promise.all([fetch(JSON_ITEMS_ENDPOINT), fetch(JSON_MAPS_ENDPOINT)])
  if (!itemsRes.ok || !mapsRes.ok) throw new Error('json.tarkov.dev unreachable')
  const itemsJson = await itemsRes.json()
  const mapsJson = await mapsRes.json()
  const itemsRaw = itemsJson.data?.items
  const mapsRaw = mapsJson.data?.maps
  if (!itemsRaw || !mapsRaw) throw new Error('Empty loot data from json.tarkov.dev')

  const itemsById = new Map()
  for (const id of Object.keys(itemsRaw)) {
    const it = itemsRaw[id]
    if (!(it.types ?? []).includes('keys')) continue
    itemsById.set(id, { id, name: displayName(it.name, it.shortName, id, it.normalizedName) })
  }

  const spawnsByItemId = new Map()
  for (const mapKey of Object.keys(mapsRaw)) {
    const m = mapsRaw[mapKey]
    const mapId = normalizeMapId(m.normalizedName)
    if (!mapId) continue
    for (const spot of m.lootLoose ?? []) {
      const pct = worldToPercent(spot.position, mapId)
      if (!pct || !isPlausiblePercent(pct)) continue
      for (const itemId of spot.items ?? []) {
        if (!itemsById.has(itemId)) continue
        const list = spawnsByItemId.get(itemId) ?? []
        list.push({ mapId, x: pct.x, y: pct.y })
        spawnsByItemId.set(itemId, list)
      }
    }
  }
  return buildResult(itemsById, spawnsByItemId, 'live-rest')
}

function buildResult(itemsById, spawnsByItemId, source) {
  // Only keep items that actually have at least one resolvable spawn point
  // — that's the whole point of this index (item lookups with nothing to
  // show aren't useful, and it keeps the searchable list small).
  const items = []
  for (const [itemId, spawns] of spawnsByItemId) {
    const meta = itemsById.get(itemId)
    if (!meta) continue
    items.push({ id: itemId, name: meta.name, spawns })
  }
  items.sort((a, b) => a.name.localeCompare(b.name))
  return { items, source, fetchedAt: Date.now() }
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.items)) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(result) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(result))
  } catch {
    // non-fatal
  }
}

let sessionResult = null

/**
 * Key loose-loot spawn locations across all maps, for the "Find Item / Key"
 * screen. Tries the live GraphQL API first (small payload — scoped to
 * `types: [keys]` — so this is safe to call on every visit), falls back to
 * a localStorage cache, then to the bundled snapshot in
 * src/data/lootFallback.json (built by `npm run sync-loot-data`, see that
 * script and fetchFullSnapshotViaJsonMirror above for why this app never
 * fetches the raw ~26MB json.tarkov.dev mirror directly from the browser).
 * Returns { items: [{id, name, spawns: [{mapId,x,y}]}], source, error }.
 */
export async function fetchLootLocations({ forceRefresh = false } = {}) {
  if (!forceRefresh && sessionResult) return sessionResult

  const cache = readCache()
  const cacheIsFresh = cache && Date.now() - cache.fetchedAt < CACHE_MAX_AGE_MS
  if (!forceRefresh && cacheIsFresh) {
    sessionResult = { ...cache, source: 'cache', error: null }
    return sessionResult
  }

  try {
    const result = await fetchViaGraphQL()
    writeCache(result)
    sessionResult = { ...result, error: null }
    return sessionResult
  } catch (err) {
    if (cache) {
      sessionResult = { ...cache, source: 'cache', error: String(err.message || err) }
      return sessionResult
    }
    sessionResult = { items: LOOT_FALLBACK, source: 'fallback', fetchedAt: null, error: String(err.message || err) }
    return sessionResult
  }
}
