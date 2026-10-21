# DMZ Hajin Planner — Build Plan

Interactive Hajin map for MW4 DMZ, with resource and recipe planning and an assistant that answers "where can I find X?" by highlighting the spots on the map.

**Look:** dmzmap.net style. Near-black UI (#0C1216), yellow accent, slim left icon rail, collapsible side panel, search bar on top, full-screen map. Kept clean, not cluttered like wzhub.

## Decisions (agreed 21 Oct 2026)
| Area | Choice |
|---|---|
| Stack | React + Vite + Leaflet (react-leaflet), `L.CRS.Simple` pixel map |
| Assistant | Free built-in "smart search". No API key, runs fully in the browser |
| Hosting | GitHub Pages, via a GitHub Action from `main` |
| Map image | Official Call of Duty Hajin Tac-Map tiles (see below) |
| Markers | Official markers + researched ingredient zones + a hidden **Edit Mode** so Steve can drop exact spots while playing |

## Data sources
1. **Official Tac-Map:** callofduty.com/guides/modernwarfare4/dmz-maps/hajin
   - Tiles: 256px, zoom 0–4, giving a 4096×4096 map. URL pattern `…/hajin/baselayer/v1/tiles/{z}/{x}/{y}.png`
   - 138 official markers (GeoJSON, pixel coords): 13 POIs, 22 secondary names, 7 strongholds, 6 compounds, 28 ammo/armor caches, 18 gas stations, 6 marine gas stations, 8 clinics, 5 police stations, 6 fire stations, 14 UAV towers, 5 Lieutenant towers
   - Tiles and marker JSON get **copied into the repo** (`public/tiles`, `src/data/official-markers.json`) so the site doesn't depend on Activision's servers. Credit: "Map © Activision".
2. **Researched game data** (see `dmz-research.md`): 25 printer recipes, 4 resources, about 30 ingredients with rarity and in-game location hints, boss drops, FOB unlocks, threat levels.
3. **Edit Mode data:** markers Steve places, exported as JSON and committed to the repo.

## Data model (`src/data/`)
- `pois.json`: id, name, x, y, threat, control (NK/SK), sub-areas
- `markers.json`: id, category, name, x, y, notes, source (`official` | `community` | `steve`), verified
- `items.json`: id, name, type (resource/ingredient/gear), rarity, `foundIn` (POI ids + container types), `dropsFrom` (bosses), hint text
- `recipes.json`: id, name, category, unlock, ingredients [{item, qty}]
- `aliases.json`: synonyms for search ("meds" → Medkit, "binding" → Binding Catalyst, "hospital" → Mirae General Hospital)

## Features — MVP (v1)
1. **Map:** pan and zoom; clickable icons with popups (name, type, threat, what's found there); layer toggles per category; POI labels that scale with zoom; grid overlay A–J / 0–9.
2. **Search / Assistant panel:**
   - "Where can I find Binding Catalyst?" → answer card (rarity, hint, best POIs), pins and halos on the map, map flies to the best spot.
   - "What do I need for a Medkit?" → recipe card; each ingredient clickable to show its locations.
   - "What's at NuriGO Mall?" → POI card with threat, loot and ingredients.
   - Engine: intent detection (where / recipe / what's-at / boss), fuzzy matching (Fuse.js) over items, recipes, POIs and aliases. No AI cost.
3. **Recipe browser:** all 25 recipes, filter by category and unlock level.
4. **Loadout planner:** pick recipes you want to craft → total shopping list → "Plan route" highlights every POI that covers the list, sorted by fewest stops.
5. **Edit Mode** (unlocked with `?edit=1`): click the map to add a marker (category, name, notes), drag to adjust, export/import JSON. Saved in localStorage until exported.

## Later (v2+)
- Keys and loot-room layer (as keys get documented)
- Shareable plan links (URL-encoded loadout)
- Optional Claude API assistant (Vercel function) plugged into the same panel
- Mobile layout polish; PWA so it works on a second screen while playing

## Project structure
```
DMZ/
  public/tiles/{z}/{x}/{y}.png
  src/
    components/  MapView, IconRail, SidePanel, SearchBar, AnswerCard, RecipeList, Planner, EditMode
    data/        pois, markers, items, recipes, aliases, official-markers
    engine/      search.js (intent + fuzzy), planner.js (route/shopping list)
    styles/      tokens.css (colours, spacing)
  .github/workflows/deploy.yml
  PLAN.md  dmz-research.md  README.md
```

## Milestones
1. Repo connected; Vite + React scaffold; GitHub Pages deploy working (empty map)
2. Tiles downloaded; Leaflet map with official markers and layer toggles
3. Data files (items, recipes, aliases) and search engine with unit tests
4. Assistant panel with map highlighting
5. Recipe browser and loadout planner
6. Edit Mode, then polish, credits and README

## Risks / notes
- **Early-access data:** recipes and spawns may change at launch (Fri 23 Oct). All data lives in JSON, so it's easy to update.
- **Map assets are © Activision.** Fine for a credited fan site. Don't sell the site or the map.
- Exact ingredient spawn spots aren't published. v1 shows POI-level zones; Edit Mode fills in precise spots.
