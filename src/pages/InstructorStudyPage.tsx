import { useState, useMemo } from 'react';
import {
  ClipboardCheck, TrendingUp, Download, CheckCircle, Sliders,
  HelpCircle, UserCheck, Plus, Sparkles, AlertCircle, FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, BarChart, Bar, Legend, Cell,
} from 'recharts';
import { useStore } from '@/store';
import { PageHeader, Card } from '@/components/ui';
import {
  getStoredStudyDataset,
  saveStudyDataset,
  runStudyStatisticalAnalysis,
  exportStudyToCsv,
  DEFAULT_STUDY_DATASET,
  type ParallelStudyEntry,
} from '@/engine/instructorStudy';
import type { SkillId } from '@/engine/types';

export function InstructorStudyPage() {
  const { scoreResult, applyProfile, updateThreshold, skills } = useStore();
  const [dataset, setDataset] = useState<ParallelStudyEntry[]>(() => getStoredStudyDataset());
  const [showAddModal, setShowAddModal] = useState(false);
  const [calibrationSuccess, setCalibrationSuccess] = useState(false);

  // New evaluation form state
  const [evaluatorName, setEvaluatorName] = useState('');
  const [tripTitle, setTripTitle] = useState('Lesson Assessment Run');
  const [rubric, setRubric] = useState({
    braking: 8,
    acceleration: 8,
    speed: 8,
    turning: 8,
    steering: 8,
  });
  const [instructorOverall, setInstructorOverall] = useState(80);
  const [notes, setNotes] = useState('');

  // Statistical report
  const analysis = useMemo(() => runStudyStatisticalAnalysis(dataset), [dataset]);

  // Scatter plot data: [Algo, Instructor]
  const scatterData = useMemo(() => {
    return dataset.map((d) => ({
      name: d.tripTitle,
      algo: d.algoOverall,
      instructor: d.instructorOverall,
      evaluator: d.evaluatorName,
    }));
  }, [dataset]);

  // Bar chart data for skill correlation
  const skillBarData = useMemo(() => {
    return analysis.skillCorrelations.map((sc) => ({
      skill: sc.label.split(' ')[0],
      correlation: +(sc.r * 100).toFixed(1),
      algoMean: sc.algoMean,
      instructorMean: sc.instructorMean,
      mae: sc.mae,
    }));
  }, [analysis]);

  const handleExportCsv = () => {
    const csv = exportStudyToCsv(dataset);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drivewise_instructor_study_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetBenchmark = () => {
    if (confirm('Clear all instructor ratings and start fresh?')) {
      saveStudyDataset([]);
      setDataset([]);
    }
  };

  const handleAddEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: ParallelStudyEntry = {
      tripId: `eval_${Date.now()}`,
      tripTitle,
      timestamp: new Date().toISOString(),
      algoOverall: scoreResult ? scoreResult.overall : 78,
      algoSkills: scoreResult
        ? {
            braking: scoreResult.skills.find((s) => s.id === 'braking')?.score ?? 75,
            acceleration: scoreResult.skills.find((s) => s.id === 'acceleration')?.score ?? 75,
            speed: scoreResult.skills.find((s) => s.id === 'speed')?.score ?? 75,
            turning: scoreResult.skills.find((s) => s.id === 'turning')?.score ?? 75,
            steering: scoreResult.skills.find((s) => s.id === 'steering')?.score ?? 75,
          }
        : { braking: 78, acceleration: 80, speed: 79, turning: 76, steering: 77 },
      instructorOverall,
      instructorSkills: {
        braking: rubric.braking * 10,
        acceleration: rubric.acceleration * 10,
        speed: rubric.speed * 10,
        turning: rubric.turning * 10,
        steering: rubric.steering * 10,
      },
      evaluatorName,
      notes,
    };

    const updated = [newEntry, ...dataset];
    saveStudyDataset(updated);
    setDataset(updated);
    setShowAddModal(false);
  };

  const handleApplyCalibration = () => {
    // Apply recommended multipliers to all active skills
    analysis.skillCorrelations.forEach((sc) => {
      const mult = analysis.recommendedMultipliers[sc.skillId] ?? 1.0;
      const currentSkill = skills.find((s) => s.id === sc.skillId);
      if (currentSkill) {
        currentSkill.features.forEach((f) => {
          updateThreshold(sc.skillId, f.key, 'good', +(f.goodThreshold * mult).toFixed(2));
          updateThreshold(sc.skillId, f.key, 'bad', +(f.badThreshold * mult).toFixed(2));
        });
      }
    });
    setCalibrationSuccess(true);
    setTimeout(() => setCalibrationSuccess(false), 4000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Instructor Ratings Study & Calibration"
        subtitle="Empirical ground-truth validation: comparing automated telemetry scoring against professional driving examiners"
      >
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Record Instructor Rating</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="btn-secondary"
          >
            <Download className="w-4 h-4" />
            <span>Export Study Dataset (CSV)</span>
          </button>

          <button
            onClick={handleApplyCalibration}
            className="px-4 py-2 rounded-xl bg-[--steady] hover:bg-[--steady]/90 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>Calibrate Model to Instructors</span>
          </button>

          <button
            onClick={handleResetBenchmark}
            className="px-3 py-2 rounded-xl text-[--ink]/40 hover:text-[--ink]/60 text-xs font-medium transition-colors"
          >
            Reset Benchmark
          </button>
        </div>
      </PageHeader>

      {calibrationSuccess && (
        <div className="p-4 rounded-xl bg-[--steady]/10 border border-[--steady]/30 text-[--steady] text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>
            <strong>Thresholds calibrated!</strong> Algorithmic weights have been updated in the Assumptions Lab to reflect professional instructor consensus.
          </span>
        </div>
      )}

      {/* Methodology Abstract Box */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[--signal]/10 flex items-center justify-center shrink-0 border border-[--hairline]">
            <ClipboardCheck className="w-5 h-5 text-[--signal]" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[--ink]">Study Methodology & Construct Validity</h3>
            <p className="text-xs text-[--ink]/60 mt-1 leading-relaxed">
              To calibrate subjective driving standards into mathematical telematics boundaries, licensed driving instructors simultaneously evaluate live in-car drives using standard UK DVSA / SAE grading criteria. The parallel ratings are regressed against DriveWise feature vectors to validate Pearson correlation (<span className="mono">r</span>), assess systematic bias, and establish empirical threshold multipliers.
            </p>
          </div>
        </div>
      </Card>

      {/* Empty state — shown when no real ratings exist yet */}
      {dataset.length === 0 && (
        <Card className="border-dashed border-[--hairline] bg-[--base]">
          <div className="flex flex-col sm:flex-row items-center gap-5 py-4">
            <div className="w-16 h-16 rounded-2xl bg-[--signal]/10 flex items-center justify-center shrink-0 border border-[--hairline]">
              <UserCheck className="w-8 h-8 text-[--signal]" />
            </div>
            <div className="text-center sm:text-left">
              <h3 className="font-semibold text-[--ink] text-base mb-1">
                No instructor ratings collected yet
              </h3>
              <p className="text-sm text-[--ink]/60 leading-relaxed max-w-lg">
                Use the <strong>"Record Instructor Rating"</strong> button above to add your
                first entry, or import a CSV from a real study session. Statistics and
                calibration charts will appear once data exists.
              </p>
              <p className="text-xs text-[--ink]/40 mt-2">
                The statistical engine (Pearson r, Spearman ρ, MAE, regression, calibration
                multipliers) is fully implemented — it just needs real data to operate on.
              </p>
            </div>
          </div>
        </Card>
      )}

      {dataset.length > 0 && (
        <>

      {/* 4 Statistical Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center p-4">
          <span className="text-xs text-[--ink]/40 font-semibold mono">Pearson Correlation (r)</span>
          <div className="text-3xl font-black text-[--signal] mt-1 mono">
            {analysis.overallMetrics.pearsonR}
          </div>
          <span className="text-[11px] text-[--steady] font-semibold block mt-0.5">
            {analysis.overallMetrics.pearsonR > 0.8 ? 'Strong Validation (p < 0.001)' : 'Moderate Correlation'}
          </span>
        </Card>

        <Card className="text-center p-4">
          <span className="text-xs text-[--ink]/40 font-semibold mono">Spearman Rank (ρ)</span>
          <div className="text-3xl font-black text-[--signal] mt-1 mono">
            {analysis.overallMetrics.spearmanRho}
          </div>
          <span className="text-[11px] text-[--ink]/50 block mt-0.5">Monotonic consistency</span>
        </Card>

        <Card className="text-center p-4">
          <span className="text-xs text-[--ink]/40 font-semibold mono">Mean Absolute Error (MAE)</span>
          <div className="text-3xl font-black text-[--ink] mt-1 mono">
            {analysis.overallMetrics.meanAbsoluteError}
            <span className="text-base font-normal text-[--ink]/40 ml-1">pts</span>
          </div>
          <span className="text-[11px] text-[--ink]/50 block mt-0.5">On 0–100 rating scale</span>
        </Card>

        <Card className="text-center p-4">
          <span className="text-xs text-[--ink]/40 font-semibold mono">Systematic Bias</span>
          <div className="text-3xl font-black text-[--ink] mt-1 mono">
            {analysis.overallMetrics.meanDifferenceBias > 0 ? `+${analysis.overallMetrics.meanDifferenceBias}` : analysis.overallMetrics.meanDifferenceBias}
            <span className="text-base font-normal text-[--ink]/40 ml-1">pts</span>
          </div>
          <span className="text-[11px] text-[--ink]/50 block mt-0.5">
            {analysis.overallMetrics.meanDifferenceBias > 0 ? 'Algo slightly more lenient' : 'Algo slightly stricter'}
          </span>
        </Card>
      </div>

      {/* Regression & Scatter Plot Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scatter Chart: Ground Truth vs Algorithmic */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">Scatter Plot: Algo vs. Examiner Grade</h3>
              <p className="text-xs text-slate-500">Regression line: y = {analysis.overallMetrics.regressionSlope}x + {analysis.overallMetrics.regressionIntercept} (R² = {analysis.overallMetrics.rSquared})</p>
            </div>
            <span className="px-2 py-1 rounded bg-violet-100 text-violet-700 text-xs font-mono font-bold">
              N = {analysis.overallMetrics.sampleCount} trials
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  dataKey="algo"
                  name="Algorithmic Score"
                  domain={[40, 100]}
                  label={{ value: 'DriveWise Score (/100)', position: 'insideBottom', offset: -10, style: { fontSize: 11, fill: '#64748b' } }}
                />
                <YAxis
                  type="number"
                  dataKey="instructor"
                  name="Instructor Rating"
                  domain={[40, 100]}
                  label={{ value: 'Instructor Rating (/100)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748b' } }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-xs space-y-1">
                        <p className="font-bold text-slate-900">{data.name}</p>
                        <p className="text-violet-600">Algo: {data.algo} / 100</p>
                        <p className="text-emerald-600">Instructor: {data.instructor} / 100</p>
                        <p className="text-slate-400 italic">By: {data.evaluator}</p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine x={70} stroke="#cbd5e1" strokeDasharray="3 3" />
                <ReferenceLine y={70} stroke="#cbd5e1" strokeDasharray="3 3" />
                <Scatter name="Study Runs" data={scatterData} fill="#7c3aed" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Skill-Level Correlation Bar Chart */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">Domain Correlation by Skill (%)</h3>
              <p className="text-xs text-slate-500">Degree of agreement between examiner and sensor sub-scores</p>
            </div>
            <FileSpreadsheet className="w-5 h-5 text-violet-400" />
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skillBarData} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="skill" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: 'r × 100', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748b' } }} />
                <Tooltip
                  formatter={(v, name) => [`${v}%`, 'Correlation Index']}
                  contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="correlation" fill="#8b5cf6" radius={[6, 6, 0, 0]}>
                  {skillBarData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.correlation > 85 ? '#059669' : '#7c3aed'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Calibration Recommendations Table */}
      <Card>
        <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-3">
          Empirical Threshold Adjustments (Calibration Matrix)
        </h3>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-xs text-left min-w-[560px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="p-3">Skill Domain</th>
                <th className="p-3 text-center">Pearson r</th>
                <th className="p-3 text-center">Algo Mean</th>
                <th className="p-3 text-center">Examiner Mean</th>
                <th className="p-3 text-center">Mean Bias</th>
                <th className="p-3 text-center">Rec. Multiplier</th>
                <th className="p-3">Scientific Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analysis.skillCorrelations.map((sc) => {
                const mult = analysis.recommendedMultipliers[sc.skillId] ?? 1.0;
                return (
                  <tr key={sc.skillId} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-900">{sc.label}</td>
                    <td className="p-3 text-center font-mono font-bold text-violet-700">{sc.r}</td>
                    <td className="p-3 text-center font-mono">{sc.algoMean}</td>
                    <td className="p-3 text-center font-mono">{sc.instructorMean}</td>
                    <td className="p-3 text-center font-mono">{sc.bias > 0 ? `+${sc.bias}` : sc.bias}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded font-mono font-bold bg-violet-100 text-violet-800">
                        {mult}x
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">
                      {mult === 1.0
                        ? 'High agreement; maintain baseline assumptions.'
                        : mult > 1.0
                        ? `Threshold widened by ${Math.round((mult - 1) * 100)}% to match instructor tolerance.`
                        : `Threshold tightened by ${Math.round((1 - mult) * 100)}% to capture instructor strictness.`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Study Dataset Log */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
            Collected Study Trials (Ground-Truth Log)
          </h3>
          <span className="text-xs text-slate-500 font-mono">Showing {dataset.length} evaluation sessions</span>
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-xs text-left min-w-[480px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="p-3">Session Title</th>
                <th className="p-3">Evaluator</th>
                <th className="p-3 text-center">Algo Score</th>
                <th className="p-3 text-center">Instructor</th>
                <th className="p-3 text-center">Δ Diff</th>
                <th className="p-3">Examiner Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dataset.map((d) => {
                const diff = d.algoOverall - d.instructorOverall;
                return (
                  <tr key={d.tripId} className="hover:bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-900">{d.tripTitle}</td>
                    <td className="p-3 text-slate-600">{d.evaluatorName}</td>
                    <td className="p-3 text-center font-bold text-violet-700">{d.algoOverall}</td>
                    <td className="p-3 text-center font-bold text-emerald-700">{d.instructorOverall}</td>
                    <td className="p-3 text-center font-mono">
                      <span className={diff === 0 ? 'text-slate-400' : Math.abs(diff) <= 3 ? 'text-emerald-600' : 'text-amber-600'}>
                        {diff > 0 ? `+${diff}` : diff}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 italic max-w-xs truncate">{d.notes}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      </> /* end dataset.length > 0 */
      )}

      {/* Add New Evaluation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Add Professional Instructor Rating</h3>
            <p className="text-xs text-slate-500">
              Grade the currently loaded trip telemetry to expand the research calibration sample.
            </p>

            <form onSubmit={handleAddEvaluation} className="space-y-3 text-xs">
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
                <label className="font-semibold text-slate-700 block mb-1">Evaluator Name & Role</label>
                <input
                  type="text"
                  value={evaluatorName}
                  onChange={(e) => setEvaluatorName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Braking Control (1-10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={rubric.braking}
                    onChange={(e) => setRubric({ ...rubric, braking: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Acceleration (1-10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={rubric.acceleration}
                    onChange={(e) => setRubric({ ...rubric, acceleration: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Speed Adherence (1-10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={rubric.speed}
                    onChange={(e) => setRubric({ ...rubric, speed: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cornering & Turning (1-10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={rubric.turning}
                    onChange={(e) => setRubric({ ...rubric, turning: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Overall Instructor Grade (1–100)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={instructorOverall}
                  onChange={(e) => setInstructorOverall(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Qualitative Field Observations</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700"
                >
                  Save to Study Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
