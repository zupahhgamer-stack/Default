// One-time (rerunnable) pull that bakes src/data/lootFallback.json — key
// loose-loot spawn locations across all maps, used by the "Find Item / Key"
// screen whenever the live GraphQL API is unreachable.
//
// Why this exists as a separate baked file instead of just fetching live:
// tarkov.dev's static REST mirror (json.tarkov.dev) is the only source that
// worked at all while this app was built (the GraphQL backend was down
// throughout) — but its items+maps payload is ~26MB combined. That's fine
// for a one-time Node-side pull, completely inappropriate to fetch from a
// browser on every page load. So: pull it here, filter to key items with a
// resolvable position, write the small result to disk. The app's actual
// runtime (src/api/lootApi.js) prefers the live GraphQL API (small, scoped
// to `types: [keys]`) and only reaches for this bundled file as a last
// resort.
//
// Run with: npm run sync-loot-data

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { fetchFullSnapshotViaJsonMirror } from '../src/api/lootApi.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '../src/data/lootFallback.json')

console.log('Pulling key spawn locations from json.tarkov.dev (this fetches ~26MB, give it a moment)...')
const result = await fetchFullSnapshotViaJsonMirror()

// Cap spawns per item so one extremely common key type (unlikely, but
// possible) can't balloon the bundle — 150 is well above what's needed for
// the finder's own MAX_MARKERS_SHOWN cap of 120 per map.
const trimmed = result.items.map((it) => ({ ...it, spawns: it.spawns.slice(0, 150) }))

writeFileSync(outPath, JSON.stringify(trimmed, null, 2) + '\n')
console.log(`Wrote ${trimmed.length} keys with spawn locations to ${outPath}`)
console.log(`Total spawn points: ${trimmed.reduce((sum, it) => sum + it.spawns.length, 0)}`)
