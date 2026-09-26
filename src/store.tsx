import { createContext, useContext, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import type {
  SimulatorParams,
  TelemetrySample,
  DataSource,
  SkillSpec,
  ScoreResult,
  AssumptionSource,
} from '@/engine/types';
import { generateTrip, SAMPLE_RATE } from '@/engine/signalGen';
import { runScoring } from '@/engine/scoring';
import { DEFAULT_SKILLS, ASSUMPTION_PROFILES } from '@/engine/defaults';
import { parseCsv, type CsvParseResult } from '@/engine/csv';
import { requestMotionPermission, LiveRecorder, processLiveSamples } from '@/engine/liveCapture';
import type { LiveStatus } from '@/engine/types';

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
  const [dataSource, setDataSource] = useState<DataSource>('simulator');
  const [simulatorParams, setSimulatorParams] = useState<SimulatorParams>(DEFAULT_SIM_PARAMS);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [skills, setSkills] = useState<SkillSpec[]>(() =>
    applyProfileMultipliers('standard', DEFAULT_SKILLS),
  );
  const [activeProfileId, setActiveProfileId] = useState<string>('standard');
  const [loading, setLoading] = useState(false);

  // Generate / store samples
  const samples: TelemetrySample[] = useMemo(() => {
    if (dataSource === 'simulator') {
      return generateTrip(simulatorParams);
    }
    return [];
  }, [dataSource, simulatorParams]);

  // Upload CSV — stored in a ref-like state
  const [csvSamples, setCsvSamples] = useState<TelemetrySample[]>([]);

    const effectiveSamples = dataSource === 'csv' ? csvSamples : dataSource === 'live' ? liveSamples : samples;

  const scoreResult = useMemo(() => {
    if (effectiveSamples.length === 0) return null;
    return runScoring(effectiveSamples, skills);
  }, [effectiveSamples, skills]);

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
      const [liveStatus, setLiveStatus] = useState<LiveStatus>('idle');
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveDurationSec, setLiveDurationSec] = useState<number>(60);
  const [liveRemainingSec, setLiveRemainingSec] = useState<number>(60);
  const [liveSamples, setLiveSamples] = useState<TelemetrySample[]>([]);
  const liveRecorderRef = useRef<LiveRecorder | null>(null);
  const liveTimerRef = useRef<number | null>(null);

  const switchToLiveView = useCallback(() => {
    setDataSource('live');
    setLiveStatus('idle');
    setLiveError(null);
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
    switchToLiveView
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export { SAMPLE_RATE };
