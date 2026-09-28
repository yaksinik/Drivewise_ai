import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect, type ReactNode } from 'react';
import type {
  SimulatorParams,
  TelemetrySample,
  DataSource,
  SkillSpec,
  ScoreResult,
  AssumptionSource,
  LiveStatus,
} from '@/engine/types';
import { generateTrip, SAMPLE_RATE } from '@/engine/signalGen';
import { runScoring } from '@/engine/scoring';
import { DEFAULT_SKILLS, ASSUMPTION_PROFILES } from '@/engine/defaults';
import { parseCsv, type CsvParseResult } from '@/engine/csv';
import { requestMotionPermission, LiveRecorder, processLiveSamples } from '@/engine/liveCapture';

interface StoreValue {
  dataSource: DataSource;
  simulatorParams: SimulatorParams;
  samples: TelemetrySample[];
  skills: SkillSpec[];
  scoreResult: ScoreResult | null;
  csvError: string | null;
  csvFileName: string | null;
  activeProfileId: string;
  // actions
  setSimulatorParam: (key: keyof SimulatorParams, value: number) => void;
  uploadCsv: (text: string, fileName: string) => CsvParseResult;
  switchToSimulator: () => void;
  switchToCsvView: () => void;
  updateThreshold: (skillId: string, featureKey: string, thresholdType: 'good' | 'bad', value: number) => void;
  resetThresholds: () => void;
  applyProfile: (profileId: string) => void;
  setFeatureSource: (skillId: string, featureKey: string, source: AssumptionSource) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
  liveStatus: LiveStatus;
  liveError: string | null;
  liveRemainingSec: number;
  liveDurationSec: number;
  setLiveDurationSec: (sec: number) => void;
  startLiveRecording: () => Promise<void>;
  stopLiveRecording: () => void;
  switchToLiveView: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const DEFAULT_SIM_PARAMS: SimulatorParams = {
  brakingHarshness: 35,
  accelHarshness: 30,
  speedSteadiness: 60,
  turningSmoothness: 45,
  steeringNervousness: 40,
};

const SESSION_KEY = 'drivewise_session_v1';

interface SavedSession {
  dataSource: DataSource;
  simulatorParams: SimulatorParams;
  csvSamples: TelemetrySample[];
  csvFileName: string | null;
  liveSamples: TelemetrySample[];
  skills: SkillSpec[];
  activeProfileId: string;
}

/**
 * Loads whatever session was last saved to this browser, so a reload (or an
 * accidental tab close) doesn't wipe the current trip. Falls back to sane
 * defaults if nothing is saved, or if storage is unavailable (e.g. private
 * browsing) or the saved data is malformed.
 */
function loadSavedSession(): SavedSession {
  const fallback: SavedSession = {
    dataSource: 'simulator',
    simulatorParams: DEFAULT_SIM_PARAMS,
    csvSamples: [],
    csvFileName: null,
    liveSamples: [],
    skills: applyProfileMultipliers('standard', DEFAULT_SKILLS),
    activeProfileId: 'standard',
  };
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      dataSource: parsed.dataSource ?? fallback.dataSource,
      simulatorParams: parsed.simulatorParams ?? fallback.simulatorParams,
      csvSamples: parsed.csvSamples ?? fallback.csvSamples,
      csvFileName: parsed.csvFileName ?? fallback.csvFileName,
      liveSamples: parsed.liveSamples ?? fallback.liveSamples,
      skills: parsed.skills ?? fallback.skills,
      activeProfileId: parsed.activeProfileId ?? fallback.activeProfileId,
    };
  } catch {
    return fallback;
  }
}

function applyProfileMultipliers(profileId: string, skills: SkillSpec[]): SkillSpec[] {
  const profile = ASSUMPTION_PROFILES.find((p) => p.id === profileId);
  if (!profile) return skills;
  return skills.map((s) => ({
    ...s,
    features: s.features.map((f) => ({
      ...f,
      goodThreshold: f.goodThreshold * profile.multipliers[s.id],
      badThreshold: f.badThreshold * profile.multipliers[s.id],
      source: profileId === 'standard' ? f.source : ('Calibrated' as AssumptionSource),
    })),
  }));
}

export function StoreProvider({ children }: { children: ReactNode }) {
  // Read once on mount; only the very first call actually seeds state below
  // (React ignores the initial value passed to useState after mount).
  const initial = loadSavedSession();

  // ---- core state ----
  const [dataSource, setDataSource] = useState<DataSource>(initial.dataSource);
  const [simulatorParams, setSimulatorParams] = useState<SimulatorParams>(initial.simulatorParams);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(initial.csvFileName);
  const [csvSamples, setCsvSamples] = useState<TelemetrySample[]>(initial.csvSamples);
  const [skills, setSkills] = useState<SkillSpec[]>(initial.skills);
  const [activeProfileId, setActiveProfileId] = useState<string>(initial.activeProfileId);
  const [loading, setLoading] = useState(false);

  // ---- live trip state ----
  const [liveStatus, setLiveStatus] = useState<LiveStatus>(initial.liveSamples.length > 0 ? 'done' : 'idle');
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveDurationSec, setLiveDurationSec] = useState<number>(60);
  const [liveRemainingSec, setLiveRemainingSec] = useState<number>(60);
  const [liveSamples, setLiveSamples] = useState<TelemetrySample[]>(initial.liveSamples);
  const liveRecorderRef = useRef<LiveRecorder | null>(null);
  const liveTimerRef = useRef<number | null>(null);

  // ---- persist the current session on every relevant change ----
  useEffect(() => {
    try {
      const toSave: SavedSession = {
        dataSource, simulatorParams, csvSamples, csvFileName, liveSamples, skills, activeProfileId,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(toSave));
    } catch {
      // Storage full or unavailable (e.g. private browsing) — fail silently,
      // the app still works, it just won't survive a reload this time.
    }
  }, [dataSource, simulatorParams, csvSamples, csvFileName, liveSamples, skills, activeProfileId]);

  // ---- derived data ----
  const samples: TelemetrySample[] = useMemo(() => {
    if (dataSource === 'simulator') {
      return generateTrip(simulatorParams);
    }
    return [];
  }, [dataSource, simulatorParams]);

  const effectiveSamples =
    dataSource === 'csv' ? csvSamples : dataSource === 'live' ? liveSamples : samples;

  const scoreResult = useMemo(() => {
    if (effectiveSamples.length === 0) return null;
    return runScoring(effectiveSamples, skills);
  }, [effectiveSamples, skills]);

  // ---- simulator / csv actions ----
  const setSimulatorParam = useCallback((key: keyof SimulatorParams, value: number) => {
    setSimulatorParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const uploadCsv = useCallback((text: string, fileName: string): CsvParseResult => {
    setLoading(true);
    const result = parseCsv(text);
    if (result.error) {
      setCsvError(result.error);
      setCsvSamples([]);
      setDataSource('csv');
      setCsvFileName(fileName);
    } else {
      setCsvError(null);
      setCsvSamples(result.samples);
      setDataSource('csv');
      setCsvFileName(fileName);
    }
    setLoading(false);
    return result;
  }, []);

  const switchToSimulator = useCallback(() => {
    setDataSource('simulator');
    setCsvError(null);
    setCsvFileName(null);
  }, []);

  const switchToCsvView = useCallback(() => {
    setDataSource('csv');
  }, []);

  // ---- live trip actions ----
  const switchToLiveView = useCallback(() => {
    setDataSource('live');
    setLiveError(null);
    // Don't stomp on a completed recording just because the tab was
    // reopened — only reset to the start screen if there's nothing to show.
    setLiveStatus(liveSamples.length > 0 ? 'done' : 'idle');
  }, [liveSamples]);

  const stopLiveRecording = useCallback(() => {
    if (liveTimerRef.current !== null) {
      window.clearInterval(liveTimerRef.current);
      liveTimerRef.current = null;
    }
    const recorder = liveRecorderRef.current;
    if (!recorder) return;
    setLiveStatus('processing');
    const raw = recorder.stop();
    const processed = processLiveSamples(raw);
    if (processed.length === 0) {
      setLiveError('No usable motion data was recorded. Make sure sensor permission was granted and the phone stayed on during recording.');
      setLiveStatus('error');
      return;
    }
    setLiveSamples(processed);
    setDataSource('live');
    setLiveStatus('done');
  }, []);

  const startLiveRecording = useCallback(async () => {
    setLiveError(null);
    setLiveStatus('requesting-permission');
    const perm = await requestMotionPermission();
    if (!perm.granted) {
      setLiveError(perm.reason ?? 'Motion sensor permission was not granted.');
      setLiveStatus('error');
      return;
    }
    const recorder = new LiveRecorder();
    liveRecorderRef.current = recorder;
    recorder.start();
    setLiveStatus('recording');
    setLiveRemainingSec(liveDurationSec);

    const startedAt = performance.now();
    liveTimerRef.current = window.setInterval(() => {
      const elapsed = (performance.now() - startedAt) / 1000;
      const remaining = Math.max(0, liveDurationSec - elapsed);
      setLiveRemainingSec(remaining);
      if (remaining <= 0) {
        stopLiveRecording();
      }
    }, 200);
  }, [liveDurationSec, stopLiveRecording]);

  // ---- assumptions lab actions ----
  const updateThreshold = useCallback(
    (skillId: string, featureKey: string, thresholdType: 'good' | 'bad', value: number) => {
      setSkills((prev) =>
        prev.map((s) =>
          s.id === skillId
            ? {
                ...s,
                features: s.features.map((f) =>
                  f.key === featureKey
                    ? {
                        ...f,
                        goodThreshold: thresholdType === 'good' ? value : f.goodThreshold,
                        badThreshold: thresholdType === 'bad' ? value : f.badThreshold,
                        source: 'User-set' as AssumptionSource,
                      }
                    : f,
                ),
              }
            : s,
        ),
      );
    },
    [],
  );

  const resetThresholds = useCallback(() => {
    setSkills(applyProfileMultipliers('standard', DEFAULT_SKILLS));
    setActiveProfileId('standard');
  }, []);

  const applyProfile = useCallback((profileId: string) => {
    setActiveProfileId(profileId);
    setSkills((prev) => {
      // Reset to defaults then apply multiplier — we need to use DEFAULT_SKILLS as base
      return applyProfileMultipliers(profileId, DEFAULT_SKILLS);
    });
  }, []);

  const setFeatureSource = useCallback(
    (skillId: string, featureKey: string, source: AssumptionSource) => {
      setSkills((prev) =>
        prev.map((s) =>
          s.id === skillId
            ? {
                ...s,
                features: s.features.map((f) =>
                  f.key === featureKey ? { ...f, source } : f,
                ),
              }
            : s,
        ),
      );
    },
    [],
  );

  const value: StoreValue = {
    dataSource,
    simulatorParams,
    samples: effectiveSamples,
    skills,
    scoreResult,
    csvError,
    csvFileName,
    activeProfileId,
    setSimulatorParam,
    uploadCsv,
    switchToSimulator,
    switchToCsvView,
    updateThreshold,
    resetThresholds,
    applyProfile,
    setFeatureSource,
    loading,
    setLoading,
    liveStatus,
    liveError,
    liveRemainingSec,
    liveDurationSec,
    setLiveDurationSec,
    startLiveRecording,
    stopLiveRecording,
    switchToLiveView,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export { SAMPLE_RATE };