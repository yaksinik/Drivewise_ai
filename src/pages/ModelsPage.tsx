import { Cpu, CheckCircle2, FlaskConical, Clock } from 'lucide-react';
import { PageHeader, Card } from '@/components/ui';

interface MethodRow {
  method: string;
  purpose: string;
  status: 'Implemented in app' | 'Tested in research notebook (simulated data)' | 'Planned';
}

const METHODS: MethodRow[] = [
  {
    method: 'Heuristic scoring engine',
    purpose: 'Maps driving features (peak decel, jerk, speed deviation, etc.) to 0-100 skill scores using good/bad thresholds.',
    status: 'Implemented in app',
  },
  {
    method: 'Low-pass Butterworth filter (3 Hz)',
    purpose: 'Smooths accelerometer signals to remove high-frequency noise before feature extraction.',
    status: 'Implemented in app',
  },
  {
    method: 'High-pass filter (0.5 Hz) for steering',
    purpose: 'Isolates nervous, high-frequency steering corrections from smooth, intentional turns.',
    status: 'Implemented in app',
  },
  {
    method: 'Rolling-mean speed deviation',
    purpose: 'Measures how much speed drifts from a 10-second local average to assess consistency.',
    status: 'Implemented in app',
  },
  {
    method: 'Harsh braking event detection',
    purpose: 'Identifies moments where deceleration exceeds 3 m/s² for visualisation and coaching.',
    status: 'Implemented in app',
  },
  {
    method: 'Ridge regression',
    purpose: 'Linear model to explore which features best predict an overall smoothness rating.',
    status: 'Tested in research notebook (simulated data)',
  },
  {
    method: 'Random Forest',
    purpose: 'Tree-ensemble model to capture non-linear relationships between features and ratings.',
    status: 'Tested in research notebook (simulated data)',
  },
  {
    method: 'LightGBM',
    purpose: 'Gradient-boosted tree model for comparison with Random Forest on simulated data.',
    status: 'Tested in research notebook (simulated data)',
  },
  {
    method: '1D-CNN',
    purpose: 'Convolutional neural network to learn driving patterns directly from raw telemetry.',
    status: 'Planned',
  },
  {
    method: 'DTW braking-shape matching',
    purpose: 'Compare braking event shapes against reference profiles using dynamic time warping.',
    status: 'Planned',
  },
  {
    method: 'Isolation Forest',
    purpose: 'Detect unusual driving events as anomalies without labelled data.',
    status: 'Planned',
  },
  {
    method: 'K-Means / GMM clustering',
    purpose: 'Discover natural driving-style groups from unsupervised feature clustering.',
    status: 'Planned',
  },
  {
    method: 'SHAP values',
    purpose: 'Explain individual model predictions by attributing contributions to each feature.',
    status: 'Planned',
  },
  {
    method: 'Mann-Kendall trend test',
    purpose: "Detect whether a driver's scores are statistically improving or declining over time.",
    status: 'Planned',
  },
  {
    method: 'LLM coach',
    purpose: "Generate natural-language coaching feedback tailored to the driver's weakest skills.",
    status: 'Planned',
  },
];

const STATUS_CONFIG = {
  'Implemented in app': {
    icon: CheckCircle2,
    bg: 'bg-green-100',
    text: 'text-green-700',
  },
  'Tested in research notebook (simulated data)': {
    icon: FlaskConical,
    bg: 'bg-violet-100',
    text: 'text-violet-700',
  },
  Planned: {
    icon: Clock,
    bg: 'bg-gray-100',
    text: 'text-gray-600',
  },
} as const;

export function ModelsPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Models & Methods"
        subtitle="What's built, what's tested in notebooks, and what's planned"
      />



      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-5 h-5 text-violet-600" />
          <h3 className="font-semibold text-violet-950">Method inventory</h3>
        </div>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm min-w-[540px]">
            <thead>
              <tr className="border-b border-violet-100 text-left">
                <th className="py-2 pr-4 font-medium text-violet-500">Method</th>
                <th className="py-2 pr-4 font-medium text-violet-500">Purpose</th>
                <th className="py-2 font-medium text-violet-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {METHODS.map((m, i) => {
                const cfg = STATUS_CONFIG[m.status];
                const Icon = cfg.icon;
                return (
                  <tr key={i} className="border-b border-violet-50">
                    <td className="py-3 pr-4 font-medium text-violet-900 whitespace-nowrap">
                      {m.method}
                    </td>
                    <td className="py-3 pr-4 text-violet-600">{m.purpose}</td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {m.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AlertTriangle() {
  return (
    <svg
      className="w-5 h-5 text-orange-600 shrink-0 mt-0.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}
