import { describe, it, expect } from 'vitest';
import { ask, findEntity, detectIntent } from './search.js';
import { shoppingList, planRoute } from './planner.js';
import { items, recipes, resolvePlace, officialMarkers } from './data.js';

describe('data integrity', () => {
  it('every foundIn location resolves to map coordinates', () => {
    const bad = items.flatMap((i) => i.foundIn.filter((f) => !resolvePlace(f.at)).map((f) => `${i.id} → ${f.at}`));
    expect(bad).toEqual([]);
  });
  it('every recipe ingredient exists', () => {
    const ids = new Set(items.map((i) => i.id));
    const bad = recipes.flatMap((r) => r.ingredients.filter((g) => !ids.has(g.item)).map((g) => g.item));
    expect(bad).toEqual([]);
  });
  it('official markers sit inside the 4096px map', () => {
    expect(officialMarkers.every((m) => m.x > 0 && m.x < 4096 && m.y > 0 && m.y < 4096)).toBe(true);
  });
});

describe('intent detection', () => {
  it.each([
    ['Where can I find Binding Catalyst?', 'where'],
    ['What do I need for a Medkit?', 'recipe'],
    ['how do i craft a revive pistol', 'recipe'],
    ["What's at NuriGO Mall?", 'place'],
    ['what is stock rod used for', 'usedFor'],
  ])('%s → %s', (q, intent) => expect(detectIntent(q)).toBe(intent));
});

describe('entity matching', () => {
  it.each([
    ['Where can I find Binding Catalyst?', 'item', 'binding-catalyst'],
    ['where do i get bio', 'item', 'biomaterials'],
    ['biomaterals', 'item', 'biomaterials'], // typo
    ['What do I need for a Medkit?', 'recipe', 'medkit'],
    ['large secure backpack recipe', 'recipe', 'large-secure-backpack'],
    ["What's at the mall?", 'poi', 'nurigo'],
    ['tell me about the reactor', 'poi', 'reactor'],
    ['where are the fire stations', 'category', 'fireStation'],
    ['where is a gas station', 'category', 'gasStation'],
    ['where do i find a gas mask', 'item', 'gas-mask'],
    ['how do i exfil', 'topic', 'exfil'],
    ['where is compound bravo', 'place', 'Compound Bravo'],
    ['pcb', 'item', 'pcb'],
  ])('%s', (q, kind, id) => {
    const { entity } = findEntity(q);
    expect(entity?.kind).toBe(kind);
    expect(entity?.id).toBe(id);
  });
  it('returns nothing for gibberish', () => {
    expect(ask('qwzzxv plorf').type).toBe('none');
  });
});

describe('answers', () => {
  it('item answer lists hint spots first and highlights them', () => {
    const a = ask('where can I find binding catalyst');
    expect(a.type).toBe('item');
    expect(a.spots[0].name).toBe('Mirae General Hospital');
    expect(a.highlights.length).toBeGreaterThan(0);
    expect(a.usedIn.map((r) => r.id)).toContain('medkit');
  });
  it('recipe answer includes each ingredient with locations', () => {
    const a = ask('what do I need for a medkit');
    expect(a.parts.map((p) => p.item)).toEqual(['chemicals', 'binding-catalyst', 'biomaterials']);
    expect(a.highlights.length).toBeGreaterThan(0);
  });
  it('boss-only items explain the drop source', () => {
    const a = ask('where do i get nano structured alloy');
    expect(a.item.dropsFrom).toEqual(['Tank']);
  });
  it('category answer highlights every marker', () => {
    expect(ask('ammo caches').count).toBe(28);
  });
});

describe('planner', () => {
  it('totals ingredients across recipes', () => {
    const list = shoppingList([{ id: 'medkit', qty: 2 }, { id: 'self-revive', qty: 1 }]);
    const bc = list.ingredients.find((l) => l.item.id === 'binding-catalyst');
    expect(bc.qty).toBe(2 * 1 + 3);
    expect(list.resources.find((l) => l.item.id === 'chemicals').qty).toBe(60);
  });
  it('route covers every mappable ingredient with few stops', () => {
    const list = shoppingList([{ id: 'medkit', qty: 1 }, { id: 'revive-pistol', qty: 1 }]);
    const route = planRoute(list.ingredients);
    const covered = new Set(route.stops.flatMap((s) => s.gets.map((g) => g.item.id)));
    for (const l of list.ingredients) expect(covered.has(l.item.id)).toBe(true);
    expect(route.stops.length).toBeLessThanOrEqual(3);
  });
  it('separates boss drops', () => {
    const list = shoppingList([{ id: 'large-secure-backpack', qty: 1 }]);
    expect(list.bossDrops.map((l) => l.item.id)).toEqual(['prototype-rf']);
  });
});
