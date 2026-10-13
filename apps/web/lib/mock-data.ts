import type { AppliancePreset, ScenarioRecord } from './domain';
import { monthlyEnergyKwh } from './units';

/** 近 12 个月用电趋势（演示数据，后续由 Supabase 账单数据驱动） */
export const monthlyTrend = [
  { month: '11月', kwh: 312, cost: 183.7 },
  { month: '12月', kwh: 385, cost: 236.4 },
  { month: '1月', kwh: 428, cost: 260.6 },
  { month: '2月', kwh: 356, cost: 219.8 },
  { month: '3月', kwh: 298, cost: 175.5 },
  { month: '4月', kwh: 276, cost: 162.5 },
  { month: '5月', kwh: 342, cost: 210.3 },
  { month: '6月', kwh: 465, cost: 289.4 },
  { month: '7月', kwh: 588, cost: 369.9 },
  { month: '8月', kwh: 612, cost: 385.2 },
  { month: '9月', kwh: 489, cost: 305.9 },
  { month: '10月', kwh: 420, cost: 255.3 },
];

/** 近 14 天每日用电 */
export const dailyUsage = Array.from({ length: 14 }, (_, i) => ({
  day: `${i + 1}日`,
  kwh: Math.round(8 + Math.sin(i / 2.2) * 4 + (i % 5)),
}));

export const seedScenarios: ScenarioRecord[] = [
  {
    id: 'sc-001',
    name: '广州租屋',
    province: 'GD',
    city: '广州',
    meter_type: 'residential',
    has_tou: false,
    monthly_kwh: 420,
    household_type: '普通住宅',
  },
  {
    id: 'sc-002',
    name: '南山奶茶店',
    province: 'GD',
    city: '深圳',
    meter_type: 'commercial',
    has_tou: true,
    monthly_kwh: 2800,
    business_type: '餐饮',
  },
  {
    id: 'sc-003',
    name: '东莞小工厂',
    province: 'GD',
    city: '东莞',
    meter_type: 'industrial',
    has_tou: true,
    monthly_kwh: 46000,
    transformer_kva: 250,
    demand_kw: 180,
  },
];

export const appliancePresets: AppliancePreset[] = [
  // 制冷取暖
  { id: 'ac', name: '空调 (1.5匹)', icon: 'AirVent', category: 'cooling', power_w: 1100, hours_per_day: 8 },
  { id: 'fan', name: '电风扇', icon: 'Fan', category: 'cooling', power_w: 60, hours_per_day: 6 },
  { id: 'blanket', name: '电热毯', icon: 'Heater', category: 'cooling', power_w: 100, hours_per_day: 6 },
  { id: 'fridge', name: '冰箱', icon: 'Refrigerator', category: 'cooling', power_w: 120, hours_per_day: 24 },
  // 厨房烹饪
  { id: 'induction', name: '电磁炉', icon: 'CookingPot', category: 'kitchen', power_w: 2100, hours_per_day: 1.5 },
  { id: 'rice-cooker', name: '电饭煲', icon: 'Soup', category: 'kitchen', power_w: 400, hours_per_day: 1 },
  { id: 'microwave', name: '微波炉', icon: 'Microwave', category: 'kitchen', power_w: 1000, hours_per_day: 0.3 },
  { id: 'oven', name: '电烤箱', icon: 'ChefHat', category: 'kitchen', power_w: 1800, hours_per_day: 0.5 },
  { id: 'dishwasher', name: '洗碗机', icon: 'Droplets', category: 'kitchen', power_w: 1200, hours_per_day: 1 },
  // 洗护清洁
  { id: 'washer', name: '洗衣机', icon: 'WashingMachine', category: 'laundry', power_w: 500, hours_per_day: 1 },
  { id: 'dryer', name: '烘干机', icon: 'Shirt', category: 'laundry', power_w: 2000, hours_per_day: 1 },
  { id: 'water-heater', name: '电热水器', icon: 'Flame', category: 'laundry', power_w: 2000, hours_per_day: 2 },
  // 数码家电
  { id: 'pc', name: '台式电脑', icon: 'Monitor', category: 'digital', power_w: 350, hours_per_day: 6 },
  { id: 'laptop', name: '笔记本电脑', icon: 'Laptop', category: 'digital', power_w: 65, hours_per_day: 8 },
  { id: 'phone', name: '手机充电', icon: 'Smartphone', category: 'digital', power_w: 15, hours_per_day: 2 },
  { id: 'router', name: '路由器', icon: 'Router', category: 'digital', power_w: 10, hours_per_day: 24 },
  { id: 'tv', name: '电视', icon: 'Tv', category: 'digital', power_w: 150, hours_per_day: 4 },
  { id: 'console', name: '游戏机', icon: 'Gamepad2', category: 'digital', power_w: 200, hours_per_day: 2 },
  { id: 'projector', name: '投影仪', icon: 'Projector', category: 'digital', power_w: 250, hours_per_day: 2 },
  // 照明环境
  { id: 'led', name: 'LED 照明', icon: 'Lightbulb', category: 'environment', power_w: 60, hours_per_day: 6 },
  { id: 'purifier', name: '空气净化器', icon: 'Wind', category: 'environment', power_w: 50, hours_per_day: 12 },
  // 出行充电
  { id: 'ev', name: '电动车充电', icon: 'Car', category: 'mobility', power_w: 3300, hours_per_day: 2 },
];

/** 月耗电量估算 (kWh) */
export function monthlyKwh(p: AppliancePreset, count = 1): number {
  return Math.round(monthlyEnergyKwh(p.power_w, p.hours_per_day) * count * 10) / 10;
}
