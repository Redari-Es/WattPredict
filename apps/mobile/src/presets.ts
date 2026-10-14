/** 电器预设库（与 Web 端 lib/mock-data.ts 同步移植，图标改用 MaterialCommunityIcons） */

export type ApplianceCategory =
  | 'cooling' | 'kitchen' | 'laundry' | 'digital' | 'environment' | 'mobility';

export const CATEGORY_LABELS: Record<ApplianceCategory, string> = {
  cooling: '制冷取暖',
  kitchen: '厨房烹饪',
  laundry: '洗护清洁',
  digital: '数码家电',
  environment: '照明环境',
  mobility: '出行充电',
};

export interface PowerOption {
  label: string;
  power_w: number;
}

export interface AppliancePreset {
  id: string;
  name: string;
  icon: string; // MaterialCommunityIcons 图标名
  category: ApplianceCategory;
  power_w: number;
  power_options?: PowerOption[];
  hours_per_day: number;
}

// 注意：空调/冰箱为间歇运行设备，功率取「占空比折算均耗」而非额定功率
export const appliancePresets: AppliancePreset[] = [
  // 制冷取暖
  {
    id: 'ac', name: '空调 (1.5匹)', icon: 'air-conditioner', category: 'cooling', power_w: 550, hours_per_day: 8,
    power_options: [
      { label: '一级能效', power_w: 400 },
      { label: '三级能效', power_w: 550 },
      { label: '五级能效', power_w: 700 },
    ],
  },
  {
    id: 'fan', name: '电风扇', icon: 'fan', category: 'cooling', power_w: 60, hours_per_day: 6,
    power_options: [
      { label: '普通', power_w: 60 },
      { label: '直流变频', power_w: 30 },
      { label: '空气循环扇', power_w: 45 },
    ],
  },
  { id: 'blanket', name: '电热毯', icon: 'fire', category: 'cooling', power_w: 100, hours_per_day: 6 },
  {
    // 冰箱按能效标识的「综合耗电量(度/24h)」折算均耗功率
    id: 'fridge', name: '冰箱', icon: 'fridge-outline', category: 'cooling', power_w: 35, hours_per_day: 24,
    power_options: [
      { label: '一级能效', power_w: 25 },
      { label: '二级能效', power_w: 35 },
      { label: '对开门', power_w: 54 },
    ],
  },
  // 厨房烹饪
  { id: 'induction', name: '电磁炉', icon: 'pot-steam-outline', category: 'kitchen', power_w: 2100, hours_per_day: 1.5 },
  { id: 'rice-cooker', name: '电饭煲', icon: 'pot-outline', category: 'kitchen', power_w: 400, hours_per_day: 1 },
  { id: 'microwave', name: '微波炉', icon: 'microwave', category: 'kitchen', power_w: 1000, hours_per_day: 0.3 },
  { id: 'oven', name: '电烤箱', icon: 'oven', category: 'kitchen', power_w: 1800, hours_per_day: 0.5 },
  { id: 'dishwasher', name: '洗碗机', icon: 'dishwasher', category: 'kitchen', power_w: 1200, hours_per_day: 1 },
  // 洗护清洁
  {
    id: 'washer', name: '洗衣机', icon: 'washing-machine', category: 'laundry', power_w: 500, hours_per_day: 1,
    power_options: [
      { label: '波轮', power_w: 400 },
      { label: '滚筒', power_w: 500 },
      { label: '洗烘一体', power_w: 1200 },
    ],
  },
  { id: 'dryer', name: '烘干机', icon: 'tumble-dryer', category: 'laundry', power_w: 2000, hours_per_day: 1 },
  {
    id: 'water-heater', name: '电热水器', icon: 'water-boiler', category: 'laundry', power_w: 2000, hours_per_day: 2,
    power_options: [
      { label: '1500W 小容量', power_w: 1500 },
      { label: '2000W 常规', power_w: 2000 },
      { label: '3000W 速热', power_w: 3000 },
    ],
  },
  // 数码家电
  {
    id: 'pc', name: '台式电脑', icon: 'desktop-tower-monitor', category: 'digital', power_w: 350, hours_per_day: 6,
    power_options: [
      { label: '办公机', power_w: 200 },
      { label: '主流配置', power_w: 350 },
      { label: '高配游戏', power_w: 600 },
    ],
  },
  {
    id: 'laptop', name: '笔记本电脑', icon: 'laptop', category: 'digital', power_w: 65, hours_per_day: 8,
    power_options: [
      { label: '轻薄本', power_w: 45 },
      { label: '全能本', power_w: 65 },
      { label: '游戏本', power_w: 150 },
    ],
  },
  {
    id: 'phone', name: '手机充电', icon: 'cellphone-charging', category: 'digital', power_w: 20, hours_per_day: 2,
    power_options: [
      { label: '慢充 10W', power_w: 10 },
      { label: '快充 20W', power_w: 20 },
      { label: '超级快充 65W', power_w: 65 },
    ],
  },
  { id: 'router', name: '路由器', icon: 'router-wireless', category: 'digital', power_w: 10, hours_per_day: 24 },
  {
    id: 'tv', name: '电视', icon: 'television', category: 'digital', power_w: 200, hours_per_day: 4,
    power_options: [
      { label: '55 英寸', power_w: 120 },
      { label: '75 英寸', power_w: 200 },
      { label: '85 英寸', power_w: 300 },
    ],
  },
  { id: 'console', name: '游戏机', icon: 'gamepad-variant-outline', category: 'digital', power_w: 200, hours_per_day: 2 },
  { id: 'projector', name: '投影仪', icon: 'projector', category: 'digital', power_w: 250, hours_per_day: 2 },
  // 照明环境
  { id: 'led', name: 'LED 照明', icon: 'lightbulb-outline', category: 'environment', power_w: 60, hours_per_day: 6 },
  { id: 'purifier', name: '空气净化器', icon: 'air-purifier', category: 'environment', power_w: 50, hours_per_day: 12 },
  // 出行充电
  {
    id: 'ev', name: '电动车充电', icon: 'car-electric', category: 'mobility', power_w: 3300, hours_per_day: 2,
    power_options: [
      { label: '慢充 2.2kW', power_w: 2200 },
      { label: '常规 3.3kW', power_w: 3300 },
      { label: '快充 7kW', power_w: 7000 },
    ],
  },
];
