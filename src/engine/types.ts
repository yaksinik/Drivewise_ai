export type SignalKey =
  | 'brakingHarshness'
  | 'accelHarshness'
  | 'speedSteadiness'
  | 'turningSmoothness'
  | 'steeringNervousness';

export interface SimulatorParams {
  brakingHarshness: number; // 0-100
  accelHarshness: number; // 0-100
  speedSteadiness: number; // 0-100
  turningSmoothness: number; // 0-100
  steeringNervousness: number; // 0-100
}

export interface TelemetrySample {
  time_s: number;
  a_long: number; // m/s²
  a_lat: number; // m/s²
  yaw_rate: number; // rad/s
  speed: number; // m/s
}

export type SkillId =
  | 'braking'
  | 'acceleration'
  | 'speed'
  | 'turning'
  | 'steering';

export interface FeatureSpec {
  key: string;
  label: string;
  unit: string;
  goodThreshold: number;
  badThreshold: number;
  source: AssumptionSource;
  reason: string;
}

export type AssumptionSource =
  | 'Example value - needs literature check'
  | 'User-set'
  | 'Calibrated';

export interface SkillSpec {
  id: SkillId;
  label: string;
  icon: string; // lucide icon name
  features: FeatureSpec[];
  drill: string;
}

export interface FeatureResult {
  spec: FeatureSpec;
  value: number;
  score: number;
  formula: string;
}

export interface SkillResult {
  id: SkillId;
  label: string;
  icon: string;
  drill: string;
  score: number;
  status: StatusBand;
  features: FeatureResult[];
}

export type StatusBand = 'Consistent' | 'Developing' | 'Needs Practice';

export interface ScoreResult {
  skills: SkillResult[];
  overall: number;
  nextFocus: SkillResult | null;
  dataQuality: DataQualityResult;
}

export interface DataQualityResult {
  score: number;
  sampleGaps: number;
  noiseLevel: number;
  missingFlatSignals: string[];
  reasons: string[];
}

export interface AssumptionProfile {
  id: string;
  label: string;
  description: string;
  multipliers: Record<SkillId, number>;
}

export type DataSource = 'simulator' | 'csv' | 'live';

export type LiveStatus = 'idle' | 'requesting-permission' | 'recording' | 'processing' | 'done' | 'error';

export interface AssumptionRow {
  name: string;
  value: string;
  source: AssumptionSource;
  reason: string;
}
