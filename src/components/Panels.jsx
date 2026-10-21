import { useMemo, useState } from 'react';
import { CATEGORIES, LAYER_GROUPS } from '../data/categories.js';
import { recipes, itemById } from '../engine/data.js';
import { shoppingList, planRoute } from '../engine/planner.js';
import { CatIcon, ItemLink, SourceBadge, Rarity, Threat } from './ui.jsx';
import { poiById } from '../engine/data.js';

// ---------------- Layers ----------------
export function LayersPanel({ visible, setVisible, counts, showSecondary, setShowSecondary }) {
  const toggle = (cat) => setVisible((v) => (v.includes(cat) ? v.filter((c) => c !== cat) : [...v, cat]));
  const all = Object.keys(CATEGORIES);
  return (
    <div className="panel-body">
      <div className="row-between">
        <button className="btn ghost" onClick={() => setVisible(all)}>Show all</button>
        <button className="btn ghost" onClick={() => setVisible([])}>Hide all</button>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={showSecondary} onChange={(e) => setShowSecondary(e.target.checked)} />
        <span>Small place names</span>
      </label>
      {LAYER_GROUPS.map((g) => {
        const cats = all.filter((c) => CATEGORIES[c].group === g);
        return (
          <section key={g}>
            <h3>{g}</h3>
            {cats.map((c) => (
              <label key={c} className={`layer${visible.includes(c) ? ' on' : ''}`}>
                <input type="checkbox" checked={visible.includes(c)} onChange={() => toggle(c)} />
                <CatIcon category={c} />
                <span>{CATEGORIES[c].label}</span>
                <span className="count">{counts[c] || 0}</span>
              </label>
            ))}
          </section>
        );
      })}
    </div>
  );
}

// ---------------- Recipes ----------------
export function RecipesPanel({ onAsk, onAddToPlan }) {
  const [filter, setFilter] = useState('All');
  const [q, setQ] = useState('');
  const cats = ['All', ...new Set(recipes.map((r) => r.category))];
  const list = recipes.filter((r) => (filter === 'All' || r.category === filter) && r.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="panel-body">
      <input className="input" placeholder="Filter recipes…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips">
        {cats.map((c) => <button key={c} className={`chip${filter === c ? ' active' : ''}`} onClick={() => setFilter(c)}>{c}</button>)}
      </div>
      {list.map((r) => (
        <article key={r.id} className="recipe">
          <header>
            <button className="link strong" onClick={() => onAsk(`recipe ${r.name}`)}>{r.name}</button>
            <button className="btn tiny" onClick={() => onAddToPlan(r.id)} title="Add to planner">+ Plan</button>
          </header>
          <small className="muted">{r.category} · {r.unlock}</small>
          <div className="chips">
            {r.ingredients.length === 0 && <span className="muted small">Quantities unknown</span>}
            {r.ingredients.map((i) => <ItemLink key={i.item} item={itemById[i.item]} qty={i.qty} onAsk={onAsk} />)}
          </div>
        </article>
      ))}
    </div>
  );
}

// ---------------- Planner ----------------
export function PlannerPanel({ plan, setPlan, onShowRoute, onAsk }) {
  const picks = Object.entries(plan).map(([id, qty]) => ({ id, qty }));
  const list = useMemo(() => shoppingList(picks), [plan]); // eslint-disable-line react-hooks/exhaustive-deps
  const route = useMemo(() => planRoute(list.ingredients), [list]);
  const setQty = (id, qty) => setPlan((p) => {
    const n = { ...p };
    if (qty <= 0) delete n[id]; else n[id] = qty;
    return n;
  });
  const [adding, setAdding] = useState('');

  return (
    <div className="panel-body">
      <p className="muted small">Pick what you want to craft. You'll get a shopping list and the fewest stops that cover it.</p>
      <div className="row">
        <select className="input" value={adding} onChange={(e) => setAdding(e.target.value)}>
          <option value="">Add a recipe…</option>
          {recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <button className="btn" disabled={!adding} onClick={() => { setQty(adding, (plan[adding] || 0) + 1); setAdding(''); }}>Add</button>
      </div>

      {picks.length === 0 && <div className="empty">Nothing planned yet. Add recipes here or use “+ Plan” in Recipes.</div>}

      {picks.length > 0 && (
        <>
          <h3>Crafting</h3>
          {picks.map(({ id, qty }) => (
            <div key={id} className="plan-row">
              <span>{recipes.find((r) => r.id === id).name}</span>
              <div className="stepper">
                <button onClick={() => setQty(id, qty - 1)} aria-label="Less">−</button>
                <b>{qty}</b>
                <button onClick={() => setQty(id, qty + 1)} aria-label="More">+</button>
              </div>
            </div>
          ))}

          <h3>Shopping list</h3>
          <div className="chips">
            {[...list.resources, ...list.ingredients, ...list.bossDrops].map((l) => <ItemLink key={l.item.id} item={l.item} qty={l.qty} onAsk={onAsk} />)}
          </div>
          {list.unknownRecipes.length > 0 && <p className="muted small">Unknown quantities for: {list.unknownRecipes.map((r) => r.name).join(', ')}.</p>}

          {route.stops.length > 0 && (
            <>
              <div className="row-between"><h3>Route ({route.stops.length} stops)</h3>
                <button className="btn" onClick={() => onShowRoute(route)}>Show on map</button></div>
              <ol className="spots">
                {route.stops.map((s, i) => (
                  <li key={s.name} className="route-stop">
                    <span className="spot-n">{i + 1}</span>
                    <div>
                      <div className="row"><b>{s.name}</b>{s.poiId && poiById[s.poiId] && <Threat value={poiById[s.poiId].threat} />}</div>
                      <div className="gets">
                        {s.gets.map((g) => (
                          <span key={g.item.id}>{g.item.name}{g.detail ? <small> ({g.detail})</small> : null} <SourceBadge source={g.source} /></span>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
          {list.resources.length > 0 && <p className="muted small">Basic resources ({list.resources.map((l) => l.item.name).join(', ')}) come from general looting on the way.</p>}
          {list.bossDrops.length > 0 && (
            <div className="callout danger small">
              Boss drops needed: {list.bossDrops.map((l) => `${l.item.name} (${l.item.dropsFrom.join('/')})`).join(', ')}.
            </div>
          )}
          {route.unmapped.length > 0 && <p className="muted small">No mapped location yet: {route.unmapped.map((i) => i.name).join(', ')}.</p>}
          <button className="btn ghost" onClick={() => setPlan({})}>Clear plan</button>
        </>
      )}
    </div>
  );
}

// ---------------- Marker details ----------------
export function MarkerPanel({ marker, onAsk, editMode, onDelete }) {
  const c = CATEGORIES[marker.category];
  return (
    <div className="card">
      <header className="card-head"><CatIcon category={marker.category} /><h2>{marker.name}</h2></header>
      <p className="muted small">{c?.label} · {marker.source === 'official' ? 'Official Tac-Map' : marker.source === 'steve' ? 'Added in Edit Mode' : 'Community'} · {marker.x}, {marker.y}</p>
      {marker.notes && <p>{marker.notes}</p>}
      {marker.nearPoi && <p>Near <button className="link" onClick={() => onAsk(`what's at ${marker.nearPoi.name}`)}>{marker.nearPoi.name}</button>.</p>}
      {editMode && marker.source === 'steve' && <button className="btn danger" onClick={() => onDelete(marker.id)}>Delete marker</button>}
    </div>
  );
}

// ---------------- Edit mode ----------------
const EDIT_CATS = ['loot', 'key', 'exfil', 'custom', 'ammoCache', 'clinic', 'fireStation', 'policeStation', 'gasStation', 'uavTower'];

export function EditPanel({ draft, setDraft, onSave, myMarkers, onExport, onImport, onClearAll }) {
  return (
    <div className="panel-body">
      <p className="muted small">Edit Mode: click the map to drop a marker, then save it. Drag your markers to adjust them. They're kept in this browser. Use <b>Export</b> to get a JSON file, then put it in <code>src/data/community-markers.json</code> to publish it.</p>
      {draft ? (
        <div className="card">
          <h3>New marker at {draft.x}, {draft.y}</h3>
          <label className="field">Type
            <select className="input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
              {EDIT_CATS.map((c) => <option key={c} value={c}>{CATEGORIES[c].label}</option>)}
            </select>
          </label>
          <label className="field">Name
            <input className="input" autoFocus value={draft.name} placeholder="e.g. Binding Catalyst spawn" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label className="field">Notes
            <textarea className="input" rows={3} value={draft.notes} placeholder="Which floor, which container, which key…" onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </label>
          <div className="row">
            <button className="btn" disabled={!draft.name.trim()} onClick={onSave}>Save marker</button>
            <button className="btn ghost" onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </div>
      ) : <div className="empty">Click anywhere on the map to place a marker.</div>}

      <h3>My markers ({myMarkers.length})</h3>
      <ul className="mine">
        {myMarkers.map((m) => <li key={m.id}><CatIcon category={m.category} size={16} /> {m.name}</li>)}
      </ul>
      <div className="row">
        <button className="btn" onClick={onExport} disabled={!myMarkers.length}>Export JSON</button>
        <label className="btn ghost">Import<input type="file" accept="application/json" hidden onChange={onImport} /></label>
        <button className="btn ghost danger" onClick={onClearAll} disabled={!myMarkers.length}>Clear</button>
      </div>
    </div>
  );
}

export function AboutPanel() {
  return (
    <div className="panel-body prose">
      <p>A fan-made planner for <b>Call of Duty: Modern Warfare 4 DMZ</b> on Hajin.</p>
      <h3>Data sources</h3>
      <ul>
        <li>Map imagery and official markers: the official Call of Duty Hajin Tac-Map guide. © Activision.</li>
        <li>Ingredient hints: the in-game 3D Printer “Ingredient Locations” screen.</li>
        <li>“Reported” spots: community loot reports from early access.</li>
        <li>“Likely” spots: our best guess from the hint type (e.g. “industrial areas”).</li>
      </ul>
      <p className="muted small">Data is from early access (Oct 2026) and may change with patches. Not affiliated with Activision.</p>
      <h3>Legend</h3>
      <p><Rarity value="Uncommon" /> <Rarity value="Rare" /> <Rarity value="Epic" /> <Rarity value="Boss" /></p>
    </div>
  );
}
