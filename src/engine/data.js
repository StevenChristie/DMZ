// Loads all JSON data and builds lookup helpers used by the search engine, planner and map.
import officialMarkers from '../data/official-markers.json';
import pois from '../data/pois.json';
import items from '../data/items.json';
import recipes from '../data/recipes.json';
import topics from '../data/topics.json';
import { CATEGORIES } from '../data/categories.js';

export { officialMarkers, pois, items, recipes, topics };

export const itemById = Object.fromEntries(items.map((i) => [i.id, i]));
export const poiById = Object.fromEntries(pois.map((p) => [p.id, p]));
export const recipeById = Object.fromEntries(recipes.map((r) => [r.id, r]));

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Every named place on the map (major POIs, secondary labels, strongholds, compounds) → coordinates.
const placeIndex = new Map();
for (const m of officialMarkers) {
  if (['poiLabel', 'poiLabelSecondary', 'fortress', 'compound'].includes(m.category)) {
    if (!placeIndex.has(norm(m.name))) placeIndex.set(norm(m.name), m);
  }
}

/** Resolve a `foundIn.at` value (POI id or place name) to { name, x, y, poiId? }. */
export function resolvePlace(at) {
  if (poiById[at]) {
    const p = poiById[at];
    return { name: p.name, x: p.x, y: p.y, poiId: p.id };
  }
  const m = placeIndex.get(norm(at));
  if (m) return { name: m.name, x: m.x, y: m.y, poiId: parentPoiOf(m.name) };
  return null;
}

/** Which major POI a secondary place belongs to (by the POI's `places` list, else nearest). */
export function parentPoiOf(placeName) {
  const n = norm(placeName);
  const owner = pois.find((p) => norm(p.name) === n || p.places.some((pl) => norm(pl) === n) || p.subAreas.some((s) => norm(s) === n));
  if (owner) return owner.id;
  const m = placeIndex.get(n);
  if (!m) return null;
  return nearestPoi(m.x, m.y).id;
}

export function nearestPoi(x, y) {
  let best = null, bestD = Infinity;
  for (const p of pois) {
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

export function markersOfType(category, extra = []) {
  return [...officialMarkers, ...extra].filter((m) => m.category === category);
}

/** Recipes that use a given item. */
export function recipesUsing(itemId) {
  return recipes.filter((r) => r.ingredients.some((i) => i.item === itemId));
}

/** Items found at a POI (directly or via one of its places). */
export function itemsAtPoi(poiId) {
  const p = poiById[poiId];
  const names = new Set([norm(p.name), ...p.places.map(norm), ...p.subAreas.map(norm)]);
  return items.filter((it) => it.foundIn.some((f) => f.at === poiId || names.has(norm(f.at))));
}

/** Official markers within `radius` px of a POI, grouped by category. */
export function markersNearPoi(poiId, radius = 220) {
  const p = poiById[poiId];
  const out = {};
  for (const m of officialMarkers) {
    if (!CATEGORIES[m.category]) continue;
    if ((m.x - p.x) ** 2 + (m.y - p.y) ** 2 <= radius ** 2) out[m.category] = (out[m.category] || 0) + 1;
  }
  return out;
}

export { norm };
