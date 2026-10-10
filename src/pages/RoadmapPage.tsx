import {
  Map, Smartphone, ClipboardList, Users, FileDown, Bot, CheckCircle2, Clock,
} from 'lucide-react';
import { PageHeader, Card } from '@/components/ui';

interface RoadmapItem {
  title: string;
  description: string;
  icon: typeof Smartphone;
  status: 'Implemented' | 'Planned';
}

const ROADMAP: RoadmapItem[] = [
  {
    title: 'Live phone sensors & GPS fusion',
    description: 'Real-time accelerometer, gyroscope, and GPS speed capture for in-car scoring, friction circle, and Live HUD.',
    icon: Smartphone,
    status: 'Implemented',
  },
  {
    title: 'Instructor ratings study & calibration',
    description: 'UI and statistical engine built (Pearson r, MAE, bias, auto-calibration). No real instructor ratings collected yet — data collection is Stage 2.',
    icon: ClipboardList,
    status: 'Planned',
  },
  {
    title: 'User accounts & longitudinal history',
    description: 'localStorage profile, trip saving, and progression chart infrastructure built. No server auth or real multi-session data collected yet.',
    icon: Users,
    status: 'Planned',
  },
  {
    title: 'Report export & PDF generation',
    description: 'Official telematics performance reports with 5-skill audits, examiner sign-offs, and printable PDF vector rendering.',
    icon: FileDown,
    status: 'Implemented',
  },
  {
    title: 'AI coach & natural-language feedback',
    description: 'Personalised, adaptive coaching recommendations based on individual telemetry pattern clustering.',
    icon: Bot,
    status: 'Planned',
  },
];

export function RoadmapPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Roadmap & Research Milestones"
        subtitle="Tracking the development and empirical validation stages of DriveWise AI"
      />

      <div className="space-y-3">
        {ROADMAP.map((item, i) => {
          const Icon = item.icon;
          const isDone = item.status === 'Implemented';
          return (
            <Card key={i} className={`transition-all duration-150 ${isDone ? 'border-violet-200 bg-white hover:border-violet-300 hover:shadow-md hover:shadow-violet-50' : 'hover:border-violet-200 hover:shadow-sm'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isDone ? 'bg-emerald-50 text-emerald-600' : 'bg-violet-50 text-violet-600'}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-violet-950">{item.title}</h3>
                    {isDone ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Implemented
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        <Clock className="w-3.5 h-3.5" />
                        Planned
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-violet-600 mt-1">{item.description}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
