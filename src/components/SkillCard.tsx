import {
  Disc, Gauge, ShipWheel, CornerUpRight,
  Info, Sparkles, type LucideIcon,
} from 'lucide-react';
import type { SkillResult } from '@/engine/types';
import { StatusBadge, ScoreBar } from './StatusBadge';
import { ScoreDrawer } from './ScoreDrawer';

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
    <div className="panel p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-[--base] flex items-center justify-center border border-[--hairline]">
            <Icon className="w-4 h-4 text-[--ink]" />
          </div>
          <div>
            <h3 className="font-semibold text-[--ink] text-sm">{skill.label}</h3>
            <StatusBadge status={skill.status} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold mono text-[--ink]">{skill.score}</div>
          {delta !== undefined && delta !== 0 && (
            <div
              className={`text-xs font-medium mono ${delta > 0 ? 'text-[--steady]' : 'text-[--caution]'}`}
            >
              {delta > 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}
            </div>
          )}
        </div>
      </div>
      <ScoreBar score={skill.score} />
      <div className="mt-4">
        <ScoreDrawer
          skill={skill}
          trigger={
            <span className="inline-flex items-center gap-1.5 text-sm text-[--ink]/60 hover:text-[--ink] transition-colors">
              <Info className="w-4 h-4" />
              How this score was calculated
            </span>
          }
        />
      </div>
    </div>
  );
}
