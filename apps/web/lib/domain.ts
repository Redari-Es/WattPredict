import type { MeterType } from './types';

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

/** 电器预设 */
export interface AppliancePreset {
  id: string;
  name: string;
  icon: string; // lucide 图标名
  category: ApplianceCategory;
  power_w: number;
  hours_per_day: number;
}

export const METER_TYPE_LABELS: Record<MeterType, string> = {
  residential: '家庭',
  commercial: '商业',
  industrial: '工业',
};

export const GD_CITIES = [
  '广州', '深圳', '佛山', '东莞', '珠海', '中山', '惠州', '江门', '肇庆', '汕头', '其他',
] as const;
