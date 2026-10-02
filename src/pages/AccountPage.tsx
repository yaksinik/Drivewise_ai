import { useState, useMemo } from 'react';
import {
  User, Car, Award, Calendar, TrendingUp, History, Download,
  Trash2, PlayCircle, FileText, CheckCircle2, ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
} from 'recharts';
import { useStore } from '@/store';
import { PageHeader, Card } from '@/components/ui';
import {
  getStoredDriverProfile,
  saveDriverProfile,
  getStoredTrips,
  deleteStoredTrip,
  exportAllUserData,
  type DriverProfile,
  type SavedTripRecord,
} from '@/services/accountStorage';
import { TripReportModal } from '@/components/TripReportModal';

export function AccountPage() {
  const { scoreResult, samples } = useStore();
  const [profile, setProfile] = useState<DriverProfile>(() => getStoredDriverProfile());
  const [trips, setTrips] = useState<SavedTripRecord[]>(() => getStoredTrips());
  const [editingProfile, setEditingProfile] = useState(false);
  const [reportModalTrip, setReportModalTrip] = useState<SavedTripRecord | null>(null);

  // Edit form state
  const [formName, setFormName] = useState(profile.name);
  const [formStage, setFormStage] = useState(profile.learnerStage);
  const [formVehicle, setFormVehicle] = useState(profile.vehicleModel);
  const [formTransmission, setFormTransmission] = useState(profile.transmission);
  const [formCohort, setFormCohort] = useState(profile.studyCohort);
  const [formGoal, setFormGoal] = useState(profile.targetGoal);

  // Progression chart data
  const progressionData = useMemo(() => {
    // Reverse so chronological order left to right
    return [...trips].reverse().map((t, index) => {
      const brakingSkill = t.skills.find((s) => s.id === 'braking');
      const accelSkill = t.skills.find((s) => s.id === 'acceleration');
      const speedSkill = t.skills.find((s) => s.id === 'speed');
      const turnSkill = t.skills.find((s) => s.id === 'turning');
      const steerSkill = t.skills.find((s) => s.id === 'steering');

      return {
        session: `S${index + 1}`,
        title: t.title,
        date: new Date(t.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        overall: t.overallScore,
        braking: brakingSkill?.score ?? 70,
        accel: accelSkill?.score ?? 70,
        speed: speedSkill?.score ?? 70,
        turning: turnSkill?.score ?? 70,
        steering: steerSkill?.score ?? 70,
      };
    });
  }, [trips]);

  const avgScore = useMemo(() => {
    if (trips.length === 0) return 0;
    return Math.round(trips.reduce((acc, t) => acc + t.overallScore, 0) / trips.length);
  }, [trips]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: DriverProfile = {
      ...profile,
      name: formName,
      learnerStage: formStage as any,
      vehicleModel: formVehicle,
      transmission: formTransmission as any,
      studyCohort: formCohort as any,
      targetGoal: formGoal,
    };
    saveDriverProfile(updated);
    setProfile(updated);
    setEditingProfile(false);
  };

  const handleDeleteTrip = (id: string) => {
    if (confirm('Delete this recorded trip?')) {
      const remaining = deleteStoredTrip(id);
      setTrips(remaining);
    }
  };

  const handleExportData = () => {
    const json = exportAllUserData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drivewise_driver_${profile.id}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Driver Account & Longitudinal History"
        subtitle="Track telemetric skill progression over time, review past driving trials, and export session reports"
      >
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => setEditingProfile(true)}
            className="px-3.5 py-1.5 rounded-xl border border-violet-200 text-xs font-semibold text-violet-700 hover:bg-violet-50 transition-colors bg-white cursor-pointer"
          >
            Edit Driver Profile
          </button>

          <button
            onClick={handleExportData}
            className="px-3.5 py-1.5 rounded-xl border border-violet-200 text-xs font-semibold text-violet-700 hover:bg-violet-50 flex items-center gap-1.5 transition-colors bg-white cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Longitudinal JSON</span>
          </button>
        </div>
      </PageHeader>

      {/* Driver Profile Card */}
      <Card className="bg-gradient-to-r from-violet-900 to-indigo-950 text-white border-violet-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
              <User className="w-8 h-8 text-violet-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white">{profile.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/30 text-violet-200 border border-violet-400/30">
                  {profile.learnerStage}
                </span>
              </div>
              <p className="text-xs text-violet-300 mt-1">
                Vehicle: {profile.vehicleModel} ({profile.transmission}) • Cohort: {profile.studyCohort}
              </p>
              <p className="text-xs text-violet-200/80 mt-1 italic">
                Focus Goal: "{profile.targetGoal}"
              </p>
            </div>
          </div>

          {/* Quick Lifetime Stats */}
          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
            <div>
              <span className="text-xs text-violet-300 block">Trips Completed</span>
              <span className="text-2xl font-black text-white">{trips.length}</span>
            </div>
            <div>
              <span className="text-xs text-violet-300 block">Lifetime Avg</span>
              <span className="text-2xl font-black text-white">{avgScore} <span className="text-xs font-normal text-violet-400">/ 100</span></span>
            </div>
            <div>
              <span className="text-xs text-violet-300 block">Status</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Active Study
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Longitudinal Skill Progression Chart */}
      {trips.length === 0 ? (
        <Card className="border-orange-200 bg-orange-50">
          <div className="flex items-start gap-3">
            <History className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-900">No trips saved yet</h3>
              <p className="text-sm text-orange-700 mt-1">
                Record a trip using <strong>Simulator</strong>, <strong>CSV Upload</strong>, or{' '}
                <strong>Live Trip</strong>, then use the <strong>"Save Trip to Account"</strong>{' '}
                button on the Dashboard to log it here. The longitudinal progression chart and
                session history will appear once at least one trip is saved.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                  Longitudinal Motor Skill Progression
                </h3>
                <p className="text-xs text-slate-500">
                  Score evolution across consecutive driving sessions demonstrating habit formation and learning curve
                </p>
              </div>
              <TrendingUp className="w-5 h-5 text-violet-500" />
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressionData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="session" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[50, 100]} tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: 'Score (/100)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748b' } }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                    formatter={(val, name) => [`${val} / 100`, name]}
                    labelFormatter={(label, p) => p?.[0]?.payload?.title || label}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="overall" name="Overall Smoothness" stroke="#7c3aed" strokeWidth={3} dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="braking" name="Braking" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="accel" name="Acceleration" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="speed" name="Speed Consistency" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Saved Driving Trips History Table */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                Driving Sessions Log
              </h3>
              <span className="text-xs text-slate-400 font-mono">{trips.length} sessions logged</span>
            </div>

            <div className="space-y-3">
              {trips.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-violet-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Car className="w-5 h-5 text-violet-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-sm">{t.title}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-violet-100 text-violet-800">
                          {t.dataSource}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(t.timestamp).toLocaleString()} • {Math.round(t.durationSeconds / 60)} min ({t.sampleCount} pts)
                      </p>
                      {t.notes && <p className="text-xs text-slate-600 mt-1 italic">"{t.notes}"</p>}
                    </div>
                  </div>

                  {/* Score Pills & Actions */}
                  <div className="flex items-center gap-4 self-end md:self-center">
                    <div className="text-right">
                      <div className="text-xl font-black text-violet-700">{t.overallScore} <span className="text-xs font-normal text-slate-400">/ 100</span></div>
                      <span className="text-[10px] text-slate-400 block">Quality {t.dataQualityScore}%</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setReportModalTrip(t)}
                        className="p-2 rounded-xl border border-violet-200 text-violet-700 hover:bg-violet-100 transition-colors cursor-pointer"
                        title="Generate PDF Report"
                      >
                        <FileText className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteTrip(t.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Edit Profile Modal */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Edit Research Participant Profile</h3>
            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Driver Name / Participant ID</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Experience Level</label>
                <select
                  value={formStage}
                  onChange={(e) => setFormStage(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="Learner (L-Plates)">Learner (L-Plates)</option>
                  <option value="Novice (P-Plates / < 2 yrs)">Novice (P-Plates / &lt; 2 yrs)</option>
                  <option value="Experienced Driver">Experienced Driver</option>
                  <option value="Professional / Fleet">Professional / Fleet</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Vehicle Model</label>
                <input
                  type="text"
                  value={formVehicle}
                  onChange={(e) => setFormVehicle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Transmission</label>
                <select
                  value={formTransmission}
                  onChange={(e) => setFormTransmission(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="Automatic">Automatic</option>
                  <option value="Manual">Manual</option>
                  <option value="EV / One-Pedal">EV / One-Pedal</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Study Cohort</label>
                <select
                  value={formCohort}
                  onChange={(e) => setFormCohort(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="Intervention Group (App Feedback)">Intervention Group (App Feedback)</option>
                  <option value="Control Group (Standard Training)">Control Group (Standard Training)</option>
                  <option value="Instructor Parallel Cohort">Instructor Parallel Cohort</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Skill Goal</label>
                <input
                  type="text"
                  value={formGoal}
                  onChange={(e) => setFormGoal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Report Modal for Past Trip */}
      {reportModalTrip && (
        <TripReportModal
          isOpen={Boolean(reportModalTrip)}
          onClose={() => setReportModalTrip(null)}
          tripTitle={reportModalTrip.title}
          driverProfile={profile}
          scoreResult={
            reportModalTrip.scoreResult || {
              overall: reportModalTrip.overallScore,
              skills: reportModalTrip.skills.map((s) => ({
                id: s.id as any,
                label: s.label,
                icon: 'Gauge',
                drill: 'Standard practice',
                score: s.score,
                status: s.status as any,
                features: [],
              })),
              nextFocus: null,
              dataQuality: {
                score: reportModalTrip.dataQualityScore,
                sampleGaps: 0,
                noiseLevel: 0,
                missingFlatSignals: [],
                reasons: [],
              },
            }
          }
          samples={reportModalTrip.samples}
          instructorEvaluation={reportModalTrip.instructorEvaluation}
        />
      )}
    </div>
  );
}
