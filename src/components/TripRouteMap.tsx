import { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface TripRouteMapProps {
  lat: number[];
  lon: number[];
  /** How many direction arrows to draw along the route (default 8). */
  arrowCount?: number;
}

/** Bearing in degrees (0 = north, 90 = east) from point A to point B. */
function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  const y = Math.sin((lon2 - lon1) * toRad) * Math.cos(lat2 * toRad);
  const x =
    Math.cos(lat1 * toRad) * Math.sin(lat2 * toRad) -
    Math.sin(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.cos((lon2 - lon1) * toRad);
  return (Math.atan2(y, x) * toDeg + 360) % 360;
}

/** Great-circle distance in km between two lat/lon points (Haversine formula). */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Small coloured dot — avoids Leaflet's default marker image, which breaks
// under most bundlers (including Vite) unless manually reconfigured.
function dotIcon(color: string, size = 14) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Rotated arrow icon pointing in the direction of travel.
function arrowIcon(rotationDeg: number) {
  return L.divIcon({
    className: '',
    html: `<div style="transform: rotate(${rotationDeg}deg); font-size:18px; line-height:1; color:#6D4AFF; text-shadow: 0 1px 2px rgba(255,255,255,0.9);">&#8593;</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

/** Fits the map view to the route once the real layout has settled. */
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    // useEffect runs AFTER the browser commits real layout — unlike
    // useMemo, which can run before the container has its true size.
    // Leaflet needs a real, settled container size to measure correctly.
    map.invalidateSize();
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [24, 24] });
    }
    // A second pass shortly after, in case the container was still
    // settling (e.g. right after switching between trips) on the first.
    const t = setTimeout(() => {
      map.invalidateSize();
      if (positions.length > 0) map.fitBounds(positions, { padding: [24, 24] });
    }, 150);
    return () => clearTimeout(t);
  }, [map, positions]);
  return null;
}

export function TripRouteMap({ lat, lon, arrowCount = 8 }: TripRouteMapProps) {
  const positions = useMemo<[number, number][]>(
    () => lat.map((la, i) => [la, lon[i]] as [number, number]).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b)),
    [lat, lon],
  );

  const arrows = useMemo(() => {
    if (positions.length < 2) return [];
    const step = Math.max(1, Math.floor(positions.length / arrowCount));
    const out: { pos: [number, number]; rot: number }[] = [];
    for (let i = step; i < positions.length - 1; i += step) {
      const [la1, lo1] = positions[i - 1];
      const [la2, lo2] = positions[i];
      out.push({ pos: positions[i], rot: bearingDeg(la1, lo1, la2, lo2) });
    }
    return out;
  }, [positions, arrowCount]);

  // Declared here, alongside the other hooks, before the early return below
  // — React Hooks must run in the same order every render.
  const totalDistanceKm = useMemo(() => {
    let sum = 0;
    for (let i = 1; i < positions.length; i++) {
      const [la1, lo1] = positions[i - 1];
      const [la2, lo2] = positions[i];
      sum += haversineKm(la1, lo1, la2, lo2);
    }
    return sum;
  }, [positions]);

  if (positions.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-violet-400 bg-violet-50 rounded-xl">
        No GPS points available for this trip.
      </div>
    );
  }

  const center = positions[Math.floor(positions.length / 2)];

  return (
    <div>
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="text-violet-600 font-medium">
          Distance covered: {totalDistanceKm.toFixed(2)} km
        </span>
        <span className="text-violet-400 text-xs">{positions.length} GPS points</span>
      </div>
      <div className="h-72 rounded-xl overflow-hidden border border-violet-100">
        <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <FitBounds positions={positions} />
          <Polyline positions={positions} pathOptions={{ color: '#6D4AFF', weight: 4, opacity: 0.85 }} />
          {arrows.map((a, i) => (
            <Marker key={i} position={a.pos} icon={arrowIcon(a.rot)} />
          ))}
          <Marker position={positions[0]} icon={dotIcon('#1B8A5A')} />
          <Marker position={positions[positions.length - 1]} icon={dotIcon('#D1495B')} />
        </MapContainer>
      </div>
    </div>
  );
}