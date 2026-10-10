import { useState, useEffect } from 'react';
import { Gauge, Navigation, Compass, AlertCircle, StopCircle, Radio, Maximize2, Minimize2 } from 'lucide-react';
import type { LiveTelemetrySnapshot } from '@/engine/liveCapture';
import { LiveFollowMap } from './LiveFollowMap';

interface LiveTripHUDProps {
  snapshot: LiveTelemetrySnapshot | null;
  remainingSec: number;
  durationSec: number;
  onStop: () => void;
  isRecording: boolean;
}

export function LiveTripHUD({ snapshot, remainingSec, durationSec, onStop, isRecording }: LiveTripHUDProps) {
  const [unit, setUnit] = useState<'kmh' | 'mph'>('kmh');
  const [fullscreen, setFullscreen] = useState(false);

  // Request fullscreen when recording starts (component mounts during recording)
  useEffect(() => {
    if (isRecording && !document.fullscreenElement) {
      try {
        document.documentElement.requestFullscreen().catch(() => {});
      } catch {}
    }
  }, [isRecording]);

  const speed = snapshot ? (unit === 'kmh' ? snapshot.speed_kmh : snapshot.speed_mph) : 0;
  const gLong = snapshot ? snapshot.g_long : 0;
  const gLat = snapshot ? snapshot.g_lat : 0;
  const gpsFix = snapshot?.gpsFix ?? false;
  const heading = snapshot?.heading ?? null;

  // Compute cardinal direction from heading (degrees from north)
  const getCardinal = (deg: number): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(deg / 45) % 8;
    return directions[idx];
  };

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
    <div className={`bg-slate-950 text-white rounded-2xl p-5 shadow-2xl border border-slate-800 ${fullscreen ? 'fixed inset-0 z-50 rounded-none flex flex-col justify-between' : ''}`}>
      {/* HUD Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5 gap-2 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex items-center justify-center shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 relative" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] tracking-widest text-slate-400 font-semibold block">LIVE IN-CAR HUD</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 truncate">
              <Radio className="w-3 h-3 text-violet-400 shrink-0" />
              <span className="truncate">{snapshot ? `${snapshot.sampleCount} pts captured` : 'Calibrating baseline…'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* GPS status pill */}
          <div className={`px-2 py-1 rounded-full text-[10px] font-medium flex items-center gap-1 ${gpsFix ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
            <Navigation className="w-3 h-3 shrink-0" />
            <span className="whitespace-nowrap">{gpsFix ? `GPS Active (±${Math.round(snapshot?.gpsAccuracy_m ?? 5)}m)` : 'GPS Syncing…'}</span>
          </div>
          {/* Unit toggle */}
          <button
            onClick={() => setUnit(unit === 'kmh' ? 'mph' : 'kmh')}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-violet-300 transition-colors"
          >
            {unit.toUpperCase()}
          </button>
          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Toggle Fullscreen"
          >
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main HUD Body — stacks vertically on narrow panels */}
      <div className="flex flex-col gap-5">

        {/* Row 1: Speedometer + Countdown side by side */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-5">
          {/* Speedometer */}
          <div className="text-center">
            <div className="text-6xl font-black tracking-tight tabular-nums text-white leading-none">
              {Math.round(speed)}
            </div>
            <div className="text-xs font-semibold tracking-widest text-violet-400 mt-1">
              {unit === 'kmh' ? 'km / h' : 'mph'}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">GPS Speed</p>
          </div>

          {/* Countdown + Status */}
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block tracking-wider">COUNTDOWN</span>
              <div className="text-3xl font-bold text-violet-300 tabular-nums leading-none">
                {Math.floor(remainingSec / 60)}:{(Math.floor(remainingSec % 60)).toString().padStart(2, '0')}
              </div>
              <span className="text-[10px] text-slate-600">of {durationSec}s</span>
            </div>
            {/* Smoothness badge */}
            <div className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold inline-flex items-center gap-1.5 ${
              isHarsh
                ? 'bg-red-950/80 text-red-300 border border-red-800'
                : isModerate
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isHarsh ? 'bg-red-400' : isModerate ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              {isHarsh ? 'Harsh Maneuver' : isModerate ? 'Moderate Force' : 'Smooth & Controlled'}
            </div>
          </div>
        </div>

        {/* Row 2: Friction circle centred */}
        <div className="flex flex-col items-center">
          <div className="relative w-40 h-40 bg-slate-900 rounded-full border border-slate-700 flex items-center justify-center shadow-inner">
            <div className="absolute inset-4 rounded-full border border-slate-800 border-dashed" />
            <div className="absolute inset-8 rounded-full border border-emerald-900/60" />
            <div className="absolute inset-14 rounded-full border border-slate-800/40" />
            <div className="absolute w-full h-[1px] bg-slate-800" />
            <div className="absolute h-full w-[1px] bg-slate-800" />
            <div
              className={`absolute w-4 h-4 rounded-full -translate-x-1/2 -translate-y-1/2 transition-all duration-75 shadow-lg ${
                isHarsh ? 'bg-red-500 ring-4 ring-red-500/30' : isModerate ? 'bg-amber-400 ring-2 ring-amber-400/30' : 'bg-emerald-400 ring-2 ring-emerald-400/20'
              }`}
              style={{ left: `${dotX}%`, top: `${dotY}%` }}
            />
            <span className="absolute bottom-2 text-[9px] text-slate-600 uppercase tracking-widest font-mono">Friction Circle</span>
          </div>

          <div className="flex items-center gap-5 mt-2.5 text-[11px] text-slate-300 font-mono">
            <span>Long: {gLong > 0 ? `+${gLong.toFixed(2)}` : gLong.toFixed(2)}g</span>
            <span>Lat: {gLat > 0 ? `+${gLat.toFixed(2)}` : gLat.toFixed(2)}g</span>
          </div>

          {/* Compass indicator */}
          {gpsFix && (
            <div className="mt-2.5 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700">
              <Compass className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span className="text-[11px] font-mono text-slate-200">
                {heading !== null ? `${getCardinal(heading)} · ${Math.round(heading)}°` : '—'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Live Follow Map — only while recording and GPS fix available */}
      {isRecording && snapshot?.latitude !== null && snapshot?.longitude !== null && (
        <div className="border-t border-slate-800 pt-4">
          <div className="text-[10px] text-slate-400 tracking-widest font-semibold mb-2">LIVE MAP</div>
          <LiveFollowMap lat={snapshot.latitude} lon={snapshot.longitude} />
        </div>
      )}

      {/* Footer */}
      <div className="mt-5 pt-3 border-t border-slate-800 flex items-center gap-2 text-[10px] text-slate-500">
        <AlertCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
        <span>Keep phone securely mounted while vehicle is in motion.</span>
      </div>
    </div>
  );
}
