import { Upload, Sliders, AlertCircle } from 'lucide-react';
import { useStore } from '@/store';
import type { SimulatorParams } from '@/engine/types';
import { generateSampleCsv } from '@/engine/csv';

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
    csvError,
    csvFileName,
  } = useStore();

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
      <div className="flex items-center gap-2 mb-4">
        <Sliders className="w-5 h-5 text-violet-600" />
        <h3 className="font-semibold text-violet-950">Data Source</h3>
      </div>

      {/* Toggle buttons */}
            <div className="flex gap-2 mb-4 p-1 bg-violet-50 rounded-xl">
        <button
          onClick={switchToSimulator}
          className={`flex-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            dataSource === 'simulator' ? 'bg-white text-violet-700 shadow-sm' : 'text-violet-400 hover:text-violet-600'
          }`}
        >
          Simulator
        </button>
        <button
          onClick={switchToCsvView}
          className={`flex-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            dataSource === 'csv' ? 'bg-white text-violet-700 shadow-sm' : 'text-violet-400 hover:text-violet-600'
          }`}
        >
          CSV Upload
        </button>
        <button
          onClick={switchToLiveView}
          className={`flex-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
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
            className="text-sm text-violet-500 hover:text-violet-700 underline"
          >
            Download a sample CSV template
          </button>
        </div>
      )}
            {dataSource === 'live' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            <strong>Prototype notice:</strong> this uses your phone's real motion sensors (no GPS yet), so
            Speed Consistency won't be meaningful for a live-recorded trip — the Data Quality check will
            flag this automatically. Hold the phone still for the first 2 seconds after pressing Start.
          </div>

          {(liveStatus === 'idle' || liveStatus === 'error' || liveStatus === 'done') && (
            <>
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
                </select>
                <p className="text-xs text-violet-400 mt-1">
                  Recording stops automatically at this time, even if you forget or get interrupted.
                </p>
              </div>
              <button
                onClick={startLiveRecording}
                className="w-full py-4 rounded-xl bg-violet-600 text-white font-bold text-lg hover:bg-violet-700 transition-colors"
              >
                ▶ Start Recording
              </button>
            </>
          )}

          {liveStatus === 'requesting-permission' && (
            <div className="text-center py-6 text-violet-600 text-sm">
              Requesting motion sensor permission — check for a browser prompt…
            </div>
          )}

          {liveStatus === 'recording' && (
            <div className="text-center py-4">
              <div className="text-4xl font-bold text-violet-700 tabular-nums mb-2">
                {Math.ceil(liveRemainingSec)}s
              </div>
              <p className="text-xs text-violet-500 mb-4">Recording… mount the phone and drive normally.</p>
              <button
                onClick={stopLiveRecording}
                className="w-full py-3 rounded-xl bg-red-100 text-red-700 font-semibold hover:bg-red-200 transition-colors"
              >
                ■ Stop Now
              </button>
            </div>
          )}

          {liveStatus === 'processing' && (
            <div className="text-center py-6 text-violet-600 text-sm">Processing recording…</div>
          )}

          {liveStatus === 'done' && !liveError && (
            <p className="text-sm text-green-600 bg-green-50 rounded-lg p-2">
              Trip recorded and scored — check the Dashboard.
            </p>
          )}

          {liveError && (
            <div className="flex items-start gap-2 text-sm text-orange-700 bg-orange-50 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{liveError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
