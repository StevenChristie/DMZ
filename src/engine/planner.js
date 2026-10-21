// Loadout planner: turns a list of recipes to craft into a shopping list and a suggested route.
import { recipeById, itemById, resolvePlace, norm } from './data.js';

/**
 * @param {{id:string, qty:number}[]} picks - recipes and how many of each
 * @returns shopping list grouped by type
 */
export function shoppingList(picks) {
  const totals = new Map();
  for (const { id, qty } of picks) {
    const r = recipeById[id];
    if (!r) continue;
    for (const ing of r.ingredients) totals.set(ing.item, (totals.get(ing.item) || 0) + ing.qty * qty);
  }
  const list = [...totals.entries()].map(([id, qty]) => ({ item: itemById[id], qty }));
  const unknown = picks.filter((p) => recipeById[p.id] && recipeById[p.id].ingredients.length === 0).map((p) => recipeById[p.id]);
  return {
    resources: list.filter((l) => l.item.type === 'resource'),
    ingredients: list.filter((l) => l.item.type === 'ingredient' && !l.item.dropsFrom),
    bossDrops: list.filter((l) => l.item.dropsFrom),
    unknownRecipes: unknown,
  };
}

/**
 * Greedy set cover: pick the fewest map stops that cover every needed ingredient,
 * preferring in-game hint locations, then order the stops by nearest neighbour.
 */
export function planRoute(ingredients) {
  const need = new Set(ingredients.map((l) => l.item.id));
  // stop key → { place, covers:Set, score }
  const stops = new Map();
  const unmapped = [];
  for (const { item } of ingredients) {
    let mapped = false;
    for (const f of item.foundIn) {
      const p = resolvePlace(f.at);
      if (!p) continue;
      mapped = true;
      const key = norm(p.name);
      if (!stops.has(key)) stops.set(key, { place: p, covers: new Map() });
      const weight = f.source === 'hint' ? 3 : f.source === 'looted' ? 2 : 1;
      const prev = stops.get(key).covers.get(item.id);
      if (!prev || prev.weight < weight) stops.get(key).covers.set(item.id, { weight, detail: f.detail, source: f.source });
    }
    if (!mapped) unmapped.push(item);
  }
  for (const it of unmapped) need.delete(it.id);

  const chosen = [];
  const remaining = new Set(need);
  while (remaining.size) {
    let best = null, bestScore = 0;
    for (const s of stops.values()) {
      if (chosen.includes(s)) continue;
      let score = 0;
      for (const [id, c] of s.covers) if (remaining.has(id)) score += 10 + c.weight;
      if (score > bestScore) { bestScore = score; best = s; }
    }
    if (!best) break;
    chosen.push(best);
    for (const id of best.covers.keys()) remaining.delete(id);
  }

  // order by nearest neighbour, starting from the westmost stop
  const ordered = [];
  const pool = [...chosen].sort((a, b) => a.place.x - b.place.x);
  let cur = pool.shift();
  while (cur) {
    ordered.push(cur);
    let ni = -1, nd = Infinity;
    pool.forEach((s, i) => {
      const d = (s.place.x - cur.place.x) ** 2 + (s.place.y - cur.place.y) ** 2;
      if (d < nd) { nd = d; ni = i; }
    });
    cur = ni >= 0 ? pool.splice(ni, 1)[0] : null;
  }

  return {
    stops: ordered.map((s) => ({
      ...s.place,
      gets: [...s.covers.entries()]
        .filter(([id]) => need.has(id))
        .map(([id, c]) => ({ item: itemById[id], ...c })),
    })),
    unmapped,
  };
}
