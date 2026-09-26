import type { StatusBand } from '@/engine/types';
import { CheckCircle2, TrendingUp, Circle } from 'lucide-react';

export function StatusBadge({ status }: { status: StatusBand }) {
  const config: Record<StatusBand, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
    Consistent: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
    Developing: { bg: 'bg-violet-100', text: 'text-violet-700', icon: TrendingUp },
    'Needs Practice': { bg: 'bg-orange-100', text: 'text-orange-700', icon: Circle },
  };
  const { bg, text, icon: Icon } = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      <Icon className="w-3.5 h-3.5" />
      {status}
    </span>
  );
}

export function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-violet-500' : 'bg-orange-500';
  return (
    <div className="h-2 bg-violet-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-500 ease-out`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}
