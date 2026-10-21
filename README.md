# Hajin DMZ Planner

An interactive map and resource planner for **Call of Duty: Modern Warfare 4 DMZ** on Hajin. Ask “where can I find Binding Catalyst?” and the map shows you where to look.

## Features
- **Interactive Tac-Map:** official Hajin map tiles plus 137 official markers (strongholds, compounds, caches, clinics, fire and police stations, gas stations, UAV towers, Lieutenant towers). Click any icon or place name for details.
- **Assistant:** free, offline question answering. Handles “where can I find X”, “what do I need for a Medkit”, “what's at NuriGO Mall” and “where are the fire stations”. Matches typos and nicknames (“bio”, “pcb”, “the mall”).
- **Recipes:** all 25 3D Printer recipes, with clickable ingredients.
- **Planner:** pick what to craft and get a shopping list plus the fewest map stops that cover it.
- **Edit Mode** (`?edit=1`): click the map to add loot spots, key doors and exfils, then export them to JSON.

## Getting started
```bash
npm install
npm run tiles   # one-time: downloads the official map tiles into public/tiles (~340 images)
npm run dev     # open http://localhost:5173
```
Edit Mode: http://localhost:5173/?edit=1

Other scripts: `npm test` (search and planner unit tests), `npm run build`, `npm run preview`.

## Updating data
All game data lives in `src/data/`:
| File | What it holds |
|---|---|
| `official-markers.json` | Markers from the official Call of Duty Tac-Map guide (pixel coords on the 4096×4096 map) |
| `pois.json` | The 13 major locations: threat, control, sub-areas, nearby places |
| `items.json` | Resources, ingredients and gear: rarity, in-game hint, `foundIn` spots, boss drops |
| `recipes.json` | 3D Printer recipes |
| `topics.json` | General answers (exfil, bosses, keys, radiation…) |
| `community-markers.json` | Markers exported from Edit Mode. Paste the exported file here to publish them. |

`foundIn.source` is `hint` (in-game Ingredient Locations text), `looted` (player-reported) or `inferred` (our best guess from the hint type).

## Deploying (GitHub Pages)
1. On GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Push to `main`. The workflow in `.github/workflows/deploy.yml` tests, builds and publishes the site to `https://stevenchristie.github.io/DMZ/`.

## Credits
Map imagery and official marker positions © Activision (Call of Duty Hajin Tac-Map guide). Recipes and ingredient hints come from in-game data and community research during early access (Oct 2026), so they may change with patches. Fan-made and not affiliated with Activision. Not for commercial use.
