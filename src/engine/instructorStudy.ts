import type { SkillId, SkillSpec, TelemetrySample, ScoreResult } from './types';

export interface InstructorEvaluation {
  id: string;
  tripId: string;
  tripTitle: string;
  evaluatorName: string;
  evaluatorRole: 'Certified Driving Instructor' | 'Senior Examiner' | 'Road Safety Researcher' | 'Driving Coach';
  date: string;
  rubricScores: {
    braking: number;       // 1-10 scale
    acceleration: number;  // 1-10 scale
    speed: number;         // 1-10 scale
    turning: number;       // 1-10 scale
    steering: number;      // 1-10 scale
  };
  overallGrade: number;    // 1-100 scale
  passed: boolean;
  qualitativeNotes: string;
  trafficDensity: 'Light' | 'Moderate' | 'Heavy';
  weather: 'Clear' | 'Rain' | 'Night';
}

export interface ParallelStudyEntry {
  tripId: string;
  tripTitle: string;
  timestamp: string;
  algoOverall: number;
  algoSkills: Record<SkillId, number>;
  instructorOverall: number;
  instructorSkills: Record<SkillId, number>;
  evaluatorName: string;
  notes: string;
}

export interface StatisticalMetric {
  sampleCount: number;
  pearsonR: number;            // Correlation between algorithmic and instructor overall
  spearmanRho: number;         // Rank correlation
  meanAbsoluteError: number;   // MAE
  rootMeanSquareError: number; // RMSE
  meanDifferenceBias: number;  // Mean (Algo - Instructor)
  limitsOfAgreementUpper: number; // Bias + 1.96 * SD
  limitsOfAgreementLower: number; // Bias - 1.96 * SD
  regressionSlope: number;     // m in y = mx + c
  regressionIntercept: number; // c
  rSquared: number;            // R^2 goodness of fit
}

export interface SkillCorrelation {
  skillId: SkillId;
  label: string;
  r: number;
  mae: number;
  algoMean: number;
  instructorMean: number;
  bias: number;
}

export interface CalibrationReport {
  overallMetrics: StatisticalMetric;
  skillCorrelations: SkillCorrelation[];
  recommendedMultipliers: Record<SkillId, number>;
  rationale: string[];
}

/**
 * No real instructor ratings have been collected yet.
 * This is empty by design — the Instructor Study page starts honest.
 * Add real entries via the "Record Instructor Rating" button in the UI,
 * or import a CSV from a real study session.
 */
export const DEFAULT_STUDY_DATASET: ParallelStudyEntry[] = [];

const STUDY_STORAGE_KEY = 'drivewise_instructor_study_v1';

export function getStoredStudyDataset(): ParallelStudyEntry[] {
  try {
    const raw = localStorage.getItem(STUDY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStudyDataset(dataset: ParallelStudyEntry[]): void {
  try {
    localStorage.setItem(STUDY_STORAGE_KEY, JSON.stringify(dataset));
  } catch (err) {
    console.error('Failed to save study dataset:', err);
  }
}

/** Pearson product-moment correlation coefficient */
export function calculatePearsonR(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  if (den === 0) return 0;
  return +(num / den).toFixed(4);
}

/** Spearman rank-order correlation coefficient */
export function calculateSpearmanRho(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;

  function getRanks(arr: number[]): number[] {
    const sorted = arr.map((val, idx) => ({ val, idx })).sort((a, b) => a.val - b.val);
    const ranks = new Array<number>(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j < n - 1 && sorted[j + 1].val === sorted[j].val) {
        j++;
      }
      const rank = (i + j + 2) / 2;
      for (let k = i; k <= j; k++) {
        ranks[sorted[k].idx] = rank;
      }
      i = j + 1;
    }
    return ranks;
  }

  const rankX = getRanks(x);
  const rankY = getRanks(y);
  return calculatePearsonR(rankX, rankY);
}

/** Comprehensive statistical validation analysis */
export function runStudyStatisticalAnalysis(dataset: ParallelStudyEntry[]): CalibrationReport {
  const n = dataset.length;
  if (n === 0) {
    return {
      overallMetrics: {
        sampleCount: 0,
        pearsonR: 0,
        spearmanRho: 0,
        meanAbsoluteError: 0,
        rootMeanSquareError: 0,
        meanDifferenceBias: 0,
        limitsOfAgreementUpper: 0,
        limitsOfAgreementLower: 0,
        regressionSlope: 1,
        regressionIntercept: 0,
        rSquared: 0,
      },
      skillCorrelations: [],
      recommendedMultipliers: { braking: 1, acceleration: 1, speed: 1, turning: 1, steering: 1 },
      rationale: ['No study samples recorded.'],
    };
  }

  const algoOveralls = dataset.map((d) => d.algoOverall);
  const instOveralls = dataset.map((d) => d.instructorOverall);

  const pearsonR = calculatePearsonR(algoOveralls, instOveralls);
  const spearmanRho = calculateSpearmanRho(algoOveralls, instOveralls);

  // Error metrics
  let sumAbsErr = 0;
  let sumSqErr = 0;
  let sumDiff = 0;
  const diffs: number[] = [];

  for (let i = 0; i < n; i++) {
    const diff = algoOveralls[i] - instOveralls[i]; // positive means algorithm scored higher
    diffs.push(diff);
    sumDiff += diff;
    sumAbsErr += Math.abs(diff);
    sumSqErr += diff * diff;
  }

  const mae = +(sumAbsErr / n).toFixed(2);
  const rmse = +Math.sqrt(sumSqErr / n).toFixed(2);
  const bias = +(sumDiff / n).toFixed(2);

  // Standard deviation of differences for Bland-Altman limits
  const varDiff = diffs.reduce((acc, d) => acc + Math.pow(d - bias, 2), 0) / (n - 1 || 1);
  const sdDiff = Math.sqrt(varDiff);
  const loaUpper = +(bias + 1.96 * sdDiff).toFixed(2);
  const loaLower = +(bias - 1.96 * sdDiff).toFixed(2);

  // Linear Regression: Instructor = m * Algo + c
  const meanAlgo = algoOveralls.reduce((a, b) => a + b, 0) / n;
  const meanInst = instOveralls.reduce((a, b) => a + b, 0) / n;

  let cov = 0;
  let varAlgo = 0;
  for (let i = 0; i < n; i++) {
    cov += (algoOveralls[i] - meanAlgo) * (instOveralls[i] - meanInst);
    varAlgo += Math.pow(algoOveralls[i] - meanAlgo, 2);
  }

  const slope = varAlgo !== 0 ? +(cov / varAlgo).toFixed(3) : 1;
  const intercept = +(meanInst - slope * meanAlgo).toFixed(2);
  const rSquared = +(pearsonR * pearsonR).toFixed(4);

  // Skill-level correlations
  const skillKeys: SkillId[] = ['braking', 'acceleration', 'speed', 'turning', 'steering'];
  const skillLabels: Record<SkillId, string> = {
    braking: 'Braking Smoothness',
    acceleration: 'Acceleration Control',
    speed: 'Speed Consistency',
    turning: 'Turning Smoothness',
    steering: 'Steering Steadiness',
  };

  const skillCorrelations: SkillCorrelation[] = skillKeys.map((sId) => {
    const xVals = dataset.map((d) => d.algoSkills[sId] ?? 0);
    const yVals = dataset.map((d) => d.instructorSkills[sId] ?? 0);
    const r = calculatePearsonR(xVals, yVals);

    const algoM = +(xVals.reduce((a, b) => a + b, 0) / n).toFixed(1);
    const instM = +(yVals.reduce((a, b) => a + b, 0) / n).toFixed(1);
    const sDiff = xVals.reduce((acc, x, idx) => acc + (x - yVals[idx]), 0) / n;
    const sMae = xVals.reduce((acc, x, idx) => acc + Math.abs(x - yVals[idx]), 0) / n;

    return {
      skillId: sId,
      label: skillLabels[sId],
      r,
      mae: +sMae.toFixed(2),
      algoMean: algoM,
      instructorMean: instM,
      bias: +sDiff.toFixed(2),
    };
  });

  // Recommended calibration multipliers
  const recommendedMultipliers: Record<SkillId, number> = {
    braking: 1.0,
    acceleration: 1.0,
    speed: 1.0,
    turning: 1.0,
    steering: 1.0,
  };

  const rationale: string[] = [];

  skillCorrelations.forEach((sc) => {
    let mult = 1.0;
    if (sc.algoMean > 10) {
      const ratio = sc.instructorMean / sc.algoMean;
      mult = Math.max(0.75, Math.min(1.35, +(1 + (ratio - 1) * 0.8).toFixed(2)));
    }
    recommendedMultipliers[sc.skillId] = mult;

    if (mult > 1.05) {
      rationale.push(
        `${sc.label}: Algorithm was ~${Math.abs(sc.bias).toFixed(1)} pts harsher than examiners (r = ${sc.r}). Recommended threshold relaxation by ${Math.round((mult - 1) * 100)}%.`
      );
    } else if (mult < 0.95) {
      rationale.push(
        `${sc.label}: Algorithm was ~${Math.abs(sc.bias).toFixed(1)} pts more lenient than examiners (r = ${sc.r}). Recommended threshold tightening by ${Math.round((1 - mult) * 100)}%.`
      );
    } else {
      rationale.push(
        `${sc.label}: High agreement with examiners (bias ${sc.bias > 0 ? '+' : ''}${sc.bias} pts, r = ${sc.r}). Standard threshold verified.`
      );
    }
  });

  return {
    overallMetrics: {
      sampleCount: n,
      pearsonR,
      spearmanRho,
      meanAbsoluteError: mae,
      rootMeanSquareError: rmse,
      meanDifferenceBias: bias,
      limitsOfAgreementUpper: loaUpper,
      limitsOfAgreementLower: loaLower,
      regressionSlope: slope,
      regressionIntercept: intercept,
      rSquared,
    },
    skillCorrelations,
    recommendedMultipliers,
    rationale,
  };
}

/** Export study dataset as CSV for SPSS / R / Python analysis */
export function exportStudyToCsv(dataset: ParallelStudyEntry[]): string {
  const headers = [
    'trip_id',
    'timestamp',
    'evaluator_name',
    'algo_overall',
    'instructor_overall',
    'diff_bias',
    'algo_braking',
    'instructor_braking',
    'algo_accel',
    'instructor_accel',
    'algo_speed',
    'instructor_speed',
    'algo_turning',
    'instructor_turning',
    'algo_steering',
    'instructor_steering',
    'qualitative_notes',
  ];

  const rows = dataset.map((d) => [
    `"${d.tripId}"`,
    `"${d.timestamp}"`,
    `"${d.evaluatorName.replace(/"/g, '""')}"`,
    d.algoOverall,
    d.instructorOverall,
    d.algoOverall - d.instructorOverall,
    d.algoSkills.braking ?? '',
    d.instructorSkills.braking ?? '',
    d.algoSkills.acceleration ?? '',
    d.instructorSkills.acceleration ?? '',
    d.algoSkills.speed ?? '',
    d.instructorSkills.speed ?? '',
    d.algoSkills.turning ?? '',
    d.instructorSkills.turning ?? '',
    d.algoSkills.steering ?? '',
    d.instructorSkills.steering ?? '',
    `"${(d.notes || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
