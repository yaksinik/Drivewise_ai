import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard, LineChart, FlaskConical, Cpu, Map, Car, Database,
  Activity, ClipboardCheck, UserCheck, X, Menu, type LucideIcon,
} from 'lucide-react';
import { useStore } from '@/store';
import { DataSourceControls } from './DataSourceControls';

export type PageId =
  | 'dashboard'
  | 'trip'
  | 'history'
  | 'instructor'
  | 'assumptions'
  | 'dataset'
  | 'models'
  | 'roadmap';

interface NavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',   label: 'Dashboard',        icon: LayoutDashboard },
  { id: 'trip',        label: 'Trip Analysis',     icon: LineChart },
  { id: 'history',     label: 'Driver Account',    icon: UserCheck },
  { id: 'instructor',  label: 'Instructor Study',  icon: ClipboardCheck },
  { id: 'assumptions', label: 'Assumptions Lab',   icon: FlaskConical },
  { id: 'dataset',     label: 'Dataset Explorer',  icon: Database },
  { id: 'models',      label: 'Models & Methods',  icon: Cpu },
  { id: 'roadmap',     label: 'Roadmap',            icon: Map },
];

const SOURCE_STATUS: Record<string, { label: string; dotClass: string }> = {
  dataset:   { label: 'Real data',       dotClass: 'status-steady' },
  live:      { label: 'Live recorded data', dotClass: 'status-caution' },
  simulator: { label: 'Simulated data',  dotClass: 'status-signal' },
  csv:       { label: 'Uploaded data',   dotClass: 'status-signal' },
};

interface LayoutProps {
  currentPage: PageId;
  onPageChange: (page: PageId) => void;
  children: ReactNode;
}

export function Layout({ currentPage, onPageChange, children }: LayoutProps) {
  const { dataSource } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sourceKey = currentPage === 'dataset' ? 'dataset' : dataSource;
  const source = SOURCE_STATUS[sourceKey] ?? SOURCE_STATUS.simulator;

  return (
    <div className="min-h-screen bg-[--base]">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[--hairline]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded bg-[--ink] flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight">
              <span className="font-semibold text-[--ink] text-base tracking-tight">DriveWise AI</span>
              <span className="block text-[10px] text-[--ink]/50 tracking-wide">Research Platform</span>
            </div>
          </div>

          {/* Data source status indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded bg-[--base] border border-[--hairline]">
            <span className={`status-dot ${source.dotClass}`} />
            <span className="text-xs text-[--ink]/70 font-medium">{source.label}</span>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded hover:bg-[--base] text-[--ink] transition-colors"
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* ── Mobile overlay ────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[--ink]/10 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-6 flex gap-6">
        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <aside
          className={`
            fixed lg:static top-14 left-0 z-40 h-[calc(100vh-3.5rem)] lg:h-auto
            w-64 lg:w-64 shrink-0
            overflow-y-auto lg:overflow-visible
            bg-white lg:bg-transparent
            border-r lg:border-r-0 border-[--hairline]
            transition-transform duration-200
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            space-y-4 p-4 lg:p-0
          `}
        >
          <nav className="panel p-1 space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onPageChange(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium
                    transition-colors
                    ${active
                      ? 'bg-[--signal] text-white'
                      : 'text-[--ink]/70 hover:bg-[--base] hover:text-[--ink]'}
                  `}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <DataSourceControls />
        </aside>

        {/* ── Main content ───────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
