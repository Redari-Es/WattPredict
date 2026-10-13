'use client';

import { create } from 'zustand';
import type { ScenarioRecord } from './domain';
import { seedScenarios } from './mock-data';

export type DashboardView = 'overview' | 'scenarios' | 'simulate' | 'appliances';

interface DashboardState {
  view: DashboardView;
  setView: (view: DashboardView) => void;

  scenarios: ScenarioRecord[];
  addScenario: (s: ScenarioRecord) => void;
  removeScenario: (id: string) => void;

  /** 推演视图预选的场景与电量 */
  simScenarioId: string | null;
  simKwh: number | null;
  startSimulation: (scenarioId: string, kwh: number) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  view: 'overview',
  setView: (view) => set({ view }),

  scenarios: seedScenarios,
  addScenario: (s) => set((state) => ({ scenarios: [...state.scenarios, s] })),
  removeScenario: (id) =>
    set((state) => ({ scenarios: state.scenarios.filter((s) => s.id !== id) })),

  simScenarioId: null,
  simKwh: null,
  startSimulation: (scenarioId, kwh) =>
    set({ view: 'simulate', simScenarioId: scenarioId, simKwh: kwh }),
}));
