import { Target, TrendingUp, AlertTriangle, Car } from 'lucide-react';
import { useStore } from '@/store';
import { SkillCard } from '@/components/SkillCard';
import { PageHeader, EmptyState, LoadingState, ErrorState, Card } from '@/components/ui';

export function DashboardPage() {
  const { scoreResult, loading, dataSource, csvError, samples } = useStore();

  if (loading) return <LoadingState />;

  if (dataSource === 'csv' && csvError) {
    return <ErrorState message={csvError} />;
  }

  if (samples.length === 0) {
    return (
      <EmptyState
        icon={Car}
        title="No trip data yet"
        message="Upload a CSV file with telemetry columns (time_s, a_long, a_lat, yaw_rate, speed) to see your driving scores."
      />
    );
  }

  if (!scoreResult) {
    return <LoadingState />;
  }

  // Data quality check
  if (scoreResult.dataQuality.score < 40) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Your driving skill overview" />
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-900 text-lg">
                Not enough reliable data to score
              </h3>
              <p className="text-sm text-orange-700 mt-1 mb-3">
                The data quality score is {scoreResult.dataQuality.score}/100. Here's why:
              </p>
              <ul className="list-disc list-inside text-sm text-orange-700 space-y-1">
                {scoreResult.dataQuality.reasons.length > 0 ? (
                  scoreResult.dataQuality.reasons.map((r, i) => <li key={i}>{r}</li>)
                ) : (
                  <li>Multiple data quality issues detected.</li>
                )}
              </ul>
              <p className="text-sm text-orange-700 mt-3">
                Try uploading a file with more complete data, or switch to Simulator mode to
                explore the app.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { skills, overall, nextFocus } = scoreResult;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Your five motor-skill scores, based on the current trip data"
      />

      {/* Overall summary */}
      <Card className="mb-6 bg-gradient-to-br from-violet-600 to-violet-800 border-violet-700">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-violet-200 text-sm">Overall smoothness</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-white">{overall}</span>
              <span className="text-violet-300">/ 100</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-violet-200 text-sm">Data quality</p>
            <span className="text-2xl font-bold text-white">
              {scoreResult.dataQuality.score}
            </span>
            <span className="text-violet-300">/ 100</span>
          </div>
        </div>
      </Card>

      {/* Next Focus */}
      {nextFocus && (
        <Card className="mb-6 border-violet-200 bg-violet-50/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
              <Target className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-violet-500 font-medium">Your next focus</p>
              <h3 className="text-lg font-semibold text-violet-950">
                {nextFocus.label} — score {nextFocus.score}
              </h3>
              <p className="text-sm text-violet-600 mt-1">
                Practice drill: <strong>{nextFocus.drill}</strong>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Skill cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {skills.map((skill) => (
          <SkillCard key={skill.id} skill={skill} />
        ))}
      </div>

      {/* Supportive note */}
      <div className="mt-6 flex items-center gap-2 text-sm text-violet-400">
        <TrendingUp className="w-4 h-4" />
        Scores update instantly as you adjust the simulator sliders or thresholds.
      </div>
    </div>
  );
}
