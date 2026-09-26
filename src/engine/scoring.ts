import type {
  TelemetrySample,
  SkillSpec,
  FeatureResult,
  SkillResult,
  ScoreResult,
  StatusBand,
  DataQualityResult,
  AssumptionSource,
} from './types';
import { lowPass, highPass, derivative, centeredRollingMean, std, percentile, rms, clamp } from './dsp';
import { SAMPLE_RATE } from './signalGen';

const FS = SAMPLE_RATE; // 10 Hz

export interface ExtractedFeatures {
  peak_decel: number;
  max_neg_jerk: number;
  accel_p99: number;
  max_pos_jerk: number;
  speed_dev_std: number;
  lat_jerk_turn_p90: number;
  steer_hp_rms: number;
  // auxiliary
  harshBrakingEvents: { time_s: number; a_long: number }[];
}

/** Extract all features from a telemetry array. */
export function extractFeatures(samples: TelemetrySample[]): ExtractedFeatures {
  const aLong = samples.map((s) => s.a_long);
  const aLat = samples.map((s) => s.a_lat);
  const yawRate = samples.map((s) => s.yaw_rate);
  const speed = samples.map((s) => s.speed);

  // Low-pass filter accelerations (Butterworth-style, 3 Hz)
  const aLongFilt = lowPass(aLong, 3, FS);
  const aLatFilt = lowPass(aLat, 3, FS);

  // Jerk = da/dt
  const longJerk = derivative(aLongFilt, FS);
  const latJerk = derivative(aLatFilt, FS);

  // Peak deceleration (most negative a_long)
  const peakDecel = Math.abs(Math.min(...aLongFilt));

  // Max negative jerk (most negative longJerk)
  const maxNegJerk = Math.abs(Math.min(...longJerk));

  // Accel p99 (99th percentile of positive a_long)
  const positiveAccel = aLongFilt.filter((v) => v > 0);
  const accelP99 = positiveAccel.length > 0 ? percentile(positiveAccel, 99) : 0;

  // Max positive jerk
  const maxPosJerk = Math.max(...longJerk, 0);

    // Speed deviation std — how steady the driver holds speed, measured only
  // during moments they're actually trying to hold a constant speed.
  // Two fixes vs. the original: (1) a centered rolling mean, so normal
  // acceleration/braking isn't mistaken for "inconsistency" the way a
  // lagging trailing average would; (2) we only score "steady" samples
  // (small filtered a_long), since active accel/braking is already scored
  // by the Braking and Acceleration skills and shouldn't be double-counted here.
  const speedRolling = centeredRollingMean(speed, FS, 10);
  const speedDev = speed.map((v, i) => v - speedRolling[i]);
  const STEADY_ACCEL_THRESHOLD = 0.5; // m/s² — "trying to hold a constant speed"
  const steadyDev = speedDev.filter((_, i) => Math.abs(aLongFilt[i]) < STEADY_ACCEL_THRESHOLD);
  const speedDevStd = steadyDev.length > 10 ? std(steadyDev) : 0;

  // Lateral jerk during turns — turn = |a_lat| > 0.5 m/s², filtered at 1 Hz
  const aLatTurnFilt = lowPass(aLat, 1, FS);
  const latJerkTurn = latJerk.filter((_, i) => Math.abs(aLatTurnFilt[i]) > 0.5);
  const latJerkTurnP90 = latJerkTurn.length > 0 ? percentile(latJerkTurn.map(Math.abs), 90) : 0;

  // Steering high-pass RMS (high-pass yaw rate at 0.5 Hz)
  const yawHP = highPass(yawRate, 0.5, FS);
  const steerHpRms = rms(yawHP);

  // Detect harsh braking events: decel < -3 m/s²
  const harshBrakingEvents: { time_s: number; a_long: number }[] = [];
  for (let i = 0; i < samples.length; i++) {
    if (aLongFilt[i] < -3) {
      // avoid clustering — only add if > 1s since last event
      const last = harshBrakingEvents[harshBrakingEvents.length - 1];
      if (!last || samples[i].time_s - last.time_s > 1.0) {
        harshBrakingEvents.push({ time_s: samples[i].time_s, a_long: aLongFilt[i] });
      }
    }
  }

  return {
    peak_decel: peakDecel,
    max_neg_jerk: maxNegJerk,
    accel_p99: accelP99,
    max_pos_jerk: maxPosJerk,
    speed_dev_std: speedDevStd,
    lat_jerk_turn_p90: latJerkTurnP90,
    steer_hp_rms: steerHpRms,
    harshBrakingEvents,
  };
}

/** Map a feature value to a 0-100 score. */
export function featureScore(value: number, good: number, bad: number): number {
  // For these features, lower = better. Score = 100 * clamp((bad - x) / (bad - good), 0, 1)
  const score = 100 * clamp((bad - value) / (bad - good), 0, 1);
  return Math.round(score * 10) / 10;
}

export function statusBand(score: number): StatusBand {
  if (score >= 75) return 'Consistent';
  if (score >= 50) return 'Developing';
  return 'Needs Practice';
}

/** Score all skills from features and skill specs. */
export function scoreSkills(
  features: ExtractedFeatures,
  skills: SkillSpec[],
  featureSources?: Record<string, AssumptionSource>,
): SkillResult[] {
  return skills.map((skill) => {
    const featureResults: FeatureResult[] = skill.features.map((spec) => {
      const value = (features as unknown as Record<string, number>)[spec.key] ?? 0;
      const score = featureScore(value, spec.goodThreshold, spec.badThreshold);
      const source = featureSources?.[spec.key] ?? spec.source;
      const formula = `score = 100 × clamp((${spec.badThreshold} − ${value.toFixed(3)}) / (${spec.badThreshold} − ${spec.goodThreshold}), 0, 1) = ${score}`;
      return {
        spec: { ...spec, source },
        value,
        score,
        formula,
      };
    });

    const avg = featureResults.reduce((a, b) => a + b.score, 0) / featureResults.length;
    return {
      id: skill.id,
      label: skill.label,
      icon: skill.icon,
      drill: skill.drill,
      score: Math.round(avg * 10) / 10,
      status: statusBand(avg),
      features: featureResults,
    };
  });
}

/** Compute data quality score from sample gaps, noise, and missing/flat signals. */
export function computeDataQuality(samples: TelemetrySample[]): DataQualityResult {
  const reasons: string[] = [];
  const missingFlatSignals: string[] = [];

  if (samples.length === 0) {
    return {
      score: 0,
      sampleGaps: 100,
      noiseLevel: 0,
      missingFlatSignals: ['time_s', 'a_long', 'a_lat', 'yaw_rate', 'speed'],
      reasons: ['No data samples were provided.'],
    };
  }

  // Sample gaps: expected vs actual at 10 Hz
  const t0 = samples[0].time_s;
  const tEnd = samples[samples.length - 1].time_s;
  const expected = Math.max(1, Math.round((tEnd - t0) * FS));
  const gapRatio = Math.max(0, 1 - samples.length / expected);
  const sampleGaps = Math.round(gapRatio * 100);

  // Noise level: std of high-passed a_long
  const aLongArr = samples.map((s) => s.a_long);
  const hp = highPass(aLongArr, 3, FS);
  const noiseLevel = Math.round(std(hp) * 100) / 100;

  // Check for flat signals (std ≈ 0)
  const checkFlat = (arr: number[], name: string) => {
    if (std(arr) < 1e-6) missingFlatSignals.push(name);
  };
  checkFlat(samples.map((s) => s.a_long), 'a_long');
  checkFlat(samples.map((s) => s.a_lat), 'a_lat');
  checkFlat(samples.map((s) => s.yaw_rate), 'yaw_rate');
  checkFlat(samples.map((s) => s.speed), 'speed');

  // Score components
  let gapScore = 100 - sampleGaps;
  let noiseScore = clamp(100 - noiseLevel * 50, 0, 100);
  let flatScore = 100 - missingFlatSignals.length * 25;

  if (sampleGaps > 10) reasons.push(`${sampleGaps}% of expected samples are missing — scoring may be less reliable.`);
  if (noiseLevel > 1.5) reasons.push(`Noise level is elevated (${noiseLevel} m/s² high-pass RMS) — some harsh events may be artefacts.`);
  if (missingFlatSignals.length > 0) reasons.push(`These signals appear flat or missing: ${missingFlatSignals.join(', ')} — no variation to score.`);

  const overall = Math.round((gapScore + noiseScore + flatScore) / 3);

  return {
    score: clamp(overall, 0, 100),
    sampleGaps,
    noiseLevel,
    missingFlatSignals,
    reasons,
  };
}

/** Full scoring pipeline. */
export function runScoring(
  samples: TelemetrySample[],
  skills: SkillSpec[],
  featureSources?: Record<string, AssumptionSource>,
): ScoreResult {
  const dataQuality = computeDataQuality(samples);
  const features = extractFeatures(samples);
  const skills_ = scoreSkills(features, skills, featureSources);
  const overall = Math.round((skills_.reduce((a, b) => a + b.score, 0) / skills_.length) * 10) / 10;
  const nextFocus = skills_.reduce((min, s) => (s.score < min.score ? s : min), skills_[0]);

  return {
    skills: skills_,
    overall,
    nextFocus,
    dataQuality,
  };
}

export { SAMPLE_RATE };
