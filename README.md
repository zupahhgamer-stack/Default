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
to pull live quest data from `api.tarkov.dev`; everything else works fully
offline.

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

- Query pulls `tasks(lang: en)` with `trader`, `minPlayerLevel`,
  `kappaRequired`, `maps`, `objectives` (including `TaskObjectiveItem`
  required items/counts/FIR), and `neededKeys`.
- The tarkov.dev API does **not** expose 2D top-down coordinates for map
  extracts/landmarks (only 3D world-space positions for some entities like
  boss spawns, and no public map background images) — see "Map data" below
  for how RAIDPLAN handles that instead.
- Quest objectives from the live API aren't automatically pinned to a spot
  on our hand-built node graphs (there's no shared ID space between
  tarkov.dev's objective locations and our map nodes). Every live-fetched
  quest still shows its full "what to bring" list in the sidebar; only the
  bundled fallback quests currently carry a hand-picked `mapNodeHint` that
  plots them as a numbered waypoint on the SVG map. See "Adding quest
  waypoints" below to extend this.

## Map data — hand-built, approximate

Since the public API doesn't expose extract/landmark coordinates, each map's
node graph (`src/data/maps/*.js`) was **hand-built as a starting skeleton**:
real extract names, plausible relative distances, and danger ratings I
assigned based on general knowledge of PMC/boss traffic on each map. Node
`x`/`y` are percentages (0–100) of the map's SVG `viewBox`, laid out to
loosely resemble each map's real shape — **they are not measured against
actual map imagery and should be treated as approximate.**

### Refining coordinates

1. Find a real top-down map image for the map you want to fix (community
   wikis have these) and, optionally, drop it at `public/maps/<mapId>.jpg`
   (e.g. `public/maps/customs.jpg`) — each map object already has an
   `image` field pointing there. If the file exists it renders under the
   node graph at 55% opacity as a visual reference/backdrop; if it's
   missing, the app just skips it silently, no error.
2. Open `src/data/maps/<mapId>.js`. Each node is:
   ```js
   n('cust_ext_crossroads', 'Crossroads', 'extract', 8, 62, 1, 'pmc', null)
   //  id                    name          type      x   y  danger faction requiredItem
   ```
   `x`/`y` are 0–100, positioned against the map's `viewBox` (currently
   `0 0 1000 700` for every map — a wide landscape canvas). Overlay your
   reference image and adjust `x`/`y` per node until markers line up with
   the real locations.
3. `danger` (0–10) is a subjective PMC/boss contact risk rating — tune it
   from your own raid experience or community heatmaps.
4. `requiredItem` should be a short human-readable key/item name (e.g.
   `'ZB-013 Key'`) or `null`. Any node with a non-null `requiredItem` shows
   a 🔒 badge and gets excluded when "avoid key-locked" is on.
5. Edges (`e('nodeA', 'nodeB', dist)`) define what's actually pathable and
   how far apart nodes are — the graph is intentionally sparse, not a full
   mesh, so an edge should represent a real, roughly-walkable line of
   travel. `dist` is a relative unit, not meters — keep it internally
   consistent per map rather than trying to match real distances exactly.

### Adding quest waypoints

To make a quest objective show up as a plotted, numbered stop on the map
(not just an item in the sidebar), give its objective a `mapNodeHint` equal
to a node `id` on that map. See `src/data/questsFallback.js` for examples.
This only affects the bundled fallback quests today — extending it to
live-fetched quests would mean building your own
`objectiveId -> nodeId` lookup table, since tarkov.dev doesn't provide one.

## Route planning

- **A\*** (`src/utils/astar.js`) finds a path between two nodes on the
  active map's graph. Edge cost blends raw distance with the danger rating
  of the node being entered; the **Shortest ↔ Safest** slider (0–1) shifts
  the blend from pure distance to danger-weighted.
- **Multi-stop routing**: any selected quest objective with a `mapNodeHint`
  on the current map becomes a waypoint. The planner chains
  spawn → objective 1 → objective 2 → … → extract, running A* leg-by-leg.
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
  api/tarkovApi.js       live GraphQL fetch + cache + fallback
  data/maps/*.js         per-map hand-built node graphs (edit these to refine coordinates)
  data/questsFallback.js offline quest snapshot used when the API is unreachable
  utils/astar.js         pathfinding
  context/AppStateContext.jsx   localStorage-backed app state
  pages/                 Main Menu, Mode/Map/Quest select, Route Planner
  components/MapView.jsx SVG node graph + route rendering
public/maps/             drop real map background images here (see "Refining coordinates")
```

## Known limitations

- Node graphs are a starting skeleton, not survey-accurate — see "Map data"
  above.
- Live quest objectives aren't auto-pinned to map locations (no shared ID
  space in the public API); the bundled fallback quests are, as a worked
  example.
- Only 10 base maps are modeled; map variants (e.g. Factory day/night) share
  the same graph.
