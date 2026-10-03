import { useState, useMemo } from 'react';
import {
  FlaskConical, Info, BarChart3, GitCompare, AlertTriangle,
  ShieldCheck, RotateCcw, Table,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, Legend,
} from 'recharts';
import { useStore } from '@/store';
import { DEFAULT_SKILLS, ASSUMPTION_PROFILES } from '@/engine/defaults';
import { computeSensitivity, type SensitivityItem } from '@/engine/sensitivity';
import { runScoring } from '@/engine/scoring';
import { PageHeader, EmptyState, LoadingState, ErrorState, Card } from '@/components/ui';
import { SkillCard } from '@/components/SkillCard';
import type { SkillSpec, AssumptionRow } from '@/engine/types';

export function AssumptionsLabPage() {
  const {
    skills, samples, scoreResult, updateThreshold, resetThresholds,
    applyProfile, activeProfileId, dataSource, csvError, loading,
  } = useStore();

  const [compareLeft, setCompareLeft] = useState('beginner');
  const [compareRight, setCompareRight] = useState('strict');

  // Baseline scores (Standard profile) for before/after
  const baselineResult = useMemo(() => {
    if (samples.length === 0) return null;
    return runScoring(samples, DEFAULT_SKILLS);
  }, [samples]);

  // Sensitivity analysis
  const sensitivity: SensitivityItem[] = useMemo(() => {
    if (samples.length === 0) return [];
    return computeSensitivity(samples, skills);
  }, [samples, skills]);

  // Compare two profiles
  const compareData = useMemo(() => {
    if (samples.length === 0) return null;
    const leftProfile = ASSUMPTION_PROFILES.find((p) => p.id === compareLeft)!;
    const rightProfile = ASSUMPTION_PROFILES.find((p) => p.id === compareRight)!;

    const leftSkills = applyMultipliers(DEFAULT_SKILLS, leftProfile.multipliers);
    const rightSkills = applyMultipliers(DEFAULT_SKILLS, rightProfile.multipliers);

    const leftResult = runScoring(samples, leftSkills);
    const rightResult = runScoring(samples, rightSkills);

    return leftResult.skills.map((s, i) => ({
      skill: s.label,
      [leftProfile.label]: s.score,
      [rightProfile.label]: rightResult.skills[i].score,
    }));
  }, [samples, compareLeft, compareRight]);

  if (loading) return <LoadingState />;

  if (dataSource === 'csv' && csvError) {
    return <ErrorState message={csvError} />;
  }

  if (samples.length === 0) {
    return (
      <EmptyState
        icon={FlaskConical}
        title="No data to analyse"
        message="Generate a simulated trip or upload CSV data to explore how assumptions affect your scores."
      />
    );
  }

  if (!scoreResult) return <LoadingState />;

  // Build assumption table rows
  const assumptionRows: AssumptionRow[] = [];
  for (const skill of skills) {
    for (const f of skill.features) {
      assumptionRows.push({
        name: `${skill.label} — ${f.label} (good)`,
        value: `${f.goodThreshold} ${f.unit}`,
        source: f.source,
        reason: f.reason,
      });
      assumptionRows.push({
        name: `${skill.label} — ${f.label} (bad)`,
        value: `${f.badThreshold} ${f.unit}`,
        source: f.source,
        reason: f.reason,
      });
    }
  }

  // Fixed assumptions
  const fixedAssumptions = [
    'Phone is rigidly mounted and calibrated — sensor orientation is assumed correct.',
    'Vehicle type (car, truck, EV, ICE) is not modelled — all vehicles use the same thresholds.',
    'Road grade (hills) is ignored — uphill/downhill effects on acceleration are not separated.',
    'Weather conditions are ignored — wet roads or wind are not accounted for.',
    'Hard stops caused by outside events (traffic, pedestrians) are not distinguished from driver-initiated braking.',
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Assumptions Lab"
        subtitle="See exactly which assumptions drive each score — and change them to see the effect"
      />

      {/* Data quality */}
      <Card className="mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[--signal]/10 flex items-center justify-center shrink-0 border border-[--hairline]">
            <ShieldCheck className="w-6 h-6 text-[--signal]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold text-[--ink]">Data Quality</h3>
              <span
                className={`text-2xl font-bold mono ${
                  scoreResult.dataQuality.score >= 40 ? 'text-[--signal]' : 'text-[--caution]'
                }`}
              >
                {scoreResult.dataQuality.score}/100
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
              <div className="bg-[--base] border border-[--hairline] rounded-lg p-2 text-center">
                <p className="text-[--ink]/40 text-xs">Sample gaps</p>
                <p className="font-semibold text-[--ink] mono">{scoreResult.dataQuality.sampleGaps}%</p>
              </div>
              <div className="bg-[--base] border border-[--hairline] rounded-lg p-2 text-center">
                <p className="text-[--ink]/40 text-xs">Noise level</p>
                <p className="font-semibold text-[--ink] mono">{scoreResult.dataQuality.noiseLevel}</p>
              </div>
              <div className="bg-[--base] border border-[--hairline] rounded-lg p-2 text-center">
                <p className="text-[--ink]/40 text-xs">Flat/missing signals</p>
                <p className="font-semibold text-[--ink] mono">
                  {scoreResult.dataQuality.missingFlatSignals.length === 0
                    ? 'None'
                    : scoreResult.dataQuality.missingFlatSignals.length}
                </p>
              </div>
            </div>
            {scoreResult.dataQuality.reasons.length > 0 && (
              <ul className="mt-3 text-sm text-[--caution] space-y-1">
                {scoreResult.dataQuality.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      {scoreResult.dataQuality.score < 40 ? (
        <Card className="bg-[--caution]/10 border border-[--caution]/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-[--caution] shrink-0" />
            <div>
              <h3 className="font-semibold text-[--ink]">Not enough reliable data to score</h3>
              <p className="text-sm text-[--ink]/60 mt-1">
                The data quality is too low ({scoreResult.dataQuality.score}/100) to produce
                trustworthy scores. The issues above need to be resolved before scores are meaningful.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Profile selector */}
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Table className="w-5 h-5 text-[--signal]" />
                <h3 className="font-semibold text-[--ink]">Assumption profiles</h3>
              </div>
              <button
                onClick={resetThresholds}
                className="inline-flex items-center gap-1.5 text-sm text-[--signal] hover:text-[--signal]/80"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Standard
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ASSUMPTION_PROFILES.map((profile) => {
                const active = activeProfileId === profile.id;
                return (
                  <button
                    key={profile.id}
                    onClick={() => applyProfile(profile.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      active
                        ? 'border-[--signal] bg-[--signal]/10'
                        : 'border-[--hairline] hover:border-[--signal]/30'
                    }`}
                  >
                    <p className="font-semibold text-[--ink]">{profile.label}</p>
                    <p className="text-xs text-[--ink]/60 mt-1">{profile.description}</p>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Skill cards with before/after */}
          <h3 className="font-semibold text-[--ink] mb-3 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[--signal]" />
            Skill scores (with before/after vs Standard profile)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            {scoreResult.skills.map((skill) => {
              const baseline = baselineResult?.skills.find((s) => s.id === skill.id);
              return (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  previousScore={baseline?.score}
                />
              );
            })}
          </div>

          {/* Assumptions table */}
          <Card className="mb-6">
            <h3 className="font-semibold text-violet-950 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-violet-600" />
              All assumptions
            </h3>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-violet-100 text-left">
                    <th className="py-2 pr-4 font-medium text-violet-500">Assumption</th>
                    <th className="py-2 pr-4 font-medium text-violet-500">Current value</th>
                    <th className="py-2 pr-4 font-medium text-violet-500">Source</th>
                    <th className="py-2 font-medium text-violet-500">Plain-language reason</th>
                  </tr>
                </thead>
                <tbody>
                  {assumptionRows.map((row, i) => (
                    <tr key={i} className="border-b border-violet-50">
                      <td className="py-2 pr-4 text-violet-900">{row.name}</td>
                      <td className="py-2 pr-4 font-medium text-violet-700">{row.value}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs ${
                            row.source === 'User-set'
                              ? 'bg-blue-100 text-blue-700'
                              : row.source === 'Calibrated'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-violet-100 text-violet-600'
                          }`}
                        >
                          {row.source}
                        </span>
                      </td>
                      <td className="py-2 text-violet-600 text-xs">{row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Threshold sliders */}
          <Card className="mb-6">
            <h3 className="font-semibold text-violet-950 mb-1">Threshold sliders</h3>
            <p className="text-sm text-violet-500 mb-4">
              Drag any threshold to see scores update instantly. Changed values are tagged "User-set".
            </p>
            <div className="space-y-6">
              {skills.map((skill) => (
                <div key={skill.id}>
                  <h4 className="font-medium text-violet-800 mb-3">{skill.label}</h4>
                  <div className="space-y-4">
                    {skill.features.map((f) => (
                      <div key={f.key} className="bg-violet-50/50 rounded-xl p-3">
                        <p className="text-sm font-medium text-violet-700 mb-2">{f.label}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs text-green-600 font-medium">Good threshold</label>
                              <span className="text-xs text-violet-700 tabular-nums">
                                {f.goodThreshold.toFixed(2)} {f.unit}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={f.badThreshold * 1.5}
                              step={0.05}
                              value={f.goodThreshold}
                              onChange={(e) =>
                                updateThreshold(skill.id, f.key, 'good', parseFloat(e.target.value))
                              }
                              className="w-full accent-green-500 h-2 cursor-pointer"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs text-orange-600 font-medium">Bad threshold</label>
                              <span className="text-xs text-violet-700 tabular-nums">
                                {f.badThreshold.toFixed(2)} {f.unit}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={f.goodThreshold * 0.5}
                              max={f.badThreshold * 2}
                              step={0.05}
                              value={f.badThreshold}
                              onChange={(e) =>
                                updateThreshold(skill.id, f.key, 'bad', parseFloat(e.target.value))
                              }
                              className="w-full accent-orange-500 h-2 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Sensitivity chart */}
          <Card className="mb-6">
            <h3 className="font-semibold text-violet-950 mb-1">Sensitivity analysis</h3>
            <p className="text-sm text-violet-500 mb-4">
              For each threshold, the average score change when it's moved by ±20%. Sorted largest first.
            </p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sensitivity.slice(0, 12).map((s) => ({
                    name: `${s.skillLabel} — ${s.featureLabel} (${s.thresholdType})`,
                    change: s.avgScoreChange,
                  }))}
                  layout="vertical"
                  margin={{ top: 5, right: 20, bottom: 20, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" />
                  <XAxis
                    type="number"
                    label={{ value: 'Avg score change (points)', position: 'insideBottom', offset: -5, style: { fontSize: 12, fill: '#8b5cf6' } }}
                    tick={{ fontSize: 11, fill: '#a78bfa' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={200}
                    tick={{ fontSize: 10, fill: '#7c3aed' }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #ede9fe', fontSize: 12 }}
                    formatter={(v) => [`${v} pts`, 'Avg change']}
                  />
                  <Bar dataKey="change" radius={[0, 6, 6, 0]}>
                    {sensitivity.slice(0, 12).map((_, i) => (
                      <Cell key={i} fill={`hsl(${260 + i * 8}, 70%, ${65 - i * 1.5}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Compare two profiles */}
          <Card className="mb-6">
            <h3 className="font-semibold text-violet-950 mb-1 flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-violet-600" />
              Compare two profiles
            </h3>
            <p className="text-sm text-violet-500 mb-4">
              See how the same trip scores under different assumption profiles.
            </p>
            <div className="flex flex-wrap gap-4 mb-4">
              <div>
                <label className="text-xs text-violet-500 block mb-1">Left</label>
                <select
                  value={compareLeft}
                  onChange={(e) => setCompareLeft(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-violet-200 text-sm text-violet-800 bg-white"
                >
                  {ASSUMPTION_PROFILES.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-violet-500 block mb-1">Right</label>
                <select
                  value={compareRight}
                  onChange={(e) => setCompareRight(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-violet-200 text-sm text-violet-800 bg-white"
                >
                  {ASSUMPTION_PROFILES.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {compareData && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compareData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" />
                    <XAxis dataKey="skill" tick={{ fontSize: 11, fill: '#a78bfa' }} />
                    <YAxis
                      domain={[0, 100]}
                      label={{ value: 'Score', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#8b5cf6' } }}
                      tick={{ fontSize: 11, fill: '#a78bfa' }}
                    />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #ede9fe', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {(() => {
                      const leftLabel = ASSUMPTION_PROFILES.find((p) => p.id === compareLeft)!.label;
                      const rightLabel = ASSUMPTION_PROFILES.find((p) => p.id === compareRight)!.label;
                      return (
                        <>
                          <Bar dataKey={leftLabel} fill="#a78bfa" radius={[6, 6, 0, 0]} />
                          <Bar dataKey={rightLabel} fill="#7c3aed" radius={[6, 6, 0, 0]} />
                        </>
                      );
                    })()}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </>
      )}

          {/* Fixed assumptions */}
      <Card>
        <h3 className="font-semibold text-[--ink] mb-3">Fixed assumptions (not adjustable)</h3>
        <ul className="space-y-2">
          {fixedAssumptions.map((a, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[--ink]/60">
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-[--ink]/40" />
              {a}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function applyMultipliers(
  skills: SkillSpec[],
  multipliers: Record<string, number>,
): SkillSpec[] {
  return skills.map((s) => ({
    ...s,
    features: s.features.map((f) => ({
      ...f,
      goodThreshold: f.goodThreshold * (multipliers[s.id] ?? 1),
      badThreshold: f.badThreshold * (multipliers[s.id] ?? 1),
    })),
  }));
}
