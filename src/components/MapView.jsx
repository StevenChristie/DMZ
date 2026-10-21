import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CATEGORIES, iconSvg } from '../data/categories.js';

// Official Tac-Map is 4096x4096 px at zoom 4 (256px tiles, zoom 0-4).
const SIZE = 4096;
const MAX_NATIVE = 4;
const REMOTE_TILES = 'https://www.callofduty.com/cdn/blog/guides/maps/mw4/dmz/hajin/baselayer/v1/tiles/{z}/{x}/{y}.png';
const LOCAL_TILES = `${import.meta.env.BASE_URL}tiles/{z}/{x}/{y}.png`;

// Same projection as the official guide: map units == pixels at max zoom, lat = y, lng = x.
const CRS = L.extend({}, L.CRS.Simple, { transformation: new L.Transformation(1 / 2 ** MAX_NATIVE, 0, 1 / 2 ** MAX_NATIVE, 0) });
export const toLatLng = (x, y) => L.latLng(y, x);
export const fromLatLng = (ll) => ({ x: Math.round(ll.lng), y: Math.round(ll.lat) });

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function markerIcon(m) {
  const c = CATEGORIES[m.category] || CATEGORIES.custom;
  const size = c.size || 26;
  return L.divIcon({
    className: 'mk',
    html: `<div class="mk-pin${m.source && m.source !== 'official' ? ' mk-community' : ''}" style="--c:${c.color};width:${size}px;height:${size}px">${iconSvg(m.category, size)}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function labelIcon(name, primary) {
  return L.divIcon({
    className: 'lbl',
    html: `<span class="${primary ? 'lbl-primary' : 'lbl-secondary'}">${escapeHtml(name)}</span>`,
    iconSize: null,
  });
}

/**
 * Leaflet map wrapped for React. Leaflet is driven imperatively; React passes data in via props.
 */
export default function MapView({
  markers, labels, visible, highlights, focus, editMode, onMarkerClick, onLabelClick, onMapClick, onMarkerDrag, onReady,
}) {
  const el = useRef(null);
  const map = useRef(null);
  const layers = useRef({});
  const labelLayer = useRef(null);
  const hlLayer = useRef(null);
  const cbs = useRef({});
  cbs.current = { onMarkerClick, onLabelClick, onMapClick, onMarkerDrag };

  // create the map once
  useEffect(() => {
    const bounds = L.latLngBounds(toLatLng(0, SIZE), toLatLng(SIZE, 0));
    const m = L.map(el.current, {
      crs: CRS,
      minZoom: 0,
      maxZoom: 6,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 90,
      // generous bounds: the side panel covers part of the map, so we must be able to pan past the edge
      maxBounds: bounds.pad(0.6),
      maxBoundsViscosity: 0.5,
      zoomControl: false,
      attributionControl: true,
      preferCanvas: false,
    });
    m.attributionControl.setPrefix(false);
    const tiles = L.tileLayer(LOCAL_TILES, {
      bounds, tileSize: 256, noWrap: true, minZoom: 0, maxZoom: 6, maxNativeZoom: MAX_NATIVE,
      attribution: 'Map © Activision · fan-made, not affiliated',
    });
    // If tiles haven't been downloaded yet (npm run tiles), fall back to the official CDN.
    tiles.on('tileerror', (e) => {
      const { z, x, y } = e.coords;
      if (!e.tile.dataset.fallback) {
        e.tile.dataset.fallback = '1';
        e.tile.src = REMOTE_TILES.replace('{z}', z).replace('{x}', x).replace('{y}', y);
      }
    });
    tiles.addTo(m);
    L.control.zoom({ position: 'bottomright' }).addTo(m);

    // Start framed on the playable area, not the empty edges of the 4096 canvas.
    m.fitBounds(L.latLngBounds(toLatLng(900, 3350), toLatLng(3200, 1100)));

    labelLayer.current = L.layerGroup().addTo(m);
    hlLayer.current = L.layerGroup().addTo(m);

    const updateZoomClass = () => {
      const z = m.getZoom();
      el.current.dataset.zoom = String(Math.floor(z));
    };
    m.on('zoomend', updateZoomClass);
    updateZoomClass();

    m.on('click', (e) => cbs.current.onMapClick?.(fromLatLng(e.latlng)));
    map.current = m;
    onReady?.(m);
    return () => m.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // markers grouped into one layer per category
  useEffect(() => {
    const m = map.current;
    Object.values(layers.current).forEach((lg) => lg.remove());
    layers.current = {};
    for (const mk of markers) {
      const cat = CATEGORIES[mk.category] ? mk.category : 'custom';
      if (!layers.current[cat]) layers.current[cat] = L.layerGroup();
      const draggable = editMode && mk.source === 'steve';
      const lm = L.marker(toLatLng(mk.x, mk.y), { icon: markerIcon(mk), title: mk.name, draggable, riseOnHover: true });
      lm.on('click', (e) => { L.DomEvent.stopPropagation(e); cbs.current.onMarkerClick?.(mk); });
      if (draggable) lm.on('dragend', () => cbs.current.onMarkerDrag?.(mk, fromLatLng(lm.getLatLng())));
      lm.addTo(layers.current[cat]);
    }
    for (const [cat, lg] of Object.entries(layers.current)) if (visible.includes(cat)) lg.addTo(m);
  }, [markers, editMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // layer toggles
  useEffect(() => {
    const m = map.current;
    for (const [cat, lg] of Object.entries(layers.current)) {
      if (visible.includes(cat)) lg.addTo(m); else lg.remove();
    }
  }, [visible]);

  // POI name labels
  useEffect(() => {
    const lg = labelLayer.current;
    lg.clearLayers();
    for (const l of labels) {
      const mk = L.marker(toLatLng(l.x, l.y), { icon: labelIcon(l.name, l.primary), interactive: true, keyboard: false, zIndexOffset: l.primary ? 500 : 0 });
      mk.on('click', (e) => { L.DomEvent.stopPropagation(e); cbs.current.onLabelClick?.(l); });
      mk.addTo(lg);
    }
  }, [labels]);

  // assistant highlights: pulsing halos + fit the view around them
  useEffect(() => {
    const m = map.current;
    const lg = hlLayer.current;
    lg.clearLayers();
    if (!highlights?.length) return;
    for (const h of highlights) {
      const size = h.small ? 34 : h.strength >= 2 ? 64 : 48;
      L.marker(toLatLng(h.x, h.y), {
        interactive: false, keyboard: false, zIndexOffset: -100,
        icon: L.divIcon({ className: 'hl', html: `<div class="hl-ring${h.small ? ' hl-small' : ''}" style="width:${size}px;height:${size}px"></div>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
      }).addTo(lg);
      if (!h.small && h.label) {
        L.marker(toLatLng(h.x, h.y), {
          interactive: false, keyboard: false, zIndexOffset: 1000,
          icon: L.divIcon({ className: 'hl-tag', html: `<span>${escapeHtml(h.label)}</span>`, iconSize: null }),
        }).addTo(lg);
      }
    }
    if (!focus) {
      const pts = highlights.map((h) => toLatLng(h.x, h.y));
      const pad = fitPadding();
      m.flyToBounds(L.latLngBounds(pts).pad(0.15), { maxZoom: 3, duration: 0.8, ...pad });
    }
  }, [highlights]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!focus) return;
    map.current.flyTo(toLatLng(focus.x, focus.y), focus.zoom ?? 3, { duration: 0.8 });
  }, [focus]);

  useEffect(() => {
    el.current.classList.toggle('editing', !!editMode);
  }, [editMode]);

  return <div ref={el} className="map" role="application" aria-label="Interactive map of Hajin" />;
}

// leave room for the side panel (desktop: left, mobile: bottom sheet) and the search bar
function fitPadding() {
  const panelOpen = !!document.querySelector('.panel');
  if (window.innerWidth > 760) return { paddingTopLeft: [(panelOpen ? 444 : 64) + 40, 90], paddingBottomRight: [60, 40] };
  return { paddingTopLeft: [30, 80], paddingBottomRight: [30, panelOpen ? window.innerHeight * 0.52 + 80 : 90] };
}
