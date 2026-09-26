import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-violet-950">{title}</h1>
      {subtitle && <p className="text-sm text-violet-500 mt-1">{subtitle}</p>}
      {children}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-violet-100 p-5 ${className}`}>
      {children}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message }: { icon: React.ComponentType<{ className?: string }>; title: string; message: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-violet-100 p-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-violet-400" />
      </div>
      <h3 className="font-semibold text-violet-950 mb-1">{title}</h3>
      <p className="text-sm text-violet-500 max-w-md mx-auto">{message}</p>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-violet-100 p-12 text-center">
      <div className="inline-flex items-center gap-3 text-violet-600">
        <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        <span className="text-sm font-medium">Analysing telemetry…</span>
      </div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center">
      <h3 className="font-semibold text-orange-800 mb-1">Something needs attention</h3>
      <p className="text-sm text-orange-700">{message}</p>
    </div>
  );
}
