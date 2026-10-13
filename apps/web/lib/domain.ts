import type { MeterType, SimulationResult } from './types';

/** 用电场景记录（仪表盘内使用，后续对接 Supabase scenarios 表） */
export interface ScenarioRecord {
  id: string;
  name: string;
  province: string;
  city: string;
  meter_type: MeterType;
  has_tou: boolean;
  monthly_kwh: number;
  /** 家庭专用 */
  household_type?: string;
  /** 商业专用 */
  business_type?: string;
  /** 工业专用 */
  transformer_kva?: number;
  demand_kw?: number;
}

/** 电器分类 */
export type ApplianceCategory =
  | 'cooling'      // 制冷取暖
  | 'kitchen'      // 厨房烹饪
  | 'laundry'      // 洗护清洁
  | 'digital'      // 数码家电
  | 'environment'  // 照明环境
  | 'mobility';    // 出行充电

export const APPLIANCE_CATEGORY_LABELS: Record<ApplianceCategory, string> = {
  cooling: '制冷取暖',
  kitchen: '厨房烹饪',
  laundry: '洗护清洁',
  digital: '数码家电',
  environment: '照明环境',
  mobility: '出行充电',
};

/** 功率档位（能效等级 / 机型差异），如空调的一级/三级/五级能效 */
export interface PowerOption {
  label: string;
  power_w: number;
}

/** 电器预设 */
export interface AppliancePreset {
  id: string;
  name: string;
  icon: string; // lucide 图标名
  category: ApplianceCategory;
  power_w: number;          // 默认功率
  power_options?: PowerOption[]; // 可选功率档位
  hours_per_day: number;    // 默认每日使用时长（可修改）
}

/** 场景下的电器配置（对应 appliances 表，preset_id 关联前端预设） */
export interface ScenarioAppliance {
  id?: string;
  scenario_id: string;
  preset_id: string;
  count: number;
  hours_per_day: number;
  /** 自定义功率（null/undefined = 使用预设默认功率） */
  power_w?: number | null;
}

/** 推演历史记录（对应 simulation_runs 表） */
export interface SimulationRun {
  id: string;
  scenario_id: string;
  monthly_kwh: number;
  flat_result: SimulationResult;
  tou_result?: SimulationResult | null;
  saving?: number | null;
  created_at: string;
}

export const METER_TYPE_LABELS: Record<MeterType, string> = {
  residential: '家庭',
  commercial: '商业',
  industrial: '工业',
};

export const GD_CITIES = [
  '广州', '深圳', '佛山', '东莞', '珠海', '中山', '惠州', '江门', '肇庆', '汕头', '其他',
] as const;
