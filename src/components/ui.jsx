// Small shared UI pieces.
import { CATEGORIES, iconSvg } from '../data/categories.js';

export const RARITY_COLOR = {
  Common: '#9aa4ab', Uncommon: '#4ade80', Rare: '#60a5fa', Epic: '#c084fc', Boss: '#f5c518',
};

export const THREAT_COLOR = {
  Low: '#4ade80', Medium: '#f5c518', High: '#f97316', Critical: '#ef4444', Extreme: '#e04ad9',
};

export function Rarity({ value }) {
  if (!value) return null;
  return <span className="tag" style={{ '--c': RARITY_COLOR[value] || '#9aa4ab' }}>{value}</span>;
}

export function Threat({ value }) {
  return <span className="tag" style={{ '--c': THREAT_COLOR[value] || '#9aa4ab' }}>{value} threat</span>;
}

export function SourceBadge({ source, label }) {
  return <span className={`src src-${source}`} title={label}>{source === 'hint' ? 'Game hint' : source === 'looted' ? 'Reported' : 'Likely'}</span>;
}

export function ItemLink({ item, qty, onAsk }) {
  return (
    <button className="item-link" onClick={() => onAsk(`where can I find ${item.name}`)} title={`Where to find ${item.name}`}>
      {qty != null && <b className="qty">{qty}×</b>}
      <span className="dot" style={{ background: RARITY_COLOR[item.rarity] || '#9aa4ab' }} />
      {item.name}
    </button>
  );
}

export function CatIcon({ category, size = 22 }) {
  const c = CATEGORIES[category];
  if (!c) return null;
  return <span className="cat-icon" style={{ '--c': c.color, width: size, height: size }} dangerouslySetInnerHTML={{ __html: iconSvg(category, size * 1.3) }} />;
}

export function Icon({ name, size = 20 }) {
  const paths = {
    search: 'M10.5 4a6.5 6.5 0 1 0 4 11.6l4.2 4.2 1.4-1.4-4.2-4.2A6.5 6.5 0 0 0 10.5 4zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z',
    assistant: 'M4 5h16v11H8l-4 4zm4 4v2h2V9zm3 0v2h2V9zm3 0v2h2V9z',
    layers: 'M12 3 2 8l10 5 10-5zm-7.6 8.2L2 12.5l10 5 10-5-2.4-1.3L12 15z',
    recipes: 'M5 4h11l3 3v13H5zm3 5v2h8V9zm0 4v2h8v-2z',
    planner: 'M4 5h4v4H4zm0 6h4v4H4zm6-5h10v2H10zm0 6h10v2H10zM4 17h4v3H4zm6 1h10v2H10z',
    edit: 'M4 17.3V20h2.7l8-8L12 9.3zM19.7 7.3a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0L15.4 5.6l3 3z',
    info: 'M11 10h2v7h-2zm0-4h2v2h-2zm1-4a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
    close: 'M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6z',
    clear: 'M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6z',
  };
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true"><path d={paths[name]} /></svg>;
}
