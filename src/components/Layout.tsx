import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard, LineChart, FlaskConical, Cpu, Map, Car, Database,
  AlertCircle, type LucideIcon,
} from 'lucide-react';
import { useStore } from '@/store';
import { DataSourceControls } from './DataSourceControls';

export type PageId = 'dashboard' | 'trip' | 'assumptions' | 'dataset' | 'models' | 'roadmap';

interface NavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'trip', label: 'Trip Analysis', icon: LineChart },
  { id: 'assumptions', label: 'Assumptions Lab', icon: FlaskConical },
  { id: 'dataset', label: 'Dataset Explorer', icon: Database },
  { id: 'models', label: 'Models & Methods', icon: Cpu },
  { id: 'roadmap', label: 'Roadmap', icon: Map },
];

interface LayoutProps {
  currentPage: PageId;
  onPageChange: (page: PageId) => void;
  children: ReactNode;
}

export function Layout({ currentPage, onPageChange, children }: LayoutProps) {
  const { dataSource } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

      const isSim = dataSource === 'simulator';
  const isLive = dataSource === 'live';
  const isDatasetPage = currentPage === 'dataset';

  return (
    <div className="min-h-screen bg-violet-50/30">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-violet-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-violet-950 text-lg leading-none">DriveWise AI</span>
              <span className="block text-[10px] text-violet-400 leading-none mt-0.5">
                Research prototype
              </span>
            </div>
          </div>

                    {/* Data source badge */}
                    {/* Data source badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              isDatasetPage
                ? 'bg-green-100 text-green-700'
                : isLive
                ? 'bg-amber-100 text-amber-700'
                : isSim
                ? 'bg-violet-100 text-violet-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            {isDatasetPage ? 'REAL DATA' : isLive ? 'LIVE RECORDED DATA' : isSim ? 'SIMULATED DATA' : 'UPLOADED DATA'}
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-violet-50 text-violet-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex gap-6">
        {/* Sidebar / nav */}
        <aside className={`${sidebarOpen ? 'block' : 'hidden'} lg:block w-full lg:w-64 shrink-0 space-y-4`}>
          <nav className="bg-white rounded-2xl shadow-sm border border-violet-100 p-2 space-y-1">
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-violet-700 hover:bg-violet-50'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <DataSourceControls />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
