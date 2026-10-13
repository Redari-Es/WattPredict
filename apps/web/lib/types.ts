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
}
