import {
  Map, Smartphone, ClipboardList, Users, FileDown, Bot, Clock,
} from 'lucide-react';
import { PageHeader, Card } from '@/components/ui';

interface RoadmapItem {
  title: string;
  description: string;
  icon: typeof Smartphone;
}

const ROADMAP: RoadmapItem[] = [
  {
    title: 'Live phone sensors',
    description: 'Connect real phone accelerometer, gyroscope, and GPS data for live in-car scoring.',
    icon: Smartphone,
  },
  {
    title: 'Instructor ratings study',
    description: 'Collect parallel ratings from professional driving instructors to validate and calibrate scores.',
    icon: ClipboardList,
  },
  {
    title: 'User accounts',
    description: 'Let drivers save trips, track progress over time, and review their history.',
    icon: Users,
  },
  {
    title: 'Report export',
    description: 'Export trip analysis and skill summaries as PDF for sharing with instructors or coaches.',
    icon: FileDown,
  },
  {
    title: 'AI coach',
    description: 'Personalised, natural-language coaching recommendations based on each driver\'s patterns.',
    icon: Bot,
  },
];

export function RoadmapPage() {
  return (
    <div>
      <PageHeader
        title="Roadmap"
        subtitle="What's planned for Stage 2 — all items are future work"
      />

      <div className="space-y-3">
        {ROADMAP.map((item, i) => {
          const Icon = item.icon;
          return (
            <Card key={i}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6 text-violet-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-violet-950">{item.title}</h3>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      <Clock className="w-3.5 h-3.5" />
                      Planned
                    </span>
                  </div>
                  <p className="text-sm text-violet-600 mt-1">{item.description}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 bg-violet-50 border-violet-200">
        <div className="flex items-start gap-3">
          <Map className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-violet-900">Stage 1 scope</h3>
            <p className="text-sm text-violet-600 mt-1">
              This prototype covers Stage 1 only: a front-end demonstration of the scoring
              approach and assumption transparency. Everything listed above is Stage 2 work
              and has not been started.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
