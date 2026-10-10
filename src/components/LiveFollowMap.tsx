import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LiveFollowMapProps {
  lat: number | null;
  lon: number | null;
}

/** Re-centers the map on every position update. */
function RecenterOnPosition({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], map.getZoom());
  }, [map, lat, lon]);
  return null;
}

/** Small coloured dot — same pattern as TripRouteMap to avoid Leaflet's default marker image. */
function dotIcon(color = '#6D4AFF', size = 18) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function LiveFollowMap({ lat, lon }: LiveFollowMapProps) {
  if (lat === null || lon === null) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-violet-400 bg-violet-50 rounded-xl border border-violet-100">
        Waiting for GPS signal…
      </div>
    );
  }

  return (
    <div className="h-48 rounded-xl overflow-hidden border border-violet-100">
      <MapContainer
        center={[lat, lon]}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <RecenterOnPosition lat={lat} lon={lon} />
        <Marker position={[lat, lon]} icon={dotIcon('#6D4AFF', 18)} />
      </MapContainer>
    </div>
  );
}