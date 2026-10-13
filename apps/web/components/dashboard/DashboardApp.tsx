'use client';

import { useEffect, useState } from 'react';
import { useDashboardStore } from '@/lib/store';
import type { ScenarioRecord, ScenarioAppliance, SimulationRun } from '@/lib/domain';
import { Sidebar } from './Sidebar';
import { Header, type HeaderUser } from './Header';
import { OverviewView } from './views/OverviewView';
import { ScenariosView } from './views/ScenariosView';
import { SimulateView } from './views/SimulateView';
import { AppliancesView } from './views/AppliancesView';

export function DashboardApp({
  user,
  initialScenarios,
  initialAppliances,
  initialSimulationRuns,
}: {
  user: HeaderUser;
  /** null = 开发模式（使用演示数据）；数组 = Supabase 真实数据 */
  initialScenarios: ScenarioRecord[] | null;
  initialAppliances: ScenarioAppliance[] | null;
  initialSimulationRuns: SimulationRun[] | null;
}) {
  const view = useDashboardStore((s) => s.view);
  const initScenarios = useDashboardStore((s) => s.initScenarios);
  const initAppliances = useDashboardStore((s) => s.initAppliances);
  const initSimulationRuns = useDashboardStore((s) => s.initSimulationRuns);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    initScenarios(initialScenarios);
    initAppliances(initialAppliances);
    initSimulationRuns(initialSimulationRuns);
  }, [initialScenarios, initialAppliances, initialSimulationRuns, initScenarios, initAppliances, initSimulationRuns]);

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      {/* 背景：网格 + 顶部琥珀光晕 */}
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-25" />
      <div className="pointer-events-none absolute -top-48 left-1/3 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-primary/8 blur-[140px]" />

      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Header user={user} onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {view === 'overview' && <OverviewView />}
          {view === 'scenarios' && <ScenariosView />}
          {view === 'simulate' && <SimulateView />}
          {view === 'appliances' && <AppliancesView />}
        </main>
      </div>
    </div>
  );
}
