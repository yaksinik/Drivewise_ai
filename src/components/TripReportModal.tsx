import { useRef } from 'react';
import { X, Printer, Download, CheckCircle2, AlertTriangle, ShieldCheck, Car, Calendar, User, FileText } from 'lucide-react';
import type { ScoreResult, TelemetrySample } from '@/engine/types';
import type { DriverProfile } from '@/services/accountStorage';
import type { InstructorEvaluation } from '@/engine/instructorStudy';

interface TripReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripTitle?: string;
  driverProfile: DriverProfile;
  scoreResult: ScoreResult;
  samples: TelemetrySample[];
  instructorEvaluation?: InstructorEvaluation | null;
}

export function TripReportModal({
  isOpen,
  onClose,
  tripTitle = 'Current Driving Session',
  driverProfile,
  scoreResult,
  samples,
  instructorEvaluation,
}: TripReportModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const reportData = {
      reportType: 'DriveWise_AI_Telematics_Evaluation',
      generatedAt: new Date().toISOString(),
      driver: driverProfile,
      sessionTitle: tripTitle,
      durationSeconds: samples.length > 0 ? samples[samples.length - 1].time_s : 0,
      sampleCount: samples.length,
      scores: scoreResult,
      instructorStudyEvaluation: instructorEvaluation || null,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drivewise_report_${driverProfile.id}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const durationSec = samples.length > 0 ? Math.round(samples[samples.length - 1].time_s) : 0;
  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Modal Container */}
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Toolbar (hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-violet-100 bg-violet-50/50 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-violet-600" />
            <h2 className="font-bold text-violet-950">Driving Evaluation & Skill Analysis Report</h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadJson}
              className="px-3 py-1.5 rounded-xl border border-violet-200 text-xs font-semibold text-violet-700 hover:bg-violet-100 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-violet-400 hover:text-violet-700 hover:bg-violet-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div ref={printRef} className="p-8 overflow-y-auto print:p-0 print:overflow-visible text-slate-800 space-y-6">
          {/* Document Header */}
          <div className="flex items-start justify-between border-b-2 border-violet-600 pb-5">
            <div>
              <div className="flex items-center gap-2 text-violet-700 font-black tracking-wide text-xl uppercase">
                <Car className="w-6 h-6 text-violet-600" />
                <span>DriveWise AI Telematics</span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Driver Behavior Quantification & Research Calibration Study
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase bg-violet-100 text-violet-800">
                Official Telemetry Report
              </span>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Date: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 uppercase font-semibold block">Driver Name</span>
              <span className="font-bold text-slate-900 text-sm">{driverProfile.name}</span>
              <span className="text-slate-500 block">{driverProfile.learnerStage}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-semibold block">Session Title</span>
              <span className="font-bold text-slate-900 text-sm">{tripTitle}</span>
              <span className="text-slate-500 block">{mins}m {secs}s duration ({samples.length} samples)</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-semibold block">Vehicle / Mount</span>
              <span className="font-bold text-slate-900">{driverProfile.vehicleModel}</span>
              <span className="text-slate-500 block">{driverProfile.transmission}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-semibold block">Study Cohort</span>
              <span className="font-bold text-violet-700">{driverProfile.studyCohort}</span>
              <span className="text-slate-500 block">ID: {driverProfile.id}</span>
            </div>
          </div>

          {/* Primary Scores Summary Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 text-white shadow-md flex items-center justify-between">
              <div>
                <span className="text-xs text-violet-200 uppercase tracking-wider font-semibold">Overall Smoothness Index</span>
                <div className="text-4xl font-extrabold mt-1">{scoreResult.overall} <span className="text-xl text-violet-300">/ 100</span></div>
                <span className="text-xs text-violet-200 mt-1 block">
                  {scoreResult.overall >= 80 ? 'Proficient & Safe' : scoreResult.overall >= 65 ? 'Developing Control' : 'Harsh Inputs Observed'}
                </span>
              </div>
              <ShieldCheck className="w-12 h-12 text-violet-300/40" />
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Data Quality Index</span>
                <div className="text-3xl font-bold text-slate-900 mt-1">{scoreResult.dataQuality.score} <span className="text-base text-slate-400">/ 100</span></div>
              </div>
              <p className="text-xs text-slate-500">
                {scoreResult.dataQuality.reasons.length === 0 ? 'Verified sensor continuity at 10 Hz' : scoreResult.dataQuality.reasons[0]}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-violet-50 border border-violet-200 flex flex-col justify-between">
              <div>
                <span className="text-xs text-violet-600 uppercase tracking-wider font-semibold">Priority Focus Drill</span>
                <div className="font-bold text-violet-950 text-sm mt-1">{scoreResult.nextFocus?.drill || 'Maintain consistent performance'}</div>
              </div>
              <span className="text-xs text-violet-500">Skill: {scoreResult.nextFocus?.label} (Score: {scoreResult.nextFocus?.score})</span>
            </div>
          </div>

          {/* Parallel Instructor Study Evaluation (if present) */}
          {instructorEvaluation && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Certified Instructor Parallel Validation
                </span>
                <span className="font-bold text-emerald-800">
                  Grade: {instructorEvaluation.overallGrade} / 100 ({instructorEvaluation.passed ? 'PASSED' : 'NEEDS PRACTICE'})
                </span>
              </div>
              <p className="text-emerald-950 font-medium">
                Examiner: {instructorEvaluation.evaluatorName} ({instructorEvaluation.evaluatorRole})
              </p>
              <p className="text-emerald-800 italic mt-1">"{instructorEvaluation.qualitativeNotes}"</p>
            </div>
          )}

          {/* 5-Skill Competency Breakdown Table */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
              Motor Skill Competencies & Telemetric Audit
            </h3>
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-4">Skill Domain</th>
                    <th className="py-2.5 px-4 text-center">Score</th>
                    <th className="py-2.5 px-4">Assessed Feature</th>
                    <th className="py-2.5 px-4 text-right">Measured</th>
                    <th className="py-2.5 px-4 text-right">Good Benchmark</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scoreResult.skills.map((s) => {
                    const feat = s.features[0];
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-bold text-slate-900">{s.label}</td>
                        <td className="py-2.5 px-4 text-center font-bold text-violet-700">{s.score}</td>
                        <td className="py-2.5 px-4 text-slate-600">{feat?.spec.label || 'Feature summary'}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-800">
                          {feat ? `${feat.value.toFixed(2)} ${feat.spec.unit}` : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                          {feat ? `≤ ${feat.spec.goodThreshold} ${feat.spec.unit}` : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.status === 'Consistent'
                                ? 'bg-emerald-100 text-emerald-800'
                                : s.status === 'Developing'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Academic Methodology & Examiner Sign-off */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-500">
            <div>
              <p className="font-semibold text-slate-700">Digital Signal Processing & Scoring Protocol:</p>
              <p className="mt-1 leading-relaxed">
                Raw 3-axis accelerometer and gyro feeds filtered via dual-pass 3 Hz Butterworth low-pass filter. Jerk values computed as first time derivative. Scores evaluated on linear calibration boundaries derived from parallel certified driving instructor calibration studies.
              </p>
            </div>

            <div className="flex flex-col justify-end">
              <div className="border-t border-slate-300 pt-2 flex justify-between text-slate-600">
                <span>Principal Researcher / Instructor Signature</span>
                <span className="font-mono">Date</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
