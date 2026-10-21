// The "assistant": free, offline question answering over our DMZ data.
// 1. Work out the intent (where / recipe / place info / topic).
// 2. Find the entity (item, recipe, POI, marker type or topic) by alias match, then fuzzy match.
// 3. Build an answer object the UI renders as a card plus map highlights.
import Fuse from 'fuse.js';
import {
  items, recipes, pois, topics, officialMarkers, itemById, poiById,
  resolvePlace, recipesUsing, itemsAtPoi, markersNearPoi, markersOfType, norm,
} from './data.js';
import { CATEGORIES } from '../data/categories.js';

// ---------- entity index ----------
const CATEGORY_ALIASES = {
  ammoCache: ['ammo cache', 'armor cache', 'armour cache', 'cache', 'caches', 'ammo crate', 'resupply'],
  clinic: ['clinic', 'clinics'],
  fireStation: ['fire station', 'fire stations', 'firehouse'],
  policeStation: ['police station', 'police', 'police stations', 'cop shop'],
  gasStation: ['gas station', 'gas stations', 'petrol station', 'fuel station', 'refuel', 'repair vehicle'],
  marineGasStation: ['marine gas station', 'boat fuel', 'marina'],
  uavTower: ['uav tower', 'uav', 'uav towers', 'radar'],
  lieutenantHunt: ['lieutenant tower', 'lieutenant hunt', 'lt tower'],
  compound: ['compound', 'compounds'],
  fortress: ['stronghold', 'strongholds', 'fortress'],
};

function buildEntities() {
  const list = [];
  for (const it of items) list.push({ kind: 'item', id: it.id, name: it.name, terms: [it.name, ...(it.aliases || [])] });
  for (const r of recipes) list.push({ kind: 'recipe', id: r.id, name: r.name, terms: [r.name] });
  for (const p of pois) list.push({ kind: 'poi', id: p.id, name: p.name, terms: [p.name, ...p.aliases, ...p.subAreas] });
  // secondary places → their own entity (resolved to coordinates)
  const seen = new Set(pois.map((p) => norm(p.name)));
  for (const m of officialMarkers) {
    if (!['poiLabelSecondary', 'fortress', 'compound'].includes(m.category)) continue;
    if (seen.has(norm(m.name))) continue;
    seen.add(norm(m.name));
    list.push({ kind: 'place', id: m.name, name: m.name, terms: [m.name] });
  }
  for (const [cat, al] of Object.entries(CATEGORY_ALIASES)) {
    list.push({ kind: 'category', id: cat, name: CATEGORIES[cat].label, terms: [CATEGORIES[cat].label, ...al] });
  }
  for (const t of topics) list.push({ kind: 'topic', id: t.id, name: t.name, terms: [t.name, ...t.aliases] });
  return list;
}

export const ENTITIES = buildEntities();

// Flat list of (term → entity) for exact phrase matching, longest terms first.
const TERMS = ENTITIES.flatMap((e) => e.terms.map((t) => ({ term: norm(t), entity: e })))
  .filter((t) => t.term.length >= 2)
  .sort((a, b) => b.term.length - a.term.length);

const fuse = new Fuse(
  ENTITIES.flatMap((e) => e.terms.map((t) => ({ t, e }))),
  { keys: ['t'], threshold: 0.34, ignoreLocation: true, includeScore: true, minMatchCharLength: 3 },
);

// Specific kinds beat general ones when the same phrase matches several entities.
const KIND_PRIORITY = { recipe: 0, item: 1, poi: 2, place: 3, category: 4, topic: 5 };

const STOP = new Set(('where can i find get the a an of to in at on is are what whats do does need for how make craft print ' +
  'farm loot looting best spot spots location locations find me show tell about info recipe recipes ingredients ingredient ' +
  'some any good place places there it this that with please you near closest nearest go should hajin dmz').split(' '));

// ---------- intent ----------
const RE = {
  recipe: /\b(how (do|can) i (make|craft|print|build)|recipe|ingredients? (for|of|to)|what do i need|need (for|to make)|craft|print(ing)?|make an?|cost of)\b/,
  where: /\b(where|find|get|farm|locat|spawn|look for|search for|drop|drops)\b/,
  place: /\b(what('?s| is) (at|in)|tell me about|info on|loot (at|in)|threat|how dangerous|about)\b/,
  usedFor: /\b(used (for|in)|what is .* for|what can i (make|craft) with|uses? of)\b/,
};

export function detectIntent(q) {
  const s = q.toLowerCase();
  if (RE.usedFor.test(s)) return 'usedFor';
  if (RE.recipe.test(s)) return 'recipe';
  if (RE.place.test(s)) return 'place';
  if (RE.where.test(s)) return 'where';
  return 'auto';
}

/** Find the best entity mentioned in a query. Returns { entity, alternatives }. */
export function findEntity(q) {
  const s = ` ${norm(q)} `;
  // 1) exact phrase match on any name/alias (longest wins, then kind priority)
  const exact = [];
  for (const { term, entity } of TERMS) {
    if (s.includes(` ${term} `)) exact.push({ term, entity });
  }
  if (exact.length) {
    const maxLen = exact[0].term.length;
    const top = exact.filter((x) => x.term.length === maxLen)
      .sort((a, b) => KIND_PRIORITY[a.entity.kind] - KIND_PRIORITY[b.entity.kind]);
    const alts = dedupe(exact.map((x) => x.entity)).filter((e) => e !== top[0].entity).slice(0, 4);
    return { entity: top[0].entity, alternatives: alts };
  }
  // 2) fuzzy match on the query with filler words removed
  const core = norm(q).split(' ').filter((w) => !STOP.has(w)).join(' ');
  if (!core) return { entity: null, alternatives: [] };
  const hits = fuse.search(core).slice(0, 8);
  if (!hits.length) return { entity: null, alternatives: [] };
  const ents = dedupe(hits.map((h) => h.item.e));
  return { entity: ents[0], alternatives: ents.slice(1, 5) };
}

function dedupe(arr) {
  const seen = new Set();
  return arr.filter((e) => { const k = e.kind + e.id; if (seen.has(k)) return false; seen.add(k); return true; });
}

// ---------- answers ----------
const SOURCE_LABEL = { hint: 'In-game hint', looted: 'Player-reported', inferred: 'Likely (matches the hint type)' };

export function placesForItem(item) {
  const spots = [];
  for (const f of item.foundIn || []) {
    const p = resolvePlace(f.at);
    if (p) spots.push({ ...p, detail: f.detail, source: f.source, sourceLabel: SOURCE_LABEL[f.source] });
  }
  // hints first, then player reports, then inferred
  const rank = { hint: 0, looted: 1, inferred: 2 };
  return spots.sort((a, b) => rank[a.source] - rank[b.source]);
}

function highlightsForItem(item, extraMarkers) {
  const hl = placesForItem(item).map((p) => ({ x: p.x, y: p.y, label: p.name, strength: p.source === 'hint' ? 2 : 1 }));
  for (const cat of item.markerTypes || []) {
    for (const m of markersOfType(cat, extraMarkers)) hl.push({ x: m.x, y: m.y, label: m.name, strength: 1, small: true });
  }
  return hl;
}

function itemAnswer(item, extraMarkers) {
  const spots = placesForItem(item);
  return {
    type: 'item',
    title: item.name,
    item,
    spots,
    usedIn: recipesUsing(item.id),
    highlights: highlightsForItem(item, extraMarkers),
  };
}

function recipeAnswer(recipe, extraMarkers) {
  const parts = recipe.ingredients.map((ing) => {
    const it = itemById[ing.item];
    return { ...ing, itemObj: it, spots: placesForItem(it) };
  });
  const highlights = parts.flatMap((p) => (p.itemObj.type === 'resource' ? [] : highlightsForItem(p.itemObj, extraMarkers).filter((h) => !h.small)));
  return { type: 'recipe', title: recipe.name, recipe, parts, highlights };
}

function poiAnswer(poi) {
  return {
    type: 'poi', title: poi.name, poi,
    items: itemsAtPoi(poi.id),
    nearby: markersNearPoi(poi.id),
    highlights: [{ x: poi.x, y: poi.y, label: poi.name, strength: 2 }],
    focus: { x: poi.x, y: poi.y, zoom: 3 },
  };
}

function placeAnswer(name) {
  const p = resolvePlace(name);
  const parent = p?.poiId ? poiById[p.poiId] : null;
  return {
    type: 'place', title: name, place: p, parent,
    items: parent ? itemsAtPoi(parent.id).filter((it) => it.foundIn.some((f) => norm(f.at) === norm(name))) : [],
    highlights: p ? [{ x: p.x, y: p.y, label: name, strength: 2 }] : [],
    focus: p ? { x: p.x, y: p.y, zoom: 3 } : null,
  };
}

function categoryAnswer(cat, extraMarkers) {
  const ms = markersOfType(cat, extraMarkers);
  return {
    type: 'category', title: CATEGORIES[cat].label, category: cat, count: ms.length,
    highlights: ms.map((m) => ({ x: m.x, y: m.y, label: m.name, strength: 1 })),
    showLayer: cat,
  };
}

function topicAnswer(topic, extraMarkers) {
  const hl = topic.markerTypes.flatMap((c) => markersOfType(c, extraMarkers).map((m) => ({ x: m.x, y: m.y, label: m.name, strength: 1 })));
  return { type: 'topic', title: topic.name, topic, highlights: hl, showLayer: topic.markerTypes[0] };
}

/**
 * Main entry point.
 * @param {string} query - what the player typed
 * @param {object[]} extraMarkers - community / Edit Mode markers
 */
export function ask(query, extraMarkers = []) {
  const q = (query || '').trim();
  if (!q) return { type: 'empty' };
  const intent = detectIntent(q);
  const { entity, alternatives } = findEntity(q);
  if (!entity) return { type: 'none', query: q };

  let answer;
  switch (entity.kind) {
    case 'item': {
      const it = itemById[entity.id];
      // "how do I make X" where X is an item: show what it's used in (items aren't craftable recipes)
      answer = itemAnswer(it, extraMarkers);
      if (intent === 'usedFor') answer.emphasis = 'usedIn';
      break;
    }
    case 'recipe':
      answer = recipeAnswer(recipes.find((r) => r.id === entity.id), extraMarkers);
      break;
    case 'poi':
      answer = poiAnswer(poiById[entity.id]);
      break;
    case 'place':
      answer = placeAnswer(entity.id);
      break;
    case 'category':
      answer = categoryAnswer(entity.id, extraMarkers);
      break;
    case 'topic':
      answer = topicAnswer(topics.find((t) => t.id === entity.id), extraMarkers);
      break;
    default:
      answer = { type: 'none', query: q };
  }
  return { ...answer, intent, query: q, alternatives };
}

/** Lightweight suggestions while typing. */
export function suggest(text, limit = 6) {
  const s = norm(text);
  if (s.length < 2) return [];
  const starts = ENTITIES.filter((e) => e.terms.some((t) => norm(t).startsWith(s)));
  const rest = fuse.search(s).map((h) => h.item.e);
  return dedupe([...starts, ...rest]).slice(0, limit);
}

export const EXAMPLE_QUESTIONS = [
  'Where can I find Binding Catalyst?',
  'What do I need for a Medkit?',
  "What's at NuriGO Mall?",
  'Where are the fire stations?',
  'Where do I get Nano-Structured Alloy?',
  'How do I deal with radiation?',
];
