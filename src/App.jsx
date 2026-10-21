import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapView from './components/MapView.jsx';
import AnswerCard from './components/AnswerCard.jsx';
import { LayersPanel, RecipesPanel, PlannerPanel, MarkerPanel, EditPanel, AboutPanel } from './components/Panels.jsx';
import { Icon } from './components/ui.jsx';
import { ask, suggest, EXAMPLE_QUESTIONS } from './engine/search.js';
import { officialMarkers, nearestPoi, poiById } from './engine/data.js';
import { CATEGORIES, DEFAULT_VISIBLE } from './data/categories.js';
import communityMarkers from './data/community-markers.json';

const EDIT_ENABLED = new URLSearchParams(window.location.search).has('edit');

// localStorage helpers (wrapped: storage can be blocked in private windows)
const load = (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

const PANELS = [
  { id: 'assistant', label: 'Assistant', icon: 'assistant' },
  { id: 'layers', label: 'Layers', icon: 'layers' },
  { id: 'recipes', label: 'Recipes', icon: 'recipes' },
  { id: 'planner', label: 'Planner', icon: 'planner' },
  ...(EDIT_ENABLED ? [{ id: 'edit', label: 'Edit Mode', icon: 'edit' }] : []),
  { id: 'about', label: 'About', icon: 'info' },
];

export default function App() {
  const [panel, setPanel] = useState(() => (window.innerWidth > 760 ? 'assistant' : null));
  const [visible, setVisible] = useState(() => load('dmz.visible', DEFAULT_VISIBLE));
  const [showSecondary, setShowSecondary] = useState(() => load('dmz.secondary', true));
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState(null);
  const [highlights, setHighlights] = useState([]);
  const [focus, setFocus] = useState(null);
  const [selected, setSelected] = useState(null);
  const [plan, setPlan] = useState(() => load('dmz.plan', {}));
  const [myMarkers, setMyMarkers] = useState(() => load('dmz.myMarkers', []));
  const [draft, setDraft] = useState(null);
  const [sugs, setSugs] = useState([]);
  const [sugIndex, setSugIndex] = useState(-1);
  const inputRef = useRef(null);

  useEffect(() => save('dmz.visible', visible), [visible]);
  useEffect(() => save('dmz.secondary', showSecondary), [showSecondary]);
  useEffect(() => save('dmz.plan', plan), [plan]);
  useEffect(() => save('dmz.myMarkers', myMarkers), [myMarkers]);

  const editMode = EDIT_ENABLED && panel === 'edit';

  const extraMarkers = useMemo(() => [...communityMarkers.map((m) => ({ source: 'community', ...m })), ...myMarkers], [myMarkers]);
  const iconMarkers = useMemo(
    () => [...officialMarkers.filter((m) => CATEGORIES[m.category]), ...extraMarkers],
    [extraMarkers],
  );
  const labels = useMemo(() => officialMarkers
    .filter((m) => m.category === 'poiLabel' || (showSecondary && m.category === 'poiLabelSecondary'))
    .map((m) => ({ ...m, primary: m.category === 'poiLabel' })), [showSecondary]);
  const counts = useMemo(() => iconMarkers.reduce((a, m) => ({ ...a, [m.category]: (a[m.category] || 0) + 1 }), {}), [iconMarkers]);

  const runQuery = useCallback((q) => {
    const a = ask(q, extraMarkers);
    setQuery(q);
    setAnswer(a);
    setSelected(null);
    setSugs([]);
    setPanel('assistant');
    setFocus(a.focus ? { ...a.focus } : null);
    setHighlights(a.highlights || []);
    if (a.showLayer && !visible.includes(a.showLayer)) setVisible((v) => [...v, a.showLayer]);
  }, [extraMarkers, visible]);

  const clearAnswer = () => { setAnswer(null); setHighlights([]); setQuery(''); setFocus(null); };

  const onType = (v) => { setQuery(v); setSugs(suggest(v)); setSugIndex(-1); };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' && sugs.length) { e.preventDefault(); setSugIndex((i) => Math.min(i + 1, sugs.length - 1)); }
    else if (e.key === 'ArrowUp' && sugs.length) { e.preventDefault(); setSugIndex((i) => Math.max(i - 1, -1)); }
    else if (e.key === 'Escape') setSugs([]);
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (sugIndex >= 0) pickSuggestion(sugs[sugIndex]); else if (query.trim()) runQuery(query);
    }
  };
  const pickSuggestion = (s) => runQuery(s.kind === 'recipe' ? `recipe ${s.name}` : s.kind === 'item' ? `where can I find ${s.name}` : s.name);

  // keyboard shortcut: "/" focuses search
  useEffect(() => {
    const h = (e) => { if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') { e.preventDefault(); inputRef.current?.focus(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const onMarkerClick = (m) => {
    setSelected({ ...m, nearPoi: nearestPoi(m.x, m.y) });
    setPanel('assistant');
    setAnswer(null);
    setHighlights([{ x: m.x, y: m.y, label: '', strength: 2, small: true }]);
  };
  const onLabelClick = (l) => {
    const poi = Object.values(poiById).find((p) => p.name.toLowerCase() === l.name.toLowerCase());
    runQuery(poi ? `what's at ${poi.name}` : l.name);
  };
  const onMapClick = (pt) => {
    if (editMode) setDraft({ ...pt, category: draft?.category || 'loot', name: '', notes: '' });
  };
  const saveDraft = () => {
    const m = { id: `steve-${Date.now()}`, source: 'steve', category: draft.category, name: draft.name.trim(), notes: draft.notes.trim(), x: draft.x, y: draft.y, added: new Date().toISOString().slice(0, 10) };
    setMyMarkers((ms) => [...ms, m]);
    if (!visible.includes(m.category)) setVisible((v) => [...v, m.category]);
    setDraft(null);
  };
  const onMarkerDrag = (m, pt) => setMyMarkers((ms) => ms.map((x) => (x.id === m.id ? { ...x, ...pt } : x)));
  const deleteMarker = (id) => { setMyMarkers((ms) => ms.filter((m) => m.id !== id)); setSelected(null); };
  const exportMarkers = () => {
    const all = [...communityMarkers, ...myMarkers.map(({ source, ...m }) => ({ ...m, source: 'community' }))];
    const blob = new Blob([JSON.stringify(all, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'community-markers.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importMarkers = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (Array.isArray(data)) setMyMarkers((ms) => [...ms, ...data.filter((d) => d.x && d.y && d.name).map((d) => ({ ...d, source: 'steve', id: d.id || `steve-${Math.random().toString(36).slice(2)}` }))]);
    } catch { alert('That file is not valid marker JSON.'); }
    e.target.value = '';
  };

  const draftHighlights = draft ? [{ x: draft.x, y: draft.y, label: 'New marker', strength: 2 }] : null;
  const panelTitle = PANELS.find((p) => p.id === panel)?.label;

  return (
    <div className={`app${panel ? ' panel-open' : ''}`}>
      <MapView
        markers={iconMarkers}
        labels={labels}
        visible={visible}
        highlights={draftHighlights || highlights}
        focus={draftHighlights ? null : focus}
        editMode={editMode}
        onMarkerClick={onMarkerClick}
        onLabelClick={onLabelClick}
        onMapClick={onMapClick}
        onMarkerDrag={onMarkerDrag}
      />

      <nav className="rail" aria-label="Main">
        <div className="logo" title="Hajin DMZ Planner">
          <svg viewBox="0 0 32 32" width="30" height="30"><circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" /><path d="M16 4v6M16 22v6M4 16h6M22 16h6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /><circle cx="16" cy="16" r="2.5" fill="currentColor" /></svg>
        </div>
        {PANELS.map((p) => (
          <button key={p.id} className={`rail-btn${panel === p.id ? ' active' : ''}`} onClick={() => setPanel(panel === p.id ? null : p.id)} aria-label={p.label} title={p.label}>
            <Icon name={p.icon} size={22} />
            <span className="rail-label">{p.label}</span>
          </button>
        ))}
      </nav>

      <div className="search">
        <Icon name="search" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => onType(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => setSugs([]), 150)}
          placeholder="Ask: where can I find Binding Catalyst?"
          aria-label="Ask the map"
          role="combobox"
          aria-expanded={sugs.length > 0}
          aria-controls="sugs"
        />
        {query && <button className="icon-btn" onClick={clearAnswer} aria-label="Clear"><Icon name="clear" size={18} /></button>}
        {sugs.length > 0 && (
          <ul className="sugs" id="sugs" role="listbox">
            {sugs.map((s, i) => (
              <li key={s.kind + s.id} role="option" aria-selected={i === sugIndex} className={i === sugIndex ? 'active' : ''} onMouseDown={() => pickSuggestion(s)}>
                <span>{s.name}</span><small>{s.kind}</small>
              </li>
            ))}
          </ul>
        )}
      </div>

      {panel && (
        <aside className="panel" aria-label={panelTitle}>
          <header className="panel-head">
            <h1>{panelTitle}</h1>
            <button className="icon-btn" onClick={() => setPanel(null)} aria-label="Close panel"><Icon name="close" size={18} /></button>
          </header>
          <div className="panel-scroll">
            {panel === 'assistant' && (
              <div className="panel-body">
                {selected && <MarkerPanel marker={selected} onAsk={runQuery} editMode={editMode || EDIT_ENABLED} onDelete={deleteMarker} />}
                {!selected && !answer && (
                  <div className="welcome">
                    <h2>Plan your next drop into Hajin.</h2>
                    <p className="muted">Ask about any item, recipe or place. I'll mark the spots on the map.</p>
                    <div className="examples">
                      {EXAMPLE_QUESTIONS.map((q) => <button key={q} className="example" onClick={() => runQuery(q)}>{q}</button>)}
                    </div>
                  </div>
                )}
                <AnswerCard answer={answer} onAsk={runQuery} onFocus={(f) => setFocus({ ...f })} />
              </div>
            )}
            {panel === 'layers' && <LayersPanel visible={visible} setVisible={setVisible} counts={counts} showSecondary={showSecondary} setShowSecondary={setShowSecondary} />}
            {panel === 'recipes' && <RecipesPanel onAsk={runQuery} onAddToPlan={(id) => setPlan((p) => ({ ...p, [id]: (p[id] || 0) + 1 }))} />}
            {panel === 'planner' && (
              <PlannerPanel
                plan={plan}
                setPlan={setPlan}
                onAsk={runQuery}
                onShowRoute={(route) => { setFocus(null); setAnswer(null); setQuery(''); setHighlights(route.stops.map((s, i) => ({ x: s.x, y: s.y, label: `${i + 1}. ${s.name}`, strength: 2 }))); }}
              />
            )}
            {panel === 'edit' && (
              <EditPanel draft={draft} setDraft={setDraft} onSave={saveDraft} myMarkers={myMarkers} onExport={exportMarkers} onImport={importMarkers} onClearAll={() => { if (confirm('Delete all your markers in this browser?')) setMyMarkers([]); }} />
            )}
            {panel === 'about' && <AboutPanel />}
          </div>
        </aside>
      )}
      {editMode && <div className="edit-banner">EDIT MODE: click the map to add a marker</div>}
    </div>
  );
}
