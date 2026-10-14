'use client';

import { create } from 'zustand';
import type { ScenarioRecord, ScenarioAppliance, SimulationRun, BillRecord } from './domain';
import { seedScenarios } from './mock-data';

export type DashboardView = 'overview' | 'scenarios' | 'simulate' | 'appliances' | 'reconcile';

interface DashboardState {
  view: DashboardView;
  setView: (view: DashboardView) => void;

  scenarios: ScenarioRecord[];
  /** 用服务端数据初始化（Supabase 已配置时）；传 null 则回退到演示数据 */
  initScenarios: (list: ScenarioRecord[] | null) => void;
  addScenario: (s: ScenarioRecord) => void;
  removeScenario: (id: string) => void;

  /** 按场景隔离的电器配置：scenarioId → 电器列表 */
  appliances: Record<string, ScenarioAppliance[]>;
  /** null = 开发模式（初始为空，仅内存） */
  initAppliances: (list: ScenarioAppliance[] | null) => void;
  /** 更新某场景下某电器（count 为 0 视为移除；powerW 为 null 用预设默认功率） */
  setAppliance: (
    scenarioId: string,
    presetId: string,
    patch: { count?: number; hoursPerDay?: number; powerW?: number | null },
  ) => void;

  /** 推演历史（按时间倒序） */
  simulationRuns: SimulationRun[];
  initSimulationRuns: (list: SimulationRun[] | null) => void;
  addSimulationRun: (run: SimulationRun) => void;

  /** 真实账单（按时间倒序，账单核对的输入） */
  bills: BillRecord[];
  initBills: (list: BillRecord[] | null) => void;
  addBill: (bill: BillRecord) => void;
  removeBill: (id: string) => void;

  /** 推演视图预选的场景与电量 */
  simScenarioId: string | null;
  simKwh: number | null;
  startSimulation: (scenarioId: string, kwh: number) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  view: 'overview',
  setView: (view) => set({ view }),

  scenarios: seedScenarios,
  initScenarios: (list) => set({ scenarios: list ?? seedScenarios }),
  addScenario: (s) => set((state) => ({ scenarios: [...state.scenarios, s] })),
  removeScenario: (id) =>
    set((state) => ({ scenarios: state.scenarios.filter((s) => s.id !== id) })),

  appliances: {},
  initAppliances: (list) => {
    if (!list) return; // 开发模式保持内存态
    const grouped: Record<string, ScenarioAppliance[]> = {};
    for (const a of list) {
      (grouped[a.scenario_id] ??= []).push(a);
    }
    set({ appliances: grouped });
  },
  setAppliance: (scenarioId, presetId, patch) =>
    set((state) => {
      const current = state.appliances[scenarioId] ?? [];
      const existing = current.find((a) => a.preset_id === presetId);
      const merged: ScenarioAppliance = {
        scenario_id: scenarioId,
        preset_id: presetId,
        count: patch.count ?? existing?.count ?? 1,
        hours_per_day: patch.hoursPerDay ?? existing?.hours_per_day ?? 1,
        power_w: patch.powerW !== undefined ? patch.powerW : (existing?.power_w ?? null),
      };
      const rest = current.filter((a) => a.preset_id !== presetId);
      const next = merged.count > 0 ? [...rest, merged] : rest;
      return { appliances: { ...state.appliances, [scenarioId]: next } };
    }),

  simulationRuns: [],
  initSimulationRuns: (list) => set({ simulationRuns: list ?? [] }),
  addSimulationRun: (run) =>
    set((state) => ({ simulationRuns: [run, ...state.simulationRuns] })),

  bills: [],
  initBills: (list) => set({ bills: list ?? [] }),
  addBill: (bill) =>
    set((state) => ({
      // 同一场景同一账期只保留最新一条（与 DB unique 约束一致）
      bills: [
        bill,
        ...state.bills.filter(
          (b) => !(b.scenario_id === bill.scenario_id && b.period === bill.period),
        ),
      ],
    })),
  removeBill: (id) => set((state) => ({ bills: state.bills.filter((b) => b.id !== id) })),

  simScenarioId: null,
  simKwh: null,
  startSimulation: (scenarioId, kwh) =>
    set({ view: 'simulate', simScenarioId: scenarioId, simKwh: kwh }),
}));
