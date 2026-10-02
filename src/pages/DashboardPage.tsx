import { useState } from 'react';
import { Target, TrendingUp, AlertTriangle, Car, FileText, BookmarkPlus, Check } from 'lucide-react';
import { useStore } from '@/store';
import { SkillCard } from '@/components/SkillCard';
import { PageHeader, EmptyState, LoadingState, ErrorState, Card } from '@/components/ui';
import { TripReportModal } from '@/components/TripReportModal';
import { getStoredDriverProfile } from '@/services/accountStorage';

export function DashboardPage() {
  const { scoreResult, loading, dataSource, csvError, samples, saveCurrentTripToAccount } = useStore();
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [tripTitle, setTripTitle] = useState('Driving Session Assessment');
  const [tripNotes, setTripNotes] = useState('');
  const [tripTags, setTripTags] = useState('Research, Test');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (loading) return <LoadingState />;

  if (dataSource === 'csv' && csvError) {
    return <ErrorState message={csvError} />;
  }

  if (samples.length === 0) {
    return (
      <EmptyState
        icon={Car}
        title="No trip data yet"
        message="Upload a CSV file with telemetry columns (time_s, a_long, a_lat, yaw_rate, speed) or start a Live Phone Sensor trip to see your driving scores."
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

  const handleSaveTrip = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tripTags.split(',').map((t) => t.trim()).filter(Boolean);
    saveCurrentTripToAccount(tripTitle, tripNotes, tags);
    setShowSaveModal(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Your five motor-skill scores, based on the current trip data"
      >
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowReportModal(true)}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF Report</span>
          </button>

          <button
            onClick={() => setShowSaveModal(true)}
            className="px-4 py-2 rounded-xl border border-violet-200 text-violet-700 hover:bg-violet-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer bg-white"
          >
            <BookmarkPlus className="w-4 h-4" />
            <span>Save Trip to Account</span>
          </button>

          {saveSuccess && (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 animate-fade-in">
              <Check className="w-4 h-4" /> Saved to Driver History!
            </span>
          )}
        </div>
      </PageHeader>

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
        Scores update instantly as you adjust the simulator sliders, upload CSV files, or record live trips.
      </div>

      {/* PDF Report Modal */}
      <TripReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        tripTitle={tripTitle}
        driverProfile={getStoredDriverProfile()}
        scoreResult={scoreResult}
        samples={samples}
      />

      {/* Save Trip Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Save Trip to Driver Account</h3>
            <p className="text-xs text-slate-500">
              Preserve this session in your longitudinal study log to track skill development over time.
            </p>

            <form onSubmit={handleSaveTrip} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Session Title</label>
                <input
                  type="text"
                  value={tripTitle}
                  onChange={(e) => setTripTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tripTags}
                  onChange={(e) => setTripTags(e.target.value)}
                  placeholder="e.g. Highway, Night, Heavy Traffic"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes / Route Context</label>
                <textarea
                  value={tripNotes}
                  onChange={(e) => setTripNotes(e.target.value)}
                  placeholder="e.g. Weather conditions, traffic density, vehicle behavior..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 cursor-pointer"
                >
                  Confirm & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
