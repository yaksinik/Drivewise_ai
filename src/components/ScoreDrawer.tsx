import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { SkillResult, FeatureResult } from '@/engine/types';
import { useStore } from '@/store';

interface ScoreDrawerProps {
  skill: SkillResult;
  trigger: ReactNode;
}

export function ScoreDrawer({ skill, trigger }: ScoreDrawerProps) {
  const [open, setOpen] = useState(false);
  const { scoreResult: previousResult } = useStore();

  // Find previous score for before/after if available from a baseline
  // We'll compute a simple delta display from the skill's feature values
  const previousSkill = previousResult?.skills.find((s) => s.id === skill.id);
  const delta = previousSkill ? skill.score - previousSkill.score : 0;

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-violet-100 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-violet-950">
                  How {skill.label} was calculated
                </h3>
                <p className="text-sm text-violet-400">Score: {skill.score} / 100</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-violet-50 text-violet-600"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="bg-violet-50 rounded-xl p-4">
                <p className="text-sm text-violet-700">
                  The skill score is the <strong>average</strong> of its feature scores.
                  Each feature is scored by linearly interpolating between a "good" and "bad"
                  threshold: 100 means the measured value is at or better than the good
                  threshold; 0 means it's at or worse than the bad threshold.
                </p>
              </div>

              {skill.features.map((f: FeatureResult) => (
                <div key={f.spec.key} className="border border-violet-100 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-violet-950">{f.spec.label}</span>
                    <span className="text-2xl font-bold text-violet-600">{f.score}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-violet-400">Measured</span>
                      <p className="font-medium text-violet-900">
                        {f.value.toFixed(3)} {f.spec.unit}
                      </p>
                    </div>
                    <div>
                      <span className="text-violet-400">Good</span>
                      <p className="font-medium text-green-600">
                        {f.spec.goodThreshold} {f.spec.unit}
                      </p>
                    </div>
                    <div>
                      <span className="text-violet-400">Bad</span>
                      <p className="font-medium text-orange-600">
                        {f.spec.badThreshold} {f.spec.unit}
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3 text-xs text-green-300 font-mono break-all">
                    {f.formula}
                  </div>
                  <div className="text-xs text-violet-400">
                    Source: <span className="text-violet-600">{f.spec.source}</span>
                  </div>
                </div>
              ))}

              <div className="bg-violet-50 rounded-xl p-3 text-sm text-violet-600">
                <div className="flex items-center justify-between">
                  <span>Skill average</span>
                  <span className="font-bold text-violet-900">{skill.score} / 100</span>
                </div>
                {delta !== 0 && (
                  <div className="flex items-center gap-1 mt-1 text-xs">
                    {delta > 0 ? (
                      <ChevronUp className="w-3 h-3 text-green-500" />
                    ) : (
                      <ChevronUp className="w-3 h-3 text-orange-500 rotate-180" />
                    )}
                    <span className={delta > 0 ? 'text-green-600' : 'text-orange-600'}>
                      {delta > 0 ? '+' : ''}{delta.toFixed(1)} from previous
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
