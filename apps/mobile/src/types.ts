/** 与瓦特引擎 / Web 端共享的核心类型 */

export type MeterType = 'residential' | 'commercial' | 'industrial';

export const METER_TYPE_LABELS: Record<MeterType, string> = {
  residential: '家庭',
  commercial: '商业',
  industrial: '工业',
};

/** 默认分时用电画像（与引擎规则 default_profile 对齐） */
export const DEFAULT_TOU_PROFILE: Record<MeterType, Record<'峰' | '平' | '谷', number>> = {
  residential: { 峰: 25, 平: 55, 谷: 20 },
  commercial: { 峰: 35, 平: 50, 谷: 15 },
  industrial: { 峰: 40, 平: 45, 谷: 15 },
};

export interface TierResult {
  tier: string;
  kwh: number;
  price: number;
  cost: number;
}

export interface TouPeriodResult {
  name: string;
  hours: string;
  price: number;
  kwh: number;
  cost: number;
}

export interface SimulationResult {
  total_cost: number;
  energy_cost: number;
  basic_fee?: number;
  breakdown: TierResult[];
  tou?: TouPeriodResult[];
  savings?: { text: string; save_cost: number };
  recommendations?: string[];
}

export interface SimulatePayload {
  province: string;
  meter_type: MeterType;
  monthly_kwh: number;
  has_tou: boolean;
  month?: number;
  transformer_kva?: number;
  demand_kw?: number;
  tou_profile?: Record<string, number>;
}

export interface ReconcilePayload {
  province: string;
  meter_type: MeterType;
  total_kwh: number;
  total_cost: number;
  month?: number;
  peak_kwh?: number;
  flat_kwh?: number;
  valley_kwh?: number;
}

export interface ReconcileResult {
  implied_avg_price: number;
  implied_profile?: Record<string, number>;
  simulated: SimulationResult;
  deviation_cost: number;
  deviation_pct: number;
  diagnosis: string[];
}

/** 账单记录（移动端 v1 仅存本机内存，云端同步待 Supabase Auth 接入） */
export interface BillRecord {
  id: string;
  period: string; // 'YYYY-MM'
  meter_type: MeterType;
  total_kwh: number;
  total_cost: number;
  peak_kwh?: number | null;
  flat_kwh?: number | null;
  valley_kwh?: number | null;
}
