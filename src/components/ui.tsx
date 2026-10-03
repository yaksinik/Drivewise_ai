import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

/* ── PageHeader ─────────────────────────────────────────────────────────── */
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-[--ink] tracking-tight">{title}</h1>
      {subtitle && (
        <p className="text-sm text-[--ink]/60 mt-1.5 leading-relaxed max-w-3xl">{subtitle}</p>
      )}
      {children}
    </div>
  );
}

/* ── Card (instrument panel) ────────────────────────────────────────────── */
export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`panel p-5 ${className}`}>
      {children}
    </div>
  );
}

/* ── GaugeCell (for dashboard cluster) ──────────────────────────────────── */
export function GaugeCell({
  label,
  value,
  status,
  unit,
}: {
  label: string;
  value: number;
  status: 'steady' | 'caution' | 'signal';
  unit?: string;
}) {
  const statusClass = {
    steady: 'text-[--steady]',
    caution: 'text-[--caution]',
    signal: 'text-[--signal]',
  }[status];

  const statusDot = {
    steady: 'status-steady',
    caution: 'status-caution',
    signal: 'status-signal',
  }[status];

  return (
    <div className="gauge-cell">
      <p className="text-[10px] text-[--ink]/50 font-medium mb-2">{label}</p>
      <div className={`text-3xl font-bold mono ${statusClass}`}>
        {value}
        {unit && <span className="text-base ml-1 font-normal">{unit}</span>}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <span className={`status-dot ${statusDot}`} />
        <span className="text-[10px] text-[--ink]/50 font-medium capitalize">{status}</span>
      </div>
    </div>
  );
}

/* ── RadialGauge (SVG circular gauge) ───────────────────────────────────── */
export function RadialGauge({ value, max = 100, size = 80 }: { value: number; max?: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="radial-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--hairline)"
          strokeWidth="6"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progress >= 0.7 ? 'var(--steady)' : progress >= 0.5 ? 'var(--caution)' : 'var(--signal)'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold mono text-[--ink]">{value}</span>
      </div>
    </div>
  );
}

/* ── EmptyState ─────────────────────────────────────────────────────────── */
export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel p-12 text-center animate-fade-in">
      <div className="w-12 h-12 rounded bg-[--base] flex items-center justify-center mx-auto mb-4 border border-[--hairline]">
        <Icon className="w-6 h-6 text-[--ink]/40" />
      </div>
      <h3 className="font-semibold text-[--ink] text-base mb-2">{title}</h3>
      <p className="text-sm text-[--ink]/60 max-w-md mx-auto leading-relaxed">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ── LoadingState ───────────────────────────────────────────────────────── */
export function LoadingState({ message = 'Analysing telemetry…' }: { message?: string }) {
  return (
    <div className="panel p-12 text-center animate-fade-in">
      <div className="inline-flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[--hairline] border-t-[--signal] rounded-full animate-spin" />
        <span className="text-sm text-[--ink]/60">{message}</span>
      </div>
    </div>
  );
}

/* ── SkeletonCard ───────────────────────────────────────────────────────── */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="panel p-5 space-y-3 animate-fade-in">
      <div className="skeleton h-4 w-2/5" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton h-3 ${i === lines - 1 ? 'w-3/5' : 'w-full'}`} />
      ))}
    </div>
  );
}

/* ── ErrorState ─────────────────────────────────────────────────────────── */
export function ErrorState({ message }: { message: string }) {
  return (
    <div className="panel p-5 flex items-start gap-3 border-[--caution] bg-[--caution]/5 animate-fade-in">
      <div className="w-8 h-8 rounded bg-[--caution]/10 flex items-center justify-center shrink-0">
        <AlertTriangle className="w-4 h-4 text-[--caution]" />
      </div>
      <div>
        <h3 className="font-semibold text-[--ink] text-sm mb-1">Attention required</h3>
        <p className="text-sm text-[--ink]/70 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

/* ── StatusBadge (instrument-style indicator) ───────────────────────────── */
export function StatusBadge({
  status,
  label,
}: {
  status: 'steady' | 'caution' | 'signal';
  label: string;
}) {
  const dotClass = {
    steady: 'status-steady',
    caution: 'status-caution',
    signal: 'status-signal',
  }[status];

  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[--base] border border-[--hairline]">
      <span className={`status-dot ${dotClass}`} />
      <span className="text-xs text-[--ink]/70 font-medium">{label}</span>
    </div>
  );
}
