import { useState } from 'react';
import { Target, TrendingUp, AlertTriangle, Car, FileText, BookmarkPlus, Check } from 'lucide-react';
import { useStore } from '@/store';
import { SkillCard } from '@/components/SkillCard';
import { PageHeader, EmptyState, LoadingState, ErrorState, Card, GaugeCell } from '@/components/ui';
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
      <div className="animate-fade-in">
        <PageHeader title="Dashboard" subtitle="Your driving skill overview" />
        <Card className="border-[--caution] bg-[--caution]/5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded bg-[--caution]/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-[--caution]" />
            </div>
            <div>
              <h3 className="font-semibold text-[--ink] text-base mb-2">
                Not enough reliable data to score
              </h3>
              <p className="text-sm text-[--ink]/70 mb-3 leading-relaxed">
                The data quality score is <span className="mono font-bold">{scoreResult.dataQuality.score}/100</span>. Here's why:
              </p>
              <ul className="list-disc list-inside text-sm text-[--ink]/70 space-y-1">
                {scoreResult.dataQuality.reasons.length > 0 ? (
                  scoreResult.dataQuality.reasons.map((r, i) => <li key={i}>{r}</li>)
                ) : (
                  <li>Multiple data quality issues detected.</li>
                )}
              </ul>
              <p className="text-sm text-[--ink]/70 mt-3">
                Try uploading a file with more complete data, or switch to Simulator mode to explore the app.
              </p>
            </div>
          </div>
        </Card>
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

  // Map skill scores to status
  const getStatus = (score: number): 'steady' | 'caution' | 'signal' => {
    if (score >= 70) return 'steady';
    if (score >= 50) return 'caution';
    return 'signal';
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Five motor-skill readouts from the current trip telemetry"
      >
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowReportModal(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <FileText className="w-4 h-4" />
            Export PDF Report
          </button>

          <button
            onClick={() => setShowSaveModal(true)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <BookmarkPlus className="w-4 h-4" />
            Save Trip to Account
          </button>

          {saveSuccess && (
            <span className="text-sm text-[--steady] font-medium flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4" /> Saved to Driver History
            </span>
          )}
        </div>
      </PageHeader>

      {/* Gauge cluster — five skills in horizontal strip */}
      <div className="gauge-cluster">
        {skills.map((skill) => (
          <GaugeCell
            key={skill.id}
            label={skill.label}
            value={skill.score}
            status={getStatus(skill.score)}
          />
        ))}
      </div>

      {/* Overall score — larger central readout */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[--ink]/50 font-medium mb-1">Overall smoothness</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold mono text-[--ink]">{overall}</span>
              <span className="text-xl mono text-[--ink]/40">/ 100</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-[--ink]/50 font-medium mb-1">Data quality</p>
            <div className="flex items-baseline gap-2 justify-end">
              <span className="text-3xl font-bold mono text-[--ink]">{scoreResult.dataQuality.score}</span>
              <span className="text-base mono text-[--ink]/40">/ 100</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-[--ink]/50 font-medium mb-1">Sample count</p>
            <span className="text-2xl font-bold mono text-[--ink]">{samples.length.toLocaleString()}</span>
          </div>
        </div>
      </Card>

      {/* Next Focus */}
      {nextFocus && (
        <Card className="border-[--signal]/20 bg-[--signal]/5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded bg-[--signal]/10 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-[--signal]" />
            </div>
            <div>
              <p className="text-xs text-[--ink]/50 font-medium mb-1">Your next focus</p>
              <h3 className="text-lg font-semibold text-[--ink]">
                {nextFocus.label} — score <span className="mono">{nextFocus.score}</span>
              </h3>
              <p className="text-sm text-[--ink]/70 mt-1.5">
                Practice drill: {nextFocus.drill}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Supportive note */}
      <div className="flex items-center gap-2 text-sm text-[--ink]/50">
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
        <div className="fixed inset-0 z-50 bg-[--ink]/20 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="panel p-6 max-w-lg w-full shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="font-semibold text-lg text-[--ink]">Save Trip to Driver Account</h3>
              <p className="text-xs text-[--ink]/60 mt-1">
                Preserve this session in your longitudinal study log to track skill development over time.
              </p>
            </div>

            <form onSubmit={handleSaveTrip} className="space-y-4 text-sm">
              <div>
                <label className="font-medium text-[--ink] block mb-1.5">Session Title</label>
                <input
                  type="text"
                  value={tripTitle}
                  onChange={(e) => setTripTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-[--hairline] rounded focus:outline-none focus:ring-2 focus:ring-[--signal] bg-white"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-[--ink] block mb-1.5">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tripTags}
                  onChange={(e) => setTripTags(e.target.value)}
                  placeholder="e.g. Highway, Night, Heavy Traffic"
                  className="w-full px-3 py-2 border border-[--hairline] rounded focus:outline-none focus:ring-2 focus:ring-[--signal] bg-white"
                />
              </div>

              <div>
                <label className="font-medium text-[--ink] block mb-1.5">Notes / Route Context</label>
                <textarea
                  value={tripNotes}
                  onChange={(e) => setTripNotes(e.target.value)}
                  placeholder="e.g. Weather conditions, traffic density, vehicle behavior..."
                  rows={3}
                  className="w-full px-3 py-2 border border-[--hairline] rounded focus:outline-none focus:ring-2 focus:ring-[--signal] bg-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
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
