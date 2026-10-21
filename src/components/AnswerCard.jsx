import { Rarity, Threat, SourceBadge, ItemLink, CatIcon } from './ui.jsx';
import { CATEGORIES } from '../data/categories.js';

/** Renders whatever the search engine returned. `onAsk` lets every item/place be clicked for a follow-up. */
export default function AnswerCard({ answer, onAsk, onFocus }) {
  if (!answer || answer.type === 'empty') return null;

  if (answer.type === 'none') {
    return (
      <div className="card">
        <p className="muted">I couldn't match “{answer.query}” to an item, recipe or place. Try a name like <em>Binding Catalyst</em>, <em>Medkit</em> or <em>NuriGO Mall</em>.</p>
      </div>
    );
  }

  return (
    <div className="card answer">
      {answer.type === 'item' && <ItemAnswer a={answer} onAsk={onAsk} onFocus={onFocus} />}
      {answer.type === 'recipe' && <RecipeAnswer a={answer} onAsk={onAsk} />}
      {answer.type === 'poi' && <PoiAnswer a={answer} onAsk={onAsk} />}
      {answer.type === 'place' && <PlaceAnswer a={answer} onAsk={onAsk} />}
      {answer.type === 'category' && <CategoryAnswer a={answer} />}
      {answer.type === 'topic' && <TopicAnswer a={answer} />}
      {answer.alternatives?.length > 0 && (
        <div className="alts">
          <span className="muted">Did you mean:</span>
          {answer.alternatives.map((e) => (
            <button key={e.kind + e.id} className="chip" onClick={() => onAsk(e.kind === 'recipe' ? `recipe ${e.name}` : e.name)}>{e.name}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function Spots({ spots, onFocus }) {
  return (
    <ol className="spots">
      {spots.map((s, i) => (
        <li key={s.name + i}>
          <button className="spot" onClick={() => onFocus?.({ x: s.x, y: s.y, zoom: 3.5 })}>
            <span className="spot-n">{i + 1}</span>
            <span className="spot-body">
              <b>{s.name}</b>
              {s.detail && <small>{s.detail}</small>}
            </span>
            <SourceBadge source={s.source} label={s.sourceLabel} />
          </button>
        </li>
      ))}
    </ol>
  );
}

function ItemAnswer({ a, onAsk, onFocus }) {
  const it = a.item;
  return (
    <>
      <header className="card-head">
        <h2>{it.name}</h2>
        <Rarity value={it.rarity} />
        <span className="tag">{it.type}</span>
      </header>
      <p className="hint">{it.hint}</p>

      {it.anywhere && <p className="muted">You'll get this from almost anything you loot, so there's no single best spot.</p>}

      {it.dropsFrom && (
        <div className="callout danger">
          <b>Boss drop only.</b> Kill {it.dropsFrom.join(' / ')}. Commanders roam the map and aren't shown on the Tac-Map, so they have no fixed spot.
        </div>
      )}

      {a.spots.length > 0 && (
        <>
          <h3>Where to look</h3>
          <Spots spots={a.spots} onFocus={onFocus} />
        </>
      )}

      {it.unmapped?.length > 0 && (
        <p className="muted small">Also hinted: {it.unmapped.join(', ')}. That spot isn't on the Tac-Map yet; add it in Edit Mode once you find it.</p>
      )}

      {it.markerTypes?.length > 0 && (
        <p className="muted small">Also highlighted: every {it.markerTypes.map((c) => CATEGORIES[c]?.label).join(' and ')} on the map.</p>
      )}

      {it.containers?.length > 0 && (
        <>
          <h3>Search these containers</h3>
          <div className="chips">{it.containers.map((c) => <span key={c} className="chip static">{c}</span>)}</div>
        </>
      )}

      {a.usedIn.length > 0 && (
        <>
          <h3>Used in</h3>
          <div className="chips">
            {a.usedIn.map((r) => <button key={r.id} className="chip" onClick={() => onAsk(`recipe ${r.name}`)}>{r.name}</button>)}
          </div>
        </>
      )}
      {it.levelReward && <p className="muted small">Also a DMZ Level {it.levelReward} reward.</p>}
    </>
  );
}

function RecipeAnswer({ a, onAsk }) {
  const r = a.recipe;
  return (
    <>
      <header className="card-head">
        <h2>{r.name}</h2>
        <span className="tag">{r.category}</span>
      </header>
      <p className="muted">Unlock: {r.unlock}</p>
      {a.parts.length === 0 && <p className="muted">Ingredient quantities aren't known yet for this recipe.</p>}
      <ul className="recipe-parts">
        {a.parts.map((p) => (
          <li key={p.item}>
            <ItemLink item={p.itemObj} qty={p.qty} onAsk={onAsk} />
            <small className="muted">
              {p.itemObj.type === 'resource' ? 'any loot' :
                p.itemObj.dropsFrom ? `drops from ${p.itemObj.dropsFrom.join(' / ')}` :
                p.spots.slice(0, 2).map((s) => s.name).join(', ') || 'location unknown'}
            </small>
          </li>
        ))}
      </ul>
      <p className="muted small">The highlighted areas on the map are where the ingredients turn up. Tap an ingredient for details.</p>
    </>
  );
}

function PoiAnswer({ a, onAsk }) {
  const p = a.poi;
  return (
    <>
      <header className="card-head">
        <h2>{p.name}</h2>
        <Threat value={p.threat} />
        <span className="tag" style={{ '--c': p.control === 'NK' ? '#ef4444' : '#60a5fa' }}>{p.control} control</span>
      </header>
      <p className="muted small">{p.area}{p.threatNote ? ` · ${p.threatNote}` : ''}</p>
      <p>{p.summary}</p>
      {a.items.length > 0 && (
        <>
          <h3>Ingredients found here</h3>
          <div className="chips">{a.items.map((it) => <ItemLink key={it.id} item={it} onAsk={onAsk} />)}</div>
        </>
      )}
      {Object.keys(a.nearby).length > 0 && (
        <>
          <h3>Nearby</h3>
          <div className="nearby">
            {Object.entries(a.nearby).map(([cat, n]) => (
              <span key={cat} className="near"><CatIcon category={cat} size={18} /> {n} {CATEGORIES[cat].label}</span>
            ))}
          </div>
        </>
      )}
      {p.subAreas.length > 0 && <p className="muted small">Areas: {p.subAreas.join(' · ')}</p>}
    </>
  );
}

function PlaceAnswer({ a, onAsk }) {
  return (
    <>
      <header className="card-head"><h2>{a.title}</h2></header>
      {a.parent && (
        <p>Part of <button className="link" onClick={() => onAsk(`what's at ${a.parent.name}`)}>{a.parent.name}</button> ({a.parent.threat} threat).</p>
      )}
      {a.items.length > 0 && (
        <>
          <h3>Ingredients reported here</h3>
          <div className="chips">{a.items.map((it) => <ItemLink key={it.id} item={it} onAsk={onAsk} />)}</div>
        </>
      )}
    </>
  );
}

function CategoryAnswer({ a }) {
  return (
    <>
      <header className="card-head"><CatIcon category={a.category} /><h2>{a.title}</h2></header>
      <p>{a.count} on the map. They're all highlighted, and this layer is switched on.</p>
    </>
  );
}

function TopicAnswer({ a }) {
  return (
    <>
      <header className="card-head"><h2>{a.title}</h2></header>
      <p>{a.topic.body}</p>
    </>
  );
}
