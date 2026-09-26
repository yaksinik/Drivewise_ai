import {
  Disc, Gauge, ShipWheel, CornerUpRight,
  Info, Sparkles, type LucideIcon,
} from 'lucide-react';
import type { SkillResult } from '@/engine/types';
import { StatusBadge, ScoreBar } from './StatusBadge';
import { ScoreDrawer } from './ScoreDrawer';
import { ChevronRight } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Disc,
  Gauge,
  ShipWheel,
  CornerUpRight,
};

interface SkillCardProps {
  skill: SkillResult;
  previousScore?: number;
}

export function SkillCard({ skill, previousScore }: SkillCardProps) {
  const Icon = ICON_MAP[skill.icon] ?? Sparkles;
  const delta = previousScore !== undefined ? skill.score - previousScore : undefined;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-violet-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <Icon className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-violet-950">{skill.label}</h3>
            <StatusBadge status={skill.status} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-violet-900">{skill.score}</div>
          {delta !== undefined && delta !== 0 && (
            <div
              className={`text-xs font-medium ${delta > 0 ? 'text-green-600' : 'text-orange-600'}`}
            >
              {delta > 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}
            </div>
          )}
        </div>
      </div>
      <ScoreBar score={skill.score} />
      <div className="mt-4 flex items-center justify-between">
        <ScoreDrawer
          skill={skill}
          trigger={
            <span className="inline-flex items-center gap-1 text-sm text-violet-500 hover:text-violet-700">
              <Info className="w-4 h-4" />
              How this score was calculated
            </span>
          }
        />
        <ChevronRight className="w-4 h-4 text-violet-300" />
      </div>
    </div>
  );
}
