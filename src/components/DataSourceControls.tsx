import { useState } from 'react';
import { Upload, Sliders, AlertCircle, Smartphone, Navigation, QrCode, X, Radio, StopCircle } from 'lucide-react';
import { useStore } from '@/store';
import type { SimulatorParams } from '@/engine/types';
import { generateSampleCsv } from '@/engine/csv';
import { LiveTripHUD } from './LiveTripHUD';

const SLIDER_CONFIG: { key: keyof SimulatorParams; label: string; description: string }[] = [
  { key: 'brakingHarshness', label: 'Braking harshness', description: 'How abrupt stops are' },
  { key: 'accelHarshness', label: 'Acceleration harshness', description: 'How aggressive take-offs are' },
  { key: 'speedSteadiness', label: 'Speed steadiness', description: 'How consistent cruising speed is' },
  { key: 'turningSmoothness', label: 'Turning smoothness', description: 'How jerky cornering is' },
  { key: 'steeringNervousness', label: 'Steering nervousness', description: 'How twitchy steering inputs are' },
];

export function DataSourceControls() {
  const {
    dataSource,
    simulatorParams,
    setSimulatorParam,
    uploadCsv,
    switchToSimulator,
    switchToCsvView,
    switchToLiveView,
    liveStatus,
    liveError,
    liveRemainingSec,
    liveDurationSec,
    setLiveDurationSec,
    startLiveRecording,
    stopLiveRecording,
    liveSnapshot,
    csvError,
    csvFileName,
  } = useStore();

  const [showPhoneHelp, setShowPhoneHelp] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      uploadCsv(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const csv = generateSampleCsv();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'drivewise_sample_telemetry.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-violet-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-violet-600" />
          <h3 className="font-semibold text-violet-950">Data Source</h3>
        </div>

        {dataSource === 'live' && (
          <button
            onClick={() => setShowPhoneHelp(true)}
            className="p-1 rounded-lg text-violet-600 hover:bg-violet-50 transition-colors cursor-pointer"
            title="How to connect phone in-car"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Toggle buttons */}
      <div className="flex gap-2 mb-4 p-1 bg-violet-50 rounded-xl">
        <button
          onClick={switchToSimulator}
          className={`flex-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
            dataSource === 'simulator' ? 'bg-white text-violet-700 shadow-sm' : 'text-violet-400 hover:text-violet-600'
          }`}
        >
          Simulator
        </button>
        <button
          onClick={switchToCsvView}
          className={`flex-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
            dataSource === 'csv' ? 'bg-white text-violet-700 shadow-sm' : 'text-violet-400 hover:text-violet-600'
          }`}
        >
          CSV Upload
        </button>
        <button
          onClick={switchToLiveView}
          className={`flex-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
            dataSource === 'live' ? 'bg-white text-violet-700 shadow-sm' : 'text-violet-400 hover:text-violet-600'
          }`}
        >
          Live Trip
        </button>
      </div>

      {dataSource === 'simulator' && (
        <div className="space-y-4">
          {SLIDER_CONFIG.map((cfg) => (
            <div key={cfg.key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-violet-800">{cfg.label}</label>
                <span className="text-sm text-violet-500 tabular-nums">
                  {simulatorParams[cfg.key]}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={simulatorParams[cfg.key]}
                onChange={(e) => setSimulatorParam(cfg.key, parseInt(e.target.value))}
                className="w-full accent-violet-600 h-2 cursor-pointer"
              />
              <p className="text-xs text-violet-400 mt-0.5">{cfg.description}</p>
            </div>
          ))}
          <p className="text-xs text-violet-400 bg-violet-50 rounded-lg p-3">
            Sliders generate a simulated 5-minute trip at 10 Hz. Move them to see how driving
            behaviour changes scores in real time.
          </p>
        </div>
      )}

      {dataSource === 'csv' && (
        <div className="space-y-3">
          <input
            id="csv-upload-input"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="hidden"
          />
          <label
            htmlFor="csv-upload-input"
            className="flex flex-col items-center justify-center border-2 border-dashed border-violet-200 rounded-xl py-8 cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors"
          >
            <Upload className="w-8 h-8 text-violet-400 mb-2" />
            <span className="text-sm font-medium text-violet-700">Click to upload a CSV file</span>
            <span className="text-xs text-violet-400 mt-1">
              Columns: time_s, a_long, a_lat, yaw_rate, speed
            </span>
          </label>
          {csvFileName && !csvError && (
            <p className="text-sm text-green-600 bg-green-50 rounded-lg p-2">
              Loaded: {csvFileName} — resampled to 10 Hz
            </p>
          )}
          {csvError && (
            <div className="flex items-start gap-2 text-sm text-orange-700 bg-orange-50 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{csvError}</span>
            </div>
          )}
          <button
            onClick={handleDownloadSample}
            className="text-sm text-violet-500 hover:text-violet-700 underline cursor-pointer"
          >
            Download a sample CSV template
          </button>
        </div>
      )}

      {dataSource === 'live' && (
        <div className="space-y-4">
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-xs text-violet-900 flex items-start gap-2">
            <Navigation className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
            <div>
              <strong>GPS + Inertial Sensor Fusion Active:</strong> Mount phone securely in car holder.
              Keep vehicle still for the first 2 seconds after starting to calibrate zero-g gravity offset.
            </div>
          </div>

          {/* Duration selector — always visible when not mid-recording */}
          {liveStatus !== 'recording' && liveStatus !== 'requesting-permission' && liveStatus !== 'processing' && (
            <div>
              <label className="text-sm font-medium text-violet-800 block mb-1">
                Recording duration
              </label>
              <select
                value={liveDurationSec}
                onChange={(e) => setLiveDurationSec(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-violet-200 text-sm text-violet-800 bg-white"
              >
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={180}>3 minutes</option>
                <option value={300}>5 minutes</option>
                <option value={600}>10 minutes</option>
              </select>
              <p className="text-xs text-violet-400 mt-1">
                Recording stops automatically at this time, or click Stop anytime.
              </p>
            </div>
          )}

          {/* Start / Stop button pair */}
          {(liveStatus === 'idle' || liveStatus === 'error' || liveStatus === 'done') && (
            <div className="flex gap-3">
              <button
                onClick={startLiveRecording}
                className="flex-1 py-4 rounded-xl bg-violet-600 text-white font-bold text-base hover:bg-violet-700 active:scale-95 transition-all cursor-pointer shadow-md hover:shadow-violet-500/20 flex items-center justify-center gap-2"
              >
                <span className="text-lg">▶</span> Start In-Car Recording
              </button>
              <button
                disabled
                className="px-5 py-4 rounded-xl bg-slate-100 text-slate-400 font-semibold text-sm flex items-center gap-2 cursor-not-allowed select-none"
                title="Start a recording first"
              >
                <StopCircle className="w-5 h-5" /> Stop
              </button>
            </div>
          )}

          {liveStatus === 'requesting-permission' && (
            <div className="text-center py-6 text-violet-600 text-sm animate-pulse">
              Requesting Motion & GPS permissions — check browser prompt…
            </div>
          )}

          {liveStatus === 'recording' && (
            <div className="space-y-3">
              {/* Active Start / Stop controls above the HUD */}
              <div className="flex gap-3">
                <button
                  disabled
                  className="flex-1 py-3 rounded-xl bg-violet-200 text-violet-400 font-bold text-base cursor-not-allowed select-none flex items-center justify-center gap-2"
                >
                  <span>▶</span> Recording…
                </button>
                <button
                  onClick={stopLiveRecording}
                  className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-semibold text-sm flex items-center gap-2 shadow-lg hover:shadow-red-600/30 transition-all cursor-pointer"
                >
                  <StopCircle className="w-5 h-5" /> Stop
                </button>
              </div>

              <LiveTripHUD
                snapshot={liveSnapshot}
                remainingSec={liveRemainingSec}
                durationSec={liveDurationSec}
                onStop={stopLiveRecording}
              />
            </div>
          )}

          {liveStatus === 'processing' && (
            <div className="text-center py-6 text-violet-600 text-sm">
              <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-2" />
              Processing GPS and inertial fusion at 10 Hz…
            </div>
          )}

          {liveStatus === 'done' && !liveError && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800 space-y-1">
              <p className="font-semibold text-green-900">Trip recorded and scored!</p>
              <p>Check the Dashboard and Trip Analysis for detailed telemetry curves.</p>
            </div>
          )}

          {liveError && (
            <div className="flex items-start gap-2 text-sm text-orange-700 bg-orange-50 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{liveError}</span>
            </div>
          )}
        </div>
      )}

      {/* In-Car Phone Connect Modal */}
      {showPhoneHelp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-violet-600" />
                <h3 className="font-bold text-slate-900">Connect Real Phone in Car</h3>
              </div>
              <button
                onClick={() => setShowPhoneHelp(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-violet-50 rounded-xl text-violet-900">
                <strong>How to test live in your car:</strong>
              </div>

              <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                <li>
                  Run the dev server with network host enabled:
                  <code className="block my-1 p-2 bg-slate-900 text-violet-300 rounded font-mono text-[11px]">
                    npm run dev -- --host
                  </code>
                </li>
                <li>
                  Connect your phone to the same Wi-Fi (or phone hotspot). Open Safari (iOS) or Chrome (Android) and navigate to your computer's local IP address (e.g. <span className="font-mono text-violet-700">http://192.168.1.X:5173</span>).
                </li>
                <li>
                  Mount your smartphone firmly in your car's windshield/vent phone holder (screen facing you, top of phone facing forward).
                </li>
                <li>
                  Tap <strong>"Start In-Car Recording"</strong> and grant motion & location permissions when prompted.
                </li>
              </ol>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowPhoneHelp(false)}
                className="w-full py-2.5 bg-violet-600 text-white font-semibold rounded-xl text-xs hover:bg-violet-700 cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
