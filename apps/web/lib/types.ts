import { z } from 'zod';

export type MeterType = 'residential' | 'commercial' | 'industrial';

export const ScenarioSchema = z.object({
  name: z.string().min(1).max(50),
  province: z.string().length(2),
  city: z.string().min(1),
  meter_type: z.enum(['residential', 'commercial', 'industrial']),
  has_tou: z.boolean(),
  monthly_kwh: z.coerce.number().positive(),
  // 工业两部制参数（可选）
  transformer_kva: z.coerce.number().positive().optional(),
  demand_kw: z.coerce.number().positive().optional(),
  // 分时用电画像（可选，如 {"峰":25,"平":55,"谷":20}，引擎自动归一化）
  tou_profile: z.record(z.string(), z.number().min(0)).optional(),
  // 月份（1-12），用于季节阶梯分档；缺省由服务端取当前月
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export type Scenario = z.infer<typeof ScenarioSchema>;

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

export interface SavingsSuggestion {
  text: string;
  save_cost: number;
}

export interface SimulationResult {
  total_cost: number;
  energy_cost: number;
  basic_fee?: number;
  breakdown: TierResult[];
  tou?: TouPeriodResult[];
  savings?: SavingsSuggestion;
  recommendations?: string[];
}

/** 账单核对输入（真实电费账单） */
export const BillInputSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, '账期格式应为 YYYY-MM').optional(),
  total_kwh: z.coerce.number().positive('电量必须大于 0'),
  total_cost: z.coerce.number().min(0, '金额不能为负'),
  // 分时明细：三项同时提供才用于反推画像
  peak_kwh: z.coerce.number().min(0).optional(),
  flat_kwh: z.coerce.number().min(0).optional(),
  valley_kwh: z.coerce.number().min(0).optional(),
});

export type BillInput = z.infer<typeof BillInputSchema>;

/** 账单核对结果（瓦特引擎 /api/reconcile 响应） */
export interface ReconcileResult {
  implied_avg_price: number;
  implied_profile?: Record<string, number>;
  simulated: SimulationResult;
  deviation_cost: number;
  deviation_pct: number;
  diagnosis: string[];
}
