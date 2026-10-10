import { useEffect, useMemo, useRef, useState } from 'react';

type EmergencyLiveMapProps = {
  incidents: any[];
  reports: any[];
  resources: any[];
  updatedAt: Date | null;
  onRefresh: () => void;
  refreshing?: boolean;
  pickingLocation?: boolean;
  onMapPick?: (lat: number, lng: number) => void;
};

type LayerKey = 'incidents' | 'reports' | 'resources' | 'shelters';
let leafletPromise: Promise<any> | null = null;
function loadLeaflet() {
  if ((window as any).L) return Promise.resolve((window as any).L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-civix-leaflet]')) {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; link.dataset.civixLeaflet = 'true'; document.head.appendChild(link);
    }
    const existing = document.querySelector('script[data-civix-leaflet]') as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).L) return resolve((window as any).L);
      existing.addEventListener('load', () => resolve((window as any).L), { once: true });
      existing.addEventListener('error', () => reject(new Error('Map library failed to load')), { once: true });
      return;
    }
    const script = document.createElement('script'); script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.async = true; script.dataset.civixLeaflet = 'true'; script.onload = () => resolve((window as any).L); script.onerror = () => reject(new Error('Map library failed to load')); document.head.appendChild(script);
  });
  return leafletPromise;
}
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const coordsOf = (item: any) => {
  const coordinates = item?.location?.coordinates || item?.coordinates;
  const [lngValue, latValue] = Array.isArray(coordinates) ? coordinates : [item?.longitude ?? item?.lng, item?.latitude ?? item?.lat];
  const lng = Number(lngValue);
  const lat = Number(latValue);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? { lat, lng } : null;
};

export default function EmergencyLiveMap({ incidents, reports, resources, updatedAt, onRefresh, refreshing = false, pickingLocation = false, onMapPick }: EmergencyLiveMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const [mapError, setMapError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({ incidents: true, reports: true, resources: true, shelters: true });
  const [fitRequested, setFitRequested] = useState(true);

  const mappedCounts = useMemo(() => ({
    incidents: incidents.filter((x: any) => coordsOf(x) && !['RESOLVED', 'CLOSED'].includes(String(x.status))).length,
    reports: reports.filter((x: any) => coordsOf(x)).length,
    resources: resources.filter((x: any) => coordsOf(x) && x.resourceType !== 'SHELTER_BED' && !/shelter|community hall/i.test(String(x.locationName || x.name || ''))).length,
    shelters: resources.filter((x: any) => coordsOf(x) && (x.resourceType === 'SHELTER_BED' || /shelter|community hall/i.test(String(x.locationName || x.name || '')))).length,
  }), [incidents, reports, resources]);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !hostRef.current || mapRef.current) return;
      const map = L.map(hostRef.current, { zoomControl: true, preferCanvas: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>' }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setMapReady(true);
      map.setView([20.5937, 78.9629], 5);
      window.setTimeout(() => map.invalidateSize(), 120);
    }).catch((e) => { if (!cancelled) setMapError(e?.message || 'Unable to load map.'); });
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; layerRef.current = null; } };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!pickingLocation || !onMapPick) { map.getContainer().style.cursor = ""; return; }
    const handleMapClick = (event: any) => onMapPick(Number(event.latlng.lat), Number(event.latlng.lng));
    map.on("click", handleMapClick);
    map.getContainer().style.cursor = "crosshair";
    return () => { map.off("click", handleMapClick); map.getContainer().style.cursor = ""; };
  }, [pickingLocation, onMapPick, mapReady]);

  useEffect(() => {
    const map = mapRef.current; const layer = layerRef.current; const L = (window as any).L;
    if (!map || !layer || !L) return;
    layer.clearLayers();
    const points: [number, number][] = [];
    const addMarker = (item: any, kind: LayerKey, title: string, subtitle: string, color: string, extra = '') => {
      const coords = coordsOf(item); if (!coords) return;
      const marker = L.circleMarker([coords.lat, coords.lng], { radius: kind === 'incidents' ? 10 : 8, color, fillColor: color, fillOpacity: .92, weight: 2 });
      marker.bindPopup(`<div class="emergency-map-popup"><strong>${escapeHtml(title)}</strong><br><span>${escapeHtml(subtitle)}</span>${extra ? `<br><small>${escapeHtml(extra)}</small>` : ''}<br><small>${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}</small></div>`);
      marker.addTo(layer); points.push([coords.lat, coords.lng]);
    };
    if (layers.incidents) incidents.forEach((i: any) => {
      if (['RESOLVED', 'CLOSED'].includes(String(i.status))) return;
      const severity = String(i.severity || 'MEDIUM').toUpperCase();
      const color = severity === 'CRITICAL' ? '#b91c1c' : severity === 'HIGH' ? '#ea580c' : severity === 'LOW' ? '#15803d' : '#2563eb';
      addMarker(i, 'incidents', i.title || i.incidentCode || 'Emergency incident', `${i.incidentCode || 'Incident'} · ${severity} · ${String(i.status || 'REPORTED').replaceAll('_', ' ')}`, color, `${Number(i.estimatedAffectedPeople || 0)} estimated affected`);
    });
    if (layers.reports) reports.forEach((r: any) => addMarker(r, 'reports', r.reportCode || 'Citizen emergency report', `${String(r.hazardType || 'OTHER')} · ${String(r.severity || 'MEDIUM')} · ${String(r.status || 'RECEIVED').replaceAll('_', ' ')}`, '#f97316', `${Number(r.affectedPeople || 0)} people reported affected`));
    if (layers.resources) resources.filter((r: any) => r.resourceType !== 'SHELTER_BED' && !/shelter|community hall/i.test(String(r.locationName || r.name || ''))).forEach((r: any) => addMarker(r, 'resources', r.name || 'Emergency resource', `${String(r.resourceType || 'RESOURCE').replaceAll('_', ' ')} · ${Number(r.quantityAvailable || 0)} available`, '#2563eb', r.locationName || r.status || 'Resource location'));
    if (layers.shelters) resources.filter((r: any) => r.resourceType === 'SHELTER_BED' || /shelter|community hall/i.test(String(r.locationName || r.name || ''))).forEach((r: any) => addMarker(r, 'shelters', r.name || 'Relief shelter', `SHELTER · ${Number(r.quantityAvailable || 0)} beds/units available`, '#15803d', r.locationName || r.status || 'Shelter location'));
    if (fitRequested && points.length) map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 14 });
    if (fitRequested && !points.length) map.setView([20.5937, 78.9629], 5);
    if (fitRequested) setFitRequested(false);
    window.setTimeout(() => map.invalidateSize(), 80);
  }, [incidents, reports, resources, layers, fitRequested, mapReady]);

  const toggleLayer = (key: LayerKey) => setLayers(current => ({ ...current, [key]: !current[key] }));
  return <section className="card emergency-panel emergency-live-map-panel">
    <div className="section-heading emergency-live-map-heading"><div><span className="eyebrow">GEOSPATIAL SITUATIONAL AWARENESS</span><h2>Live emergency map</h2><p>Explore reported hazards, active incidents, available resources, and shelter capacity.</p></div><div className="emergency-map-actions"><span className="emergency-map-live"><span className="live-dot"/> Auto-refresh · 30 sec</span><button type="button" className="btn btn-secondary" onClick={() => { setFitRequested(true); onRefresh(); }} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh map'}</button></div></div>
    {pickingLocation&&<div className="emergency-map-picking-banner" role="status">Click anywhere on the map to select the location. Clicking the map sets coordinates.</div>}
    <div className="emergency-map-toolbar">
      {([['incidents','Incidents','#b91c1c',mappedCounts.incidents],['reports','Citizen reports','#f97316',mappedCounts.reports],['resources','Resources','#2563eb',mappedCounts.resources],['shelters','Shelters','#15803d',mappedCounts.shelters]] as [LayerKey,string,string,number][]).map(([key,label,color,count]) => <button key={key} type="button" className={`emergency-map-filter ${layers[key] ? 'is-on' : ''}`} onClick={() => toggleLayer(key)} aria-pressed={layers[key]}><span style={{ backgroundColor: color }} />{label}<b>{count}</b></button>)}
      <button type="button" className="emergency-map-fit" onClick={() => setFitRequested(true)}>Fit visible markers</button>
    </div>
    <div className="emergency-live-map-wrap"><div ref={hostRef} className="emergency-live-map-host"/>{mapError && <div className="map-empty">{mapError}. Check your internet connection.</div>}</div>
    <div className="emergency-map-footer"><span>{mappedCounts.incidents + mappedCounts.reports + mappedCounts.resources + mappedCounts.shelters} mapped records with coordinates</span><span>{updatedAt ? `Updated ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Waiting for first data refresh'}</span></div>
    <p className="emergency-map-disclaimer">Only records with saved coordinates appear as map markers. A shelter/resource with no coordinates remains visible in inventory but is not assigned an invented location. Demo markers are labelled as simulation data in the incident/report lists.</p>
  </section>;
}
