'use client';

import { useDashboardStore } from '@/lib/store';
import { Sidebar } from './Sidebar';
import { Header, type HeaderUser } from './Header';
import { OverviewView } from './views/OverviewView';
import { ScenariosView } from './views/ScenariosView';
import { SimulateView } from './views/SimulateView';
import { AppliancesView } from './views/AppliancesView';

export function DashboardApp({ user }: { user: HeaderUser }) {
  const view = useDashboardStore((s) => s.view);

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      {/* 背景：网格 + 顶部琥珀光晕 */}
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-25" />
      <div className="pointer-events-none absolute -top-48 left-1/3 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-primary/8 blur-[140px]" />

      <Sidebar />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          {view === 'overview' && <OverviewView />}
          {view === 'scenarios' && <ScenariosView />}
          {view === 'simulate' && <SimulateView />}
          {view === 'appliances' && <AppliancesView />}
        </main>
      </div>
    </div>
  );
}
