import { useState, useMemo, useEffect } from 'react';
import {
  Database, MapPin, Loader2, AlertTriangle, Download,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ScatterChart, Scatter, ZAxis,
} from 'recharts';
import { PageHeader, Card, EmptyState, LoadingState, ErrorState } from '@/components/ui';

// ---- Types ----

interface TripMeta {
  driver: string;
  behaviour: string;
  road: string;
  hz: number;
  duration_s?: number;
  source: string;
}

interface TripData {
  meta: TripMeta;
  t: number[];
  ax: number[];
  ay: number[];
  az: number[];
  speed_kmh: number[];
  lat: number[];
  lon: number[];
  lane_offset_m: (number | null)[];
  dist_ahead_m: (number | null)[];
}

interface PredictionRow {
  trip_id: string;
  t_start: number;
  true: string;
  proba: number[];
}

interface PredictionData {
  classes: string[];
  note: string;
  rows: PredictionRow[];
}

// ---- Trip manifest (static, matches files in /public/data/) ----

const TRIP_MANIFEST = [
  { file: 'D1_normal_motorway.json', label: 'D1 — Normal — Motorway' },
  { file: 'D1_aggressive_motorway.json', label: 'D1 — Aggressive — Motorway' },
  { file: 'D2_normal_secondary.json', label: 'D2 — Normal — Secondary' },
  { file: 'D2_drowsy_motorway.json', label: 'D2 — Drowsy — Motorway' },
  { file: 'D3_aggressive_secondary.json', label: 'D3 — Aggressive — Secondary' },
  { file: 'D4_normal_motorway.json', label: 'D4 — Normal — Motorway' },
  { file: 'D5_drowsy_secondary.json', label: 'D5 — Drowsy — Secondary' },
  { file: 'D6_aggressive_motorway.json', label: 'D6 — Aggressive — Motorway' },
];

const BEHAVIOUR_COLORS: Record<string, string> = {
  normal: '#059669',
  aggressive: '#dc2626',
  drowsy: '#7c3aed',
};

const BEHAVIOUR_LABELS: Record<string, string> = {
  normal: 'Normal',
  aggressive: 'Aggressive',
  drowsy: 'Drowsy',
};

// ---- Component ----

export function DatasetExplorerPage() {
  const [selectedFile, setSelectedFile] = useState<string>(TRIP_MANIFEST[0].file);
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [tripError, setTripError] = useState<string | null>(null);

  const [predictions, setPredictions] = useState<PredictionData | null>(null);
  const [loadingPred, setLoadingPred] = useState(true);
  const [predError, setPredError] = useState<string | null>(null);

  // Load predictions once
  useEffect(() => {
    let cancelled = false;
    setLoadingPred(true);
    fetch('/data/model_predictions.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: PredictionData) => {
        if (!cancelled) {
          setPredictions(data);
          setLoadingPred(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPredError(err.message);
          setLoadingPred(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Load trip data when selection changes
  useEffect(() => {
    let cancelled = false;
    setLoadingTrip(true);
    setTripError(null);
    fetch(`/data/${selectedFile}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: TripData) => {
        if (!cancelled) {
          setTripData(data);
          setLoadingTrip(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setTripError(err.message);
          setLoadingTrip(false);
        }
      });
    return () => { cancelled = true; };
  }, [selectedFile]);

  // Prepare chart data (downsample for rendering)
  const chartData = useMemo(() => {
    if (!tripData) return [];
    const maxPoints = 500;
    const step = Math.max(1, Math.floor(tripData.t.length / maxPoints));
    const rows: Record<string, number | null>[] = [];
    for (let i = 0; i < tripData.t.length; i += step) {
      rows.push({
        t: +tripData.t[i].toFixed(2),
        speed_kmh: tripData.speed_kmh[i],
        ax: tripData.ax[i],
        ay: tripData.ay[i],
        az: tripData.az[i],
        lane_offset_m: tripData.lane_offset_m[i],
        dist_ahead_m: tripData.dist_ahead_m[i],
      });
    }
    return rows;
  }, [tripData]);

  // Prepare map data (downsample GPS)
  const mapData = useMemo(() => {
    if (!tripData) return [];
    const maxPoints = 300;
    const step = Math.max(1, Math.floor(tripData.lat.length / maxPoints));
    const rows: { lat: number; lon: number; idx: number }[] = [];
    for (let i = 0; i < tripData.lat.length; i += step) {
      rows.push({ lat: tripData.lat[i], lon: tripData.lon[i], idx: i });
    }
    return rows;
  }, [tripData]);

  // Prepare table data (first 20 rows)
  const tableData = useMemo(() => {
    if (!tripData) return [];
    const n = Math.min(20, tripData.t.length);
    const rows: Record<string, number | string | null>[] = [];
    for (let i = 0; i < n; i++) {
      rows.push({
        t: tripData.t[i],
        ax: tripData.ax[i],
        ay: tripData.ay[i],
        az: tripData.az[i],
        speed_kmh: tripData.speed_kmh[i],
        lat: tripData.lat[i],
        lon: tripData.lon[i],
        lane_offset_m: tripData.lane_offset_m[i],
        dist_ahead_m: tripData.dist_ahead_m[i],
      });
    }
    return rows;
  }, [tripData]);

  // Predictions for the selected trip
  const tripPredictions = useMemo(() => {
    if (!predictions || !tripData) return [];
    const tripId = selectedFile.replace('.json', '');
    return predictions.rows.filter((r) => r.trip_id === tripId);
  }, [predictions, tripData, selectedFile]);

  // Predicted label per window
  const predictedLabels = useMemo(() => {
    if (!predictions) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const row of tripPredictions) {
      const maxIdx = row.proba.indexOf(Math.max(...row.proba));
      map.set(`${row.trip_id}_${row.t_start}`, predictions.classes[maxIdx]);
    }
    return map;
  }, [predictions, tripPredictions]);

  // ---- Loading / Error states ----

  if (loadingTrip && !tripData) return <LoadingState />;
  if (tripError) {
    return (
      <ErrorState
        message={`Could not load trip data: ${tripError}. Make sure the JSON files exist in /public/data/.`}
      />
    );
  }
  if (!tripData) return <LoadingState />;

  const meta = tripData.meta;

  return (
    <div>
      <PageHeader
        title="Dataset Explorer"
        subtitle="Real driving data from the UAH-DriveSet — explore trips, telemetry, and model predictions"
      />

      {/* Permanent REAL DATA badge */}
      <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-green-100 text-green-800 border border-green-300">
        <Database className="w-4 h-4" />
        REAL DATA: UAH-DriveSet
      </div>

      {/* Summary card */}
      <Card className="mb-6 bg-gradient-to-br from-violet-600 to-violet-800 border-violet-700">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <SummaryStat label="Dataset" value="UAH-DriveSet" />
          <SummaryStat label="Drivers" value="6" />
          <SummaryStat label="Behaviours" value="3" />
          <SummaryStat label="Road types" value="2" />
          <SummaryStat label="Total data" value="500+ min" />
          <SummaryStat label="Citation" value="Romera et al." small />
        </div>
        <p className="text-violet-200 text-xs mt-3">
          Romera et al., "Segmenting driving behavior into driver styles using forward reasoning
          and system identification," IEEE ITSC 2016.
        </p>
      </Card>

      {/* Trip selector dropdowns */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-violet-500 block mb-1">Select trip</label>
            <select
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-violet-200 text-sm text-violet-800 bg-white"
            >
              {TRIP_MANIFEST.map((t) => (
                <option key={t.file} value={t.file}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-violet-500 block mb-1">Driver</label>
            <div className="px-3 py-2 rounded-lg bg-violet-50 text-sm font-medium text-violet-800">
              {meta.driver}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-violet-500 block mb-1">Behaviour</label>
            <div
              className="px-3 py-2 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: `${BEHAVIOUR_COLORS[meta.behaviour] || '#7c3aed'}20`,
                color: BEHAVIOUR_COLORS[meta.behaviour] || '#7c3aed',
              }}
            >
              {BEHAVIOUR_LABELS[meta.behaviour] || meta.behaviour}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-violet-500 block mb-1">Road type</label>
            <div className="px-3 py-2 rounded-lg bg-violet-50 text-sm font-medium capitalize text-violet-800">
              {meta.road}
            </div>
          </div>
        </div>
        <p className="text-xs text-violet-400 mt-3">
          Sampled at {meta.hz} Hz · {meta.duration_s ?? tripData.t.length / meta.hz}s duration · {tripData.t.length} samples
        </p>
      </Card>

      {/* Charts */}
      <div className="space-y-4 mb-6">
        {/* Speed chart */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-violet-950">Speed</h3>
            <span className="text-xs text-violet-400">km/h vs time (s)</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" />
                <XAxis
                  dataKey="t"
                  label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, style: { fontSize: 12, fill: '#8b5cf6' } }}
                  tick={{ fontSize: 11, fill: '#a78bfa' }}
                />
                <YAxis
                  label={{ value: 'Speed (km/h)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#8b5cf6' } }}
                  tick={{ fontSize: 11, fill: '#a78bfa' }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #ede9fe', fontSize: 12 }}
                  formatter={(v) => [`${Number(v).toFixed(1)} km/h`, 'Speed']}
                  labelFormatter={(l) => `t = ${l} s`}
                />
                <Line type="monotone" dataKey="speed_kmh" stroke="#7c3aed" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Acceleration chart (ax, ay, az) */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-violet-950">Acceleration (3 axes)</h3>
            <span className="text-xs text-violet-400">m/s² vs time (s)</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" />
                <XAxis
                  dataKey="t"
                  label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, style: { fontSize: 12, fill: '#8b5cf6' } }}
                  tick={{ fontSize: 11, fill: '#a78bfa' }}
                />
                <YAxis
                  label={{ value: 'Acceleration (m/s²)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#8b5cf6' } }}
                  tick={{ fontSize: 11, fill: '#a78bfa' }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #ede9fe', fontSize: 12 }}
                  formatter={(v, name) => [`${Number(v).toFixed(2)} m/s²`, String(name)]}
                  labelFormatter={(l) => `t = ${l} s`}
                />
                <Line type="monotone" dataKey="ax" name="ax (long)" stroke="#2563eb" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="ay" name="ay (lat)" stroke="#059669" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="az" name="az (vert)" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Lane offset chart */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-violet-950">Lane offset</h3>
            <span className="text-xs text-violet-400">m vs time (s)</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" />
                <XAxis
                  dataKey="t"
                  label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, style: { fontSize: 12, fill: '#8b5cf6' } }}
                  tick={{ fontSize: 11, fill: '#a78bfa' }}
                />
                <YAxis
                  label={{ value: 'Lane offset (m)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#8b5cf6' } }}
                  tick={{ fontSize: 11, fill: '#a78bfa' }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #ede9fe', fontSize: 12 }}
                  formatter={(v) => [v != null ? `${Number(v).toFixed(3)} m` : '—', 'Lane offset']}
                  labelFormatter={(l) => `t = ${l} s`}
                />
                <Line type="monotone" dataKey="lane_offset_m" stroke="#7c3aed" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Distance ahead chart */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-violet-950">Distance to vehicle ahead</h3>
            <span className="text-xs text-violet-400">m vs time (s)</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" />
                <XAxis
                  dataKey="t"
                  label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, style: { fontSize: 12, fill: '#8b5cf6' } }}
                  tick={{ fontSize: 11, fill: '#a78bfa' }}
                />
                <YAxis
                  label={{ value: 'Distance (m)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#8b5cf6' } }}
                  tick={{ fontSize: 11, fill: '#a78bfa' }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #ede9fe', fontSize: 12 }}
                  formatter={(v) => [v != null ? `${Number(v).toFixed(1)} m` : 'No vehicle', 'Distance ahead']}
                  labelFormatter={(l) => `t = ${l} s`}
                />
                <Line type="monotone" dataKey="dist_ahead_m" stroke="#0891b2" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-violet-400 mt-2">
            Gaps indicate no vehicle detected ahead.
          </p>
        </Card>
      </div>

      {/* Prediction strip */}
      {loadingPred ? (
        <Card className="mb-6">
          <div className="flex items-center gap-3 text-violet-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading model predictions…</span>
          </div>
        </Card>
      ) : predError ? (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-900 text-sm">Predictions unavailable</h3>
              <p className="text-xs text-orange-700 mt-1">{predError}</p>
            </div>
          </div>
        </Card>
      ) : predictions && tripPredictions.length > 0 ? (
        <Card className="mb-6">
          <h3 className="font-semibold text-violet-950 mb-1">Predicted behaviour over time</h3>
          <p className="text-xs text-violet-500 mb-4">
            Predictions come from a model trained without this driver (leave-one-driver-out).
          </p>

          {/* Color strip */}
          <div className="flex rounded-lg overflow-hidden h-10 mb-4 border border-violet-100">
            {tripPredictions.map((row) => {
              const maxIdx = row.proba.indexOf(Math.max(...row.proba));
              const predClass = predictions.classes[maxIdx];
              const color = BEHAVIOUR_COLORS[predClass] || '#7c3aed';
              return (
                <div
                  key={`${row.trip_id}_${row.t_start}`}
                  className="flex-1 transition-all hover:opacity-80 cursor-default group relative"
                  style={{ backgroundColor: color }}
                  title={`t=${row.t_start}s — predicted: ${BEHAVIOUR_LABELS[predClass] || predClass} (true: ${BEHAVIOUR_LABELS[row.true] || row.true})`}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 text-white text-[10px] font-medium transition-opacity">
                    {row.t_start}s
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs">
            {predictions.classes.map((cls) => (
              <div key={cls} className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: BEHAVIOUR_COLORS[cls] || '#7c3aed' }}
                />
                <span className="text-violet-700 font-medium">
                  {BEHAVIOUR_LABELS[cls] || cls}
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs text-violet-400 mt-3">
            Each segment is a 30-second window coloured by the model's top predicted behaviour.
            Hover for details. {predictions.note}.
          </p>
        </Card>
      ) : null}

      {/* Map (GPS scatter) */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-violet-950 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-violet-600" />
            GPS trajectory
          </h3>
          <span className="text-xs text-violet-400">Latitude vs longitude</span>
        </div>
        {mapData.length > 0 && (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" />
                <XAxis
                  type="number"
                  dataKey="lon"
                  name="Longitude"
                  label={{ value: 'Longitude (°)', position: 'insideBottom', offset: -10, style: { fontSize: 12, fill: '#8b5cf6' } }}
                  tick={{ fontSize: 10, fill: '#a78bfa' }}
                  domain={['dataMin', 'dataMax']}
                />
                <YAxis
                  type="number"
                  dataKey="lat"
                  name="Latitude"
                  label={{ value: 'Latitude (°)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#8b5cf6' } }}
                  tick={{ fontSize: 10, fill: '#a78bfa' }}
                  domain={['dataMin', 'dataMax']}
                />
                <ZAxis range={[3, 3]} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #ede9fe', fontSize: 12 }}
                  formatter={(v, name) => [Number(v).toFixed(6), String(name)]}
                  cursor={{ strokeDasharray: '3 3' }}
                />
                <Scatter data={mapData} fill="#7c3aed" fillOpacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-xs text-violet-400 mt-2">
          Each point is a GPS sample along the trip route, downsampled for rendering.
        </p>
      </Card>

      {/* Data table — first 20 rows */}
      <Card>
        <h3 className="font-semibold text-violet-950 mb-3">Raw data — first 20 rows</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-violet-100 text-left">
                {['t (s)', 'ax (m/s²)', 'ay (m/s²)', 'az (m/s²)', 'speed (km/h)', 'lat (°)', 'lon (°)', 'lane (m)', 'dist (m)'].map((h) => (
                  <th key={h} className="py-2 px-2 font-medium text-violet-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={i} className="border-b border-violet-50">
                  <td className="py-1.5 px-2 tabular-nums text-violet-800">{Number(row.t).toFixed(2)}</td>
                  <td className="py-1.5 px-2 tabular-nums text-violet-800">{(row.ax as number).toFixed(3)}</td>
                  <td className="py-1.5 px-2 tabular-nums text-violet-800">{(row.ay as number).toFixed(3)}</td>
                  <td className="py-1.5 px-2 tabular-nums text-violet-800">{(row.az as number).toFixed(3)}</td>
                  <td className="py-1.5 px-2 tabular-nums text-violet-800">{(row.speed_kmh as number).toFixed(1)}</td>
                  <td className="py-1.5 px-2 tabular-nums text-violet-800">{(row.lat as number).toFixed(5)}</td>
                  <td className="py-1.5 px-2 tabular-nums text-violet-800">{(row.lon as number).toFixed(5)}</td>
                  <td className="py-1.5 px-2 tabular-nums text-violet-800">
                    {row.lane_offset_m != null ? (row.lane_offset_m as number).toFixed(3) : '—'}
                  </td>
                  <td className="py-1.5 px-2 tabular-nums text-violet-800">
                    {row.dist_ahead_m != null ? (row.dist_ahead_m as number).toFixed(1) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-violet-400 mt-3">
          Showing 20 of {tripData.t.length} total samples in this trip.
        </p>
      </Card>

      <div className="mt-4 flex items-center gap-2 text-xs text-violet-400">
        <Download className="w-3.5 h-3.5" />
        Trip data loaded from /public/data/{selectedFile} · Predictions from /public/data/model_predictions.json
      </div>
    </div>
  );
}

function SummaryStat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <p className="text-violet-200 text-xs">{label}</p>
      <p className={`font-bold text-white ${small ? 'text-sm' : 'text-lg'}`}>{value}</p>
    </div>
  );
}
