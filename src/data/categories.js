// Marker categories: label, colour and a small inline SVG glyph (our own icons, not Activision's).
// `group` controls which section of the Layers panel the toggle appears in.

const g = {
  pin: '<circle cx="12" cy="12" r="4"/>',
  fortress: '<path d="M5 20V9l2-1v2h2V7l3-2 3 2v3h2V8l2 1v11z"/>',
  compound: '<path d="M4 20V10l8-6 8 6v10h-5v-6H9v6z"/>',
  gas: '<path d="M6 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15zm2-13v4h5V7zm9 1 2 2v7a1.5 1.5 0 0 1-3 0v-3h-1"/>',
  boat: '<path d="M3 15h18l-3 5H6zM11 4v10M11 4l6 8h-6"/>',
  fire: '<path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 2-6 1 1 2 2 2 3 1-3 2-5 2-8z"/>',
  police: '<path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z"/>',
  clinic: '<path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z"/>',
  ammo: '<path d="M7 20V9l2-4 2 4v11zm6 0V9l2-4 2 4v11z"/>',
  uav: '<path d="M11 21V10h2v11zM12 3a7 7 0 0 1 7 7h-2a5 5 0 0 0-10 0H5a7 7 0 0 1 7-7z"/>',
  skull: '<path d="M12 3a8 8 0 0 0-8 8c0 3 2 5 3 6v3h10v-3c1-1 3-3 3-6a8 8 0 0 0-8-8zm-3 7a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>',
  star: '<path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  key: '<path d="M8 14a4 4 0 1 1 3.5-6H21v3h-2v3h-3v-3h-4.5A4 4 0 0 1 8 14zm0-3a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>',
  exfil: '<path d="M12 3 5 10h4v8h6v-8h4z"/>',
  loot: '<path d="M4 8h16v12H4zM2 5h20v3H2zm8 6h4v2h-4z"/>',
};

export const CATEGORIES = {
  fortress:         { label: 'Strongholds',         color: '#ff5a4e', glyph: g.fortress, group: 'Locations', size: 30 },
  compound:         { label: 'Compounds',           color: '#ff8a3d', glyph: g.compound, group: 'Locations' },
  lieutenantHunt:   { label: 'Lieutenant Towers',   color: '#e04ad9', glyph: g.skull,    group: 'Threats' },
  ammoCache:        { label: 'Ammo & Armor Caches', color: '#f5c518', glyph: g.ammo,     group: 'Supplies' },
  clinic:           { label: 'Clinics',             color: '#4ade80', glyph: g.clinic,   group: 'Supplies' },
  fireStation:      { label: 'Fire Stations',       color: '#f97316', glyph: g.fire,     group: 'Supplies' },
  policeStation:    { label: 'Police Stations',     color: '#60a5fa', glyph: g.police,   group: 'Supplies' },
  gasStation:       { label: 'Gas Stations',        color: '#a3a3a3', glyph: g.gas,      group: 'Vehicles' },
  marineGasStation: { label: 'Marine Gas Stations', color: '#38bdf8', glyph: g.boat,     group: 'Vehicles' },
  uavTower:         { label: 'UAV Towers',          color: '#c084fc', glyph: g.uav,      group: 'Intel' },
  // Community / Edit Mode categories
  exfil:            { label: 'Exfils',              color: '#22c55e', glyph: g.exfil,    group: 'Community' },
  key:              { label: 'Key Doors',           color: '#facc15', glyph: g.key,      group: 'Community' },
  loot:             { label: 'Loot Spots',          color: '#2dd4bf', glyph: g.loot,     group: 'Community' },
  custom:           { label: 'My Markers',          color: '#ffffff', glyph: g.star,     group: 'Community' },
};

export const LAYER_GROUPS = ['Locations', 'Threats', 'Supplies', 'Vehicles', 'Intel', 'Community'];

// Markers that are always shown (as text labels), not toggled as icons.
export const LABEL_CATEGORIES = ['poiLabel', 'poiLabelSecondary'];

// Categories shown when the site first loads.
export const DEFAULT_VISIBLE = ['fortress', 'compound', 'lieutenantHunt', 'clinic', 'fireStation', 'exfil', 'key', 'loot', 'custom'];

export function iconSvg(category, size = 26) {
  const c = CATEGORIES[category] || CATEGORIES.custom;
  return `<svg viewBox="0 0 24 24" width="${size * 0.55}" height="${size * 0.55}" fill="${c.color}" aria-hidden="true">${c.glyph}</svg>`;
}
