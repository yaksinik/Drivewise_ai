import { useState, useMemo } from 'react';
import {
  LineChart as LineChartIcon, Eye, EyeOff, Gauge, Car,
  Activity, Navigation, AlertTriangle, FileText,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceDot, Legend,
} from 'recharts';
import { useStore } from '@/store';
import { extractFeatures, SAMPLE_RATE } from '@/engine/scoring';
import { PageHeader, EmptyState, LoadingState, ErrorState, Card } from '@/components/ui';
import { TripReportModal } from '@/components/TripReportModal';
import { getStoredDriverProfile } from '@/services/accountStorage';

interface ChartToggle {
  id: string;
  label: string;
  icon: typeof Gauge;
  unit: string;
  color: string;
  dataKey: string;
}

const CHARTS: ChartToggle[] = [
  { id: 'speed', label: 'Speed', icon: Gauge, unit: 'm/s', color: 'var(--signal)', dataKey: 'speed' },
  { id: 'a_long', label: 'Longitudinal acceleration', icon: Activity, unit: 'm/s²', color: '#2563eb', dataKey: 'a_long' },
  { id: 'a_lat', label: 'Lateral acceleration', icon: Navigation, unit: 'm/s²', color: '#059669', dataKey: 'a_lat' },
];

export function TripAnalysisPage() {
  const { samples, loading, dataSource, csvError, scoreResult } = useStore();
  const [showReportModal, setShowReportModal] = useState(false);
  const [visibleCharts, setVisibleCharts] = useState<Record<string, boolean>>({
    speed: true,
    a_long: true,
    a_lat: true,
  });

  const chartData = useMemo(() => {
    // Downsample for rendering (max ~600 points)
    const step = Math.max(1, Math.floor(samples.length / 600));
    return samples
      .filter((_, i) => i % step === 0)
      .map((s) => ({
        time_s: +s.time_s.toFixed(1),
        speed: +s.speed.toFixed(3),
        a_long: +s.a_long.toFixed(3),
        a_lat: +s.a_lat.toFixed(3),
      }));
  }, [samples]);

  const features = useMemo(() => {
    if (samples.length === 0) return null;
    return extractFeatures(samples);
  }, [samples]);

  const toggleChart = (id: string) => {
    setVisibleCharts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) return <LoadingState />;

  if (dataSource === 'csv' && csvError) {
    return <ErrorState message={csvError} />;
  }

  if (samples.length === 0) {
    return (
      <EmptyState
        icon={Car}
        title="No trip data to analyse"
        message="Upload a CSV file or use the simulator to generate a trip, then return here to see the telemetry charts."
      />
    );
  }

  const harshEvents = features?.harshBrakingEvents ?? [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Trip Analysis"
        subtitle="Synchronised telemetry charts from the current trip data"
      >
        {scoreResult && (
          <div className="mt-3">
            <button
              onClick={() => setShowReportModal(true)}
              className="btn-primary"
            >
              <FileText className="w-4 h-4" />
              <span>Export PDF Report</span>
            </button>
          </div>
        )}
      </PageHeader>

      {/* Chart toggles */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CHARTS.map((chart) => {
          const Icon = chart.icon;
          const visible = visibleCharts[chart.id];
          return (
            <button
              key={chart.id}
              onClick={() => toggleChart(chart.id)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                visible
                  ? 'bg-[--signal] text-white shadow-sm'
                  : 'bg-[--base] text-[--ink] border border-[--hairline] hover:bg-[--hairline]'
              }`}
            >
              {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <Icon className="w-4 h-4" />
              {chart.label}
            </button>
          );
        })}
      </div>

      {/* Charts */}
      <div className="space-y-4">
        {/* Speed chart */}
        {visibleCharts.speed && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[--ink]">Speed</h3>
              <span className="text-xs text-[--ink]/40 mono">m/s vs time (s)</span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
                  <XAxis
                    dataKey="time_s"
                    label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, style: { fontSize: 12, fill: 'var(--ink)', opacity: 0.6 } }}
                    tick={{ fontSize: 11, fill: 'var(--ink)', opacity: 0.5 }}
                  />
                  <YAxis
                    label={{ value: 'Speed (m/s)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: 'var(--ink)', opacity: 0.6 } }}
                    tick={{ fontSize: 11, fill: 'var(--ink)', opacity: 0.5 }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid var(--hairline)', fontSize: 12, backgroundColor: 'var(--base)' }}
                    formatter={(v) => [`${Number(v).toFixed(2)} m/s`, 'Speed']}
                    labelFormatter={(l) => `t = ${l} s`}
                  />
                  <Line type="monotone" dataKey="speed" stroke="var(--signal)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Longitudinal acceleration with harsh braking markers */}
        {visibleCharts.a_long && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-[--ink]">Longitudinal acceleration</h3>
                {harshEvents.length > 0 && (
                  <p className="text-xs text-[--caution] mt-0.5 mono">
                    {harshEvents.length} harsh braking event{harshEvents.length > 1 ? 's' : ''} detected
                    (decel &gt; 3 m/s²)
                  </p>
                )}
              </div>
              <span className="text-xs text-[--ink]/40 mono">m/s² vs time (s)</span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
                  <XAxis
                    dataKey="time_s"
                    label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, style: { fontSize: 12, fill: 'var(--ink)', opacity: 0.6 } }}
                    tick={{ fontSize: 11, fill: 'var(--ink)', opacity: 0.5 }}
                  />
                  <YAxis
                    label={{ value: 'a_long (m/s²)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: 'var(--ink)', opacity: 0.6 } }}
                    tick={{ fontSize: 11, fill: 'var(--ink)', opacity: 0.5 }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid var(--hairline)', fontSize: 12, backgroundColor: 'var(--base)' }}
                    formatter={(v) => [`${Number(v).toFixed(2)} m/s²`, 'a_long']}
                    labelFormatter={(l) => `t = ${l} s`}
                  />
                  <ReferenceDot y={0} x={chartData[0]?.time_s ?? 0} r={0} />
                  <Line type="monotone" dataKey="a_long" stroke="#2563eb" strokeWidth={2} dot={false} />
                  {/* Harsh braking event markers */}
                  {harshEvents.map((ev, i) => {
                    const dataPoint = chartData.find((d) => d.time_s >= ev.time_s);
                    if (!dataPoint) return null;
                    return (
                      <ReferenceDot
                        key={i}
                        x={dataPoint.time_s}
                        y={dataPoint.a_long}
                        r={5}
                        fill="var(--caution)"
                        stroke="#fff"
                        strokeWidth={1}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
            {harshEvents.length > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-[--caution]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Orange dots mark detected harsh braking events (deceleration &gt; 3 m/s²).</span>
              </div>
            )}
          </Card>
        )}

        {/* Lateral acceleration */}
        {visibleCharts.a_lat && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[--ink]">Lateral acceleration</h3>
              <span className="text-xs text-[--ink]/40 mono">m/s² vs time (s)</span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
                  <XAxis
                    dataKey="time_s"
                    label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, style: { fontSize: 12, fill: 'var(--ink)', opacity: 0.6 } }}
                    tick={{ fontSize: 11, fill: 'var(--ink)', opacity: 0.5 }}
                  />
                  <YAxis
                    label={{ value: 'a_lat (m/s²)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: 'var(--ink)', opacity: 0.6 } }}
                    tick={{ fontSize: 11, fill: 'var(--ink)', opacity: 0.5 }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid var(--hairline)', fontSize: 12, backgroundColor: 'var(--base)' }}
                    formatter={(v) => [`${Number(v).toFixed(2)} m/s²`, 'a_lat']}
                    labelFormatter={(l) => `t = ${l} s`}
                  />
                  <Line type="monotone" dataKey="a_lat" stroke="#059669" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-[--ink]/40 mono">
        <LineChartIcon className="w-4 h-4" />
        Signals are low-pass filtered at 3 Hz before display. Sample rate: {SAMPLE_RATE} Hz.
      </div>

      {scoreResult && (
        <TripReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          tripTitle="Trip Telemetry Analysis"
          driverProfile={getStoredDriverProfile()}
          scoreResult={scoreResult}
          samples={samples}
        />
      )}
    </div>
  );
}
