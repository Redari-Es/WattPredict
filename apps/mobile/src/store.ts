import { create } from 'zustand';
import type { BillRecord, MeterType } from './types';

export interface ApplianceConfig {
  count: number;
  hoursPerDay: number;
  /** 自定义功率（null = 用预设默认功率） */
  powerW?: number | null;
}

interface AppState {
  /** 当前电表类型（推演/账单共用） */
  meterType: MeterType;
  setMeterType: (t: MeterType) => void;

  /** 电器配置：presetId → 配置（本机内存，v1 不同步云端） */
  appliances: Record<string, ApplianceConfig>;
  setAppliance: (presetId: string, patch: Partial<ApplianceConfig>) => void;

  /** 账单（本机内存，upsert by period+meterType） */
  bills: BillRecord[];
  addBill: (b: Omit<BillRecord, 'id'>) => void;
  removeBill: (id: string) => void;

  /** 电器页「带入推演」的电量 */
  simKwh: number | null;
  startSimulation: (kwh: number) => void;
  clearSimKwh: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  meterType: 'residential',
  setMeterType: (meterType) => set({ meterType }),

  appliances: {},
  setAppliance: (presetId, patch) =>
    set((state) => {
      const cur = state.appliances[presetId];
      const merged: ApplianceConfig = {
        count: patch.count ?? cur?.count ?? 1,
        hoursPerDay: patch.hoursPerDay ?? cur?.hoursPerDay ?? 1,
        powerW: patch.powerW !== undefined ? patch.powerW : (cur?.powerW ?? null),
      };
      const next = { ...state.appliances };
      if (merged.count > 0) next[presetId] = merged;
      else delete next[presetId];
      return { appliances: next };
    }),

  bills: [],
  addBill: (b) =>
    set((state) => ({
      bills: [
        { ...b, id: `${b.period}-${b.meter_type}-${state.bills.length}` },
        ...state.bills.filter((x) => !(x.period === b.period && x.meter_type === b.meter_type)),
      ],
    })),
  removeBill: (id) => set((state) => ({ bills: state.bills.filter((b) => b.id !== id) })),

  simKwh: null,
  startSimulation: (kwh) => set({ simKwh: kwh }),
  clearSimKwh: () => set({ simKwh: null }),
}));
