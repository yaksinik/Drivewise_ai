import { useState } from 'react';
import { Gauge, Navigation, Compass, AlertCircle, StopCircle, Radio, Maximize2, Minimize2 } from 'lucide-react';
import type { LiveTelemetrySnapshot } from '@/engine/liveCapture';

interface LiveTripHUDProps {
  snapshot: LiveTelemetrySnapshot | null;
  remainingSec: number;
  durationSec: number;
  onStop: () => void;
}

export function LiveTripHUD({ snapshot, remainingSec, durationSec, onStop }: LiveTripHUDProps) {
  const [unit, setUnit] = useState<'kmh' | 'mph'>('kmh');
  const [fullscreen, setFullscreen] = useState(false);

  const speed = snapshot ? (unit === 'kmh' ? snapshot.speed_kmh : snapshot.speed_mph) : 0;
  const gLong = snapshot ? snapshot.g_long : 0;
  const gLat = snapshot ? snapshot.g_lat : 0;
  const gpsFix = snapshot?.gpsFix ?? false;

  // Compute G-force circle position (clamped to [-1.0, 1.0] G)
  const normX = Math.max(-1, Math.min(1, gLat / 0.6)); // lateral
  const normY = Math.max(-1, Math.min(1, -gLong / 0.6)); // decel is forward/up, accel is back/down
  const dotX = 50 + normX * 40; // % inside 100x100 SVG
  const dotY = 50 + normY * 40;

  const totalG = Math.sqrt(gLong * gLong + gLat * gLat);
  const isHarsh = totalG > 0.35;
  const isModerate = totalG > 0.2 && !isHarsh;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setFullscreen(false);
    }
  };

  return (
    <div className={`bg-slate-950 text-white rounded-3xl p-6 shadow-2xl border border-violet-900/50 ${fullscreen ? 'fixed inset-0 z-50 rounded-none flex flex-col justify-between' : ''}`}>
      {/* HUD Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping absolute" />
            <span className="w-3 h-3 rounded-full bg-red-500 relative" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Live In-Car HUD</span>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Radio className="w-3.5 h-3.5 text-violet-400" />
              <span>{snapshot ? `${snapshot.sampleCount} pts captured` : 'Calibrating baseline…'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* GPS status pill */}
          <div className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${gpsFix ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
            <Navigation className="w-3 h-3" />
            <span>{gpsFix ? `GPS Active (±${Math.round(snapshot?.gpsAccuracy_m ?? 5)}m)` : 'GPS Syncing…'}</span>
          </div>

          {/* Unit toggle */}
          <button
            onClick={() => setUnit(unit === 'kmh' ? 'mph' : 'kmh')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-violet-300 transition-colors"
          >
            {unit.toUpperCase()}
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Toggle Fullscreen"
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main HUD Body */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Speedometer */}
        <div className="text-center md:border-r border-slate-800/80 pr-4">
          <div className="text-7xl lg:text-8xl font-black tracking-tight tabular-nums text-white">
            {Math.round(speed)}
          </div>
          <div className="text-sm font-semibold tracking-widest text-violet-400 uppercase mt-1">
            {unit === 'kmh' ? 'km / h' : 'mph'}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Instantaneous Real GPS Speed
          </p>
        </div>

        {/* G-Force Friction Circle (Telemetry 2D) */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-44 h-44 bg-slate-900 rounded-full border border-slate-700 flex items-center justify-center p-2 shadow-inner">
            {/* Target concentric circles */}
            <div className="absolute inset-4 rounded-full border border-slate-800 border-dashed" />
            <div className="absolute inset-8 rounded-full border border-emerald-900/60" />
            <div className="absolute inset-14 rounded-full border border-slate-800/40" />

            {/* Crosshairs */}
            <div className="absolute w-full h-[1px] bg-slate-800" />
            <div className="absolute h-full w-[1px] bg-slate-800" />

            {/* Current G-Vector Indicator Dot */}
            <div
              className={`absolute w-5 h-5 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-75 shadow-lg ${
                isHarsh ? 'bg-red-500 ring-4 ring-red-500/30' : isModerate ? 'bg-amber-400 ring-2 ring-amber-400/30' : 'bg-emerald-400 ring-2 ring-emerald-400/20'
              }`}
              style={{ left: `${dotX}%`, top: `${dotY}%` }}
            />

            <span className="absolute bottom-2 text-[10px] text-slate-500 uppercase tracking-wider font-mono">Friction Circle</span>
          </div>

          <div className="flex items-center gap-4 mt-3 text-xs text-slate-300 font-mono">
            <span>Long: {gLong > 0 ? `+${gLong.toFixed(2)}` : gLong.toFixed(2)}g</span>
            <span>Lat: {gLat > 0 ? `+${gLat.toFixed(2)}` : gLat.toFixed(2)}g</span>
          </div>
        </div>

        {/* Real-time driving feedback & countdown */}
        <div className="flex flex-col items-center md:items-end justify-center text-center md:text-right">
          <div className="mb-4">
            <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Trip Countdown</span>
            <div className="text-4xl font-bold text-violet-300 tabular-nums">
              {Math.floor(remainingSec / 60)}:{(Math.floor(remainingSec % 60)).toString().padStart(2, '0')}
            </div>
            <span className="text-xs text-slate-500">Max limit: {durationSec}s</span>
          </div>

          {/* Smoothness badge */}
          <div className="w-full md:w-auto">
            <div className={`px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 ${
              isHarsh
                ? 'bg-red-950/80 text-red-300 border border-red-800'
                : isModerate
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isHarsh ? 'bg-red-400' : isModerate ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              {isHarsh ? 'Harsh Maneuver Detected' : isModerate ? 'Moderate Force' : 'Smooth & Controlled'}
            </div>
          </div>
        </div>
      </div>

      {/* Stop Recording Action */}
      <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between flex-wrap gap-4">
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-violet-400 shrink-0" />
          <span>Keep phone securely mounted in holder while vehicle is in motion.</span>
        </div>

        <button
          onClick={onStop}
          className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm flex items-center gap-2 shadow-lg hover:shadow-red-600/30 transition-all cursor-pointer"
        >
          <StopCircle className="w-4 h-4" />
          <span>Stop & Compute Scores</span>
        </button>
      </div>
    </div>
  );
}
