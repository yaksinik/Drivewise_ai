import { createContext, useContext, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
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
import {
  requestMotionAndGpsPermission,
  LiveRecorder,
  processLiveSamples,
  type LiveTelemetrySnapshot,
} from '@/engine/liveCapture';
import {
  getStoredDriverProfile,
  saveTripToStorage,
  type SavedTripRecord,
} from '@/services/accountStorage';

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
  liveGpsWarning: string | null;
  liveRemainingSec: number;
  liveDurationSec: number;
  setLiveDurationSec: (sec: number) => void;
  startLiveRecording: () => Promise<void>;
  stopLiveRecording: () => void;
  switchToLiveView: () => void;
  liveSnapshot: LiveTelemetrySnapshot | null;
  saveCurrentTripToAccount: (title?: string, notes?: string, tags?: string[]) => SavedTripRecord | null;
  loadSavedTrip: (trip: SavedTripRecord) => void;
  // navigation
  navigate: (page: PageId) => void;
}

type PageId = 'dashboard' | 'trip' | 'history' | 'instructor' | 'assumptions' | 'dataset' | 'models' | 'roadmap';

const StoreContext = createContext<StoreValue | null>(null);

const DEFAULT_SIM_PARAMS: SimulatorParams = {
  brakingHarshness: 35,
  accelHarshness: 30,
  speedSteadiness: 60,
  turningSmoothness: 45,
  steeringNervousness: 40,
};

function applyProfileMultipliers(profileId: string, skills: SkillSpec[]): SkillSpec[] {
  const profile = ASSUMPTION_PROFILES.find((p) => p.id === profileId);
  if (!profile) return skills;
  return skills.map((s) => ({
    ...s,
    features: s.features.map((f) => ({
      ...f,
      goodThreshold: +(f.goodThreshold * profile.multipliers[s.id]).toFixed(2),
      badThreshold: +(f.badThreshold * profile.multipliers[s.id]).toFixed(2),
      source: profileId === 'standard' ? f.source : ('Calibrated' as AssumptionSource),
    })),
  }));
}

export function StoreProvider({ children, onNavigate }: { children: ReactNode; onNavigate?: (page: PageId) => void }) {
  // ---- core state ----
  const [dataSource, setDataSource] = useState<DataSource>('simulator');
  const [simulatorParams, setSimulatorParams] = useState<SimulatorParams>(DEFAULT_SIM_PARAMS);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvSamples, setCsvSamples] = useState<TelemetrySample[]>([]);
  const [skills, setSkills] = useState<SkillSpec[]>(() =>
    applyProfileMultipliers('standard', DEFAULT_SKILLS),
  );
  const [activeProfileId, setActiveProfileId] = useState<string>('standard');
  const [loading, setLoading] = useState(false);

  // ---- live trip state ----
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('idle');
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveGpsWarning, setLiveGpsWarning] = useState<string | null>(null);
  const [liveDurationSec, setLiveDurationSec] = useState<number>(60);
  const [liveRemainingSec, setLiveRemainingSec] = useState<number>(60);
  const [liveSamples, setLiveSamples] = useState<TelemetrySample[]>([]);
  const [liveSnapshot, setLiveSnapshot] = useState<LiveTelemetrySnapshot | null>(null);
  const liveRecorderRef = useRef<LiveRecorder | null>(null);
  const liveTimerRef = useRef<number | null>(null);

  // ---- navigation ----
  const navigate = useCallback((page: PageId) => {
    onNavigate?.(page);
  }, [onNavigate]);

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
    setLiveStatus('idle');
    setLiveError(null);
    setLiveGpsWarning(null);
    setLiveSnapshot(null);
  }, []);

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
      setLiveError('No usable motion data was recorded. Make sure sensor permission was granted and the phone stayed active.');
      setLiveStatus('error');
      setLiveSnapshot(null);
      return;
    }

    // Check whether any GPS fixes were captured
    const gpsFixCount = Array.isArray(raw) ? 0 : raw.gps.length;
    if (gpsFixCount === 0) {
      setLiveGpsWarning(
        'No GPS signal was received — speed stayed at 0 throughout the trip. ' +
        'Speed Consistency scores are not meaningful for this recording. ' +
        'Grant location permission and ensure the phone has a clear sky view to capture real speed data.'
      );
    } else {
      setLiveGpsWarning(null);
    }

    setLiveSamples(processed);
    setDataSource('live');
    setLiveStatus('done');
    setLiveSnapshot(null);

    // Exit fullscreen and navigate to Dashboard after scoring completes
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch {}
    navigate('dashboard');
  }, [navigate]);

  const startLiveRecording = useCallback(async () => {
    setLiveError(null);
    setLiveStatus('requesting-permission');
    const perm = await requestMotionAndGpsPermission();
    if (!perm.granted) {
      setLiveError(perm.reason ?? 'Motion sensor or location permission was not granted.');
      setLiveStatus('error');
      return;
    }
    const recorder = new LiveRecorder((snapshot) => {
      setLiveSnapshot(snapshot);
    });
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

  // ---- account & history actions ----
  const saveCurrentTripToAccount = useCallback(
    (title = 'Recorded Driving Session', notes = '', tags: string[] = ['Evaluation']): SavedTripRecord | null => {
      if (!scoreResult || effectiveSamples.length === 0) return null;
      const profile = getStoredDriverProfile();
      const record: SavedTripRecord = {
        id: `trip_${Date.now()}`,
        driverId: profile.id,
        title,
        timestamp: new Date().toISOString(),
        durationSeconds: effectiveSamples.length > 0 ? Math.round(effectiveSamples[effectiveSamples.length - 1].time_s) : 0,
        sampleCount: effectiveSamples.length,
        dataSource,
        tags,
        notes,
        overallScore: scoreResult.overall,
        dataQualityScore: scoreResult.dataQuality.score,
        skills: scoreResult.skills.map((s) => ({
          id: s.id,
          label: s.label,
          score: s.score,
          status: s.status,
        })),
        harshBrakingCount: 0,
        samples: effectiveSamples,
        scoreResult,
      };
      saveTripToStorage(record);
      return record;
    },
    [scoreResult, effectiveSamples, dataSource]
  );

  const loadSavedTrip = useCallback((trip: SavedTripRecord) => {
    setDataSource('csv');
    setCsvSamples(trip.samples);
    setCsvFileName(`Historical: ${trip.title}`);
    setCsvError(null);
  }, []);

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
    setSkills(() => {
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
    liveGpsWarning,
    liveRemainingSec,
    liveDurationSec,
    setLiveDurationSec,
    startLiveRecording,
    stopLiveRecording,
    switchToLiveView,
    liveSnapshot,
    saveCurrentTripToAccount,
    loadSavedTrip,
    navigate,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export type { PageId };
export { SAMPLE_RATE };