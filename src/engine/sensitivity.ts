import type { SkillSpec, SkillId, ScoreResult } from './types';
import { runScoring } from './scoring';
import type { TelemetrySample } from './types';

export interface SensitivityItem {
  skillId: SkillId;
  skillLabel: string;
  featureKey: string;
  featureLabel: string;
  thresholdType: 'good' | 'bad';
  currentThreshold: number;
  avgScoreChange: number;
}

/**
 * For each threshold, compute the average skill score change
 * when that threshold is moved by -20% and +20%.
 */
export function computeSensitivity(
  samples: TelemetrySample[],
  skills: SkillSpec[],
): SensitivityItem[] {
  const items: SensitivityItem[] = [];

  for (const skill of skills) {
    for (const feature of skill.features) {
      for (const tType of ['good', 'bad'] as const) {
        const original = tType === 'good' ? feature.goodThreshold : feature.badThreshold;
        const factor = 0.2;

        // -20%
        const skillsMinus = skills.map((s) =>
          s.id === skill.id
            ? {
                ...s,
                features: s.features.map((f) =>
                  f.key === feature.key
                    ? {
                        ...f,
                        goodThreshold: tType === 'good' ? f.goodThreshold * (1 - factor) : f.goodThreshold,
                        badThreshold: tType === 'bad' ? f.badThreshold * (1 - factor) : f.badThreshold,
                      }
                    : f,
                ),
              }
            : s,
        );

        // +20%
        const skillsPlus = skills.map((s) =>
          s.id === skill.id
            ? {
                ...s,
                features: s.features.map((f) =>
                  f.key === feature.key
                    ? {
                        ...f,
                        goodThreshold: tType === 'good' ? f.goodThreshold * (1 + factor) : f.goodThreshold,
                        badThreshold: tType === 'bad' ? f.badThreshold * (1 + factor) : f.badThreshold,
                      }
                    : f,
                ),
              }
            : s,
        );

        const baseResult: ScoreResult = runScoring(samples, skills);
        const minusResult = runScoring(samples, skillsMinus);
        const plusResult = runScoring(samples, skillsPlus);

        const baseSkill = baseResult.skills.find((s) => s.id === skill.id)!;
        const minusSkill = minusResult.skills.find((s) => s.id === skill.id)!;
        const plusSkill = plusResult.skills.find((s) => s.id === skill.id)!;

        const avgChange = (Math.abs(minusSkill.score - baseSkill.score) + Math.abs(plusSkill.score - baseSkill.score)) / 2;

        items.push({
          skillId: skill.id,
          skillLabel: skill.label,
          featureKey: feature.key,
          featureLabel: feature.label,
          thresholdType: tType,
          currentThreshold: original,
          avgScoreChange: Math.round(avgChange * 10) / 10,
        });
      }
    }
  }

  // Sort largest first
  items.sort((a, b) => b.avgScoreChange - a.avgScoreChange);
  return items;
}
