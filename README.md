# RAIDPLAN

A local Escape from Tarkov raid route planner. Runs as a second-monitor
companion app while you play — no backend, no telemetry, everything lives in
your browser's localStorage.

**Flow:** Main Menu → Mode (PMC/Scav) → Map (all 10 maps) → Quest objectives
→ Route planner (SVG node graph, A* pathfinding, shortest↔safest slider,
multi-stop quest routing, key-locked extract warnings).

## Setup

```bash
npm install
npm run dev
```

Open the printed `http://localhost:5173` URL — or better, drag that window
to your second monitor and leave it open while you raid. `npm run build` /
`npm run preview` work as usual if you want a static build.

No API key, no account, no server component. Requires internet access only
to pull live quest/coordinate data from `api.tarkov.dev`; everything else
works fully offline. Run `npm run sync-tarkov-data` any time to check
whether that API is reachable from your terminal, outside the browser.

## Quest data

Quest data (trader, objectives, required items, keys, min level, maps) is
fetched live from the public [tarkov.dev GraphQL API](https://api.tarkov.dev/graphql)
on first load, cached in `localStorage` for ~12h, and re-synced with the
**Refresh** button on the objective-select screen.

**If the API is unreachable**, RAIDPLAN falls back to a small bundled
snapshot (`src/data/questsFallback.js`) so the app still has real, working
quest content to demo — you'll see an `OFFLINE SNAPSHOT` banner. This isn't
a hypothetical: `api.tarkov.dev/graphql` was returning a hard `"GraphQL
server unavailable"` backend error for the entirety of this app's
development, so the fallback path got exercised for real, not just written
defensively. Once the API is back up, the live fetch on the next quest-select
visit (or a Refresh click) replaces it automatically — nothing to configure.

A few notes on the live integration (`src/api/tarkovApi.js`):

- One query pulls `tasks(lang: en)` (trader, min level, kappa flag,
  objectives with required items/counts/FIR, per-objective `requiredKeys`)
  **and** `maps` (real spawn/extract world positions) together — see
  "Real coordinates" below for how the two combine.
- Every live-fetched quest shows its full "what to bring" list in the
  sidebar regardless of whether it has a map position.

## Map data — real art, real coordinates where the API has them

Earlier drafts of this README said the tarkov.dev API doesn't expose map
coordinates or imagery. That was wrong — I hadn't checked deeply enough
before the API went down partway through building this. It does, via a
`maps` query most consumers don't reach for: `spawns { position }`,
`extracts { position }`, and per-objective `zones { position }`, all in raw
in-game world coordinates (Unity world space: `x`/`z` = ground plane, `y` =
height). Two things it genuinely doesn't give you: a background image (the
API is data-only), and any notion of which points are walkably connected to
which — Tarkov interiors have walls a straight line will happily cut
through, so "point A" and "point B" existing doesn't mean a raw line
between them is a route. Both of those still needed solving outside the API:

- **Map art** (`public/maps/*.svg`) — real per-map SVGs, pulled one-time
  from tarkov.dev's own asset CDN (`assets.tarkov.dev/maps/svg/*.svg`),
  the same artwork their own site renders. © the-hideout, **CC BY-NC-SA
  4.0** (non-commercial, share-alike) — fine for this local personal tool,
  but don't redistribute these files commercially. Source:
  [tarkov-dev-svg-maps](https://github.com/the-hideout/tarkov-dev-svg-maps).
- **Walkable connectivity** (`src/data/maps/*.js` edges) — still hand-built,
  because the API has no concept of it. Real extract/spawn/landmark names,
  plausible relative distances, and danger ratings I assigned from general
  knowledge of PMC/boss traffic per map.

### Real coordinates (the part that needed the most care)

`src/data/mapCalibration.js` holds, per map, the exact affine transform +
rotation + bounds tarkov.dev's own frontend uses to turn a raw world
position into a 2D map point — pulled one-time from their MIT-licensed
frontend repo (`the-hideout/tarkov-dev`'s `src/data/maps.json`), not
guessed. `src/utils/worldToPercent.js` replicates their Leaflet CRS math
(reverse-engineered from their `src/pages/map/index.jsx`) to convert any
`{x,y,z}` into the same 0–100 percent space our hand-built nodes already
use. It's sanity-checked against a real sample position (a Terminal spawn
point) in that file's development history — I don't have a live API
connection to verify pixel-for-pixel placement end to end (see the
"currently offline" note below), but the math is transcribed from their
source, not invented, and the sample check lands in a sane, tightly
clustered spot rather than garbage coordinates.

Where this actually shows up: **any selected quest objective with a real
zone position on the current map gets inserted into the route graph at that
exact spot** (see `buildEffectiveMap` in `src/pages/RoutePlanner.jsx`),
connected to the nearest hand-built node by a straight edge (since, again,
the API gives a point, not a path to it) — scaled down so it's roughly
consistent with the graph's other hand-tuned distances. This node shows a
`GPS` badge in the waypoint list so you can tell it apart from a hand-picked
one. **This is what makes multi-stop routing work for any quest with
location data, not just a hand-picked few** — the earlier draft of this app
could only route through the dozen or so quests I'd manually pinned by
hand; this pulls the real thing.

**Currently offline:** `api.tarkov.dev` was returning a hard backend
outage (`"GraphQL server unavailable"`) for this app's entire development —
confirmed as a real outage, not a proxy artifact, since `assets.tarkov.dev`
(the map art CDN) and `tarkov.dev` itself both responded fine the whole
time. So while the query is written and validated (offline, against the
`tarkov-api` project's own schema SDL — see `npm run sync-tarkov-data`), I
have not been able to see it return a real `{x,y,z}` and watch a marker land
in the right spot. Until the API recovers, the app runs exactly like the
original hand-built version: the HUD shows `GPS: approximate graph`, and
quest waypoints fall back to the old hand-picked `mapNodeHint` system
(still present for the bundled fallback quests — see below). The moment the
API responds — automatically, next time you open the quest-select screen,
or via `npm run sync-tarkov-data` to check from the terminal — real
coordinates take over with no config change. If you hit a marker that's
visibly off, `worldToPercent.js` and `mapCalibration.js` are the only two
files that would need correcting.

### Refining hand-built nodes/edges

1. Open `src/data/maps/<mapId>.js`. Each node is:
   ```js
   n('cust_ext_crossroads', 'Crossroads', 'extract', 8, 62, 1, 'pmc', null)
   //  id                    name          type      x   y  danger faction requiredItem
   ```
   `x`/`y` are 0–100 against the map's `viewBox` (`0 0 1000 700` for every
   map). The real SVG art now renders underneath at partial opacity as a
   visual reference — eyeball your node against it and nudge `x`/`y` until
   it lines up. (Real spawn/extract positions from the live API, once it's
   back, will do this automatically for anything the API covers; this stays
   relevant for the landmark nodes it doesn't.)
2. `danger` (0–10) is a subjective PMC/boss contact risk rating — tune it
   from your own raid experience or community heatmaps.
3. `requiredItem` should be a short human-readable key/item name (e.g.
   `'ZB-013 Key'`) or `null`. Any node with a non-null `requiredItem` shows
   a 🔒 badge and gets excluded when "avoid key-locked" is on.
4. Edges (`e('nodeA', 'nodeB', dist)`) define what's actually pathable and
   how far apart nodes are — the graph is intentionally sparse, not a full
   mesh, so an edge should represent a real, roughly-walkable line of
   travel. `dist` is a relative unit, not meters — keep it internally
   consistent per map rather than trying to match real distances exactly.

### The bundled fallback's `mapNodeHint`

`src/data/questsFallback.js` quests still carry a hand-picked `mapNodeHint`
(a node `id` on the map) as a belt-and-suspenders waypoint source — used
only when a quest has no real `realPosition` (i.e., always, for the bundled
fallback set, and for any live quest whose objective genuinely has no fixed
location, like "reach player level 20"). You don't need to maintain this for
new quests; it's a fallback for exactly the offline case this app shipped
in.

## Route planning

- **A\*** (`src/utils/astar.js`) finds a path between two nodes on the
  active map's graph. Edge cost blends raw distance with the danger rating
  of the node being entered; the **Shortest ↔ Safest** slider (0–1) shifts
  the blend from pure distance to danger-weighted.
- **Multi-stop routing**: any selected quest objective that resolves to a
  waypoint (real API position, or the fallback `mapNodeHint`) on the current
  map gets chained in: spawn → objective 1 → objective 2 → … → extract,
  running A* leg-by-leg.
- **Avoid key-locked** removes every node with a `requiredItem` from the
  graph entirely (not just extracts — any landmark gated behind a key too),
  so a route never crosses or ends at a locked point. If that makes a leg
  unreachable, it's called out in the route summary instead of silently
  failing.
- Click any spawn or extract marker directly on the map to set it, or use
  the sidebar dropdowns.

## What's stored locally

Everything lives under the `raidplan.*` prefix in `localStorage`: selected
mode/map/quests, slider/toggle settings, and the quest data cache. Nothing
leaves your machine — there's no backend and no analytics.

## Project structure

```
src/
  api/tarkovApi.js         live GraphQL fetch (quests + real map/spawn/extract/objective positions) + cache + fallback
  data/maps/*.js           per-map hand-built node graphs — walkable edges, danger, key locks
  data/mapCalibration.js   one-time-pulled per-map coordinate transform (world -> percent)
  data/questsFallback.js   offline quest snapshot used when the API is unreachable
  utils/astar.js           pathfinding
  utils/worldToPercent.js  world coordinate -> map percent transform
  context/AppStateContext.jsx   localStorage-backed app state
  pages/                   Main Menu, Mode/Map/Quest select, Route Planner
  components/MapView.jsx   SVG node graph + route rendering
public/maps/*.svg          real map art, pulled one-time from assets.tarkov.dev (CC BY-NC-SA 4.0)
scripts/sync-tarkov-data.mjs   run with `npm run sync-tarkov-data` to check the live API from a terminal
```

## Known limitations

- Walkable connectivity (which nodes can reach which) is still hand-built
  and approximate — the API has no concept of a walkable path, only points.
- Real coordinates are implemented and offline-validated against the
  schema, but unverified end-to-end against a live response — see "Real
  coordinates" above for exactly what that means and how to tell (`GPS:`
  status in the route planner's top bar).
- Only 10 base maps are modeled; map variants (e.g. Factory day/night) share
  the same graph.
- Real map art is licensed CC BY-NC-SA 4.0 (non-commercial) — fine for this
  personal tool, don't repurpose it commercially.
