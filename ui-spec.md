# 瓦特预言 (WattPredict) · UI 设计规范

> **版本**：v1.0
> **适用范围**：Web (Next.js) + Mobile (React Native)
> **设计原则**：清晰、可信、高效、专业

---

## 一、品牌基础

### 1.1 Logo

![WattPredict Logo](./logo_wattpredict.png)

- **主色**：电光蓝 + 节能绿渐变
- **辅助图形**：闪电 + 环绕轨道
- **使用场景**：App Icon、Web favicon、PPT、宣传物料

### 1.2 品牌关键词

| 关键词 | 设计表达 |
|--------|----------|
| 智能预测 | 平滑曲线、数据可视化 |
| 节能省钱 | 绿色系、正向箭头、节省标签 |
| 专业可信 | 清晰的数据展示、精确的数值 |
| 简单易用 | 大按钮、预置选项、少输入 |

---

## 二、色彩系统

### 2.1 主色调

```css
/* Primary - 电光蓝 */
--primary-50:  #EFF6FF;
--primary-100: #DBEAFE;
--primary-200: #BFDBFE;
--primary-300: #93C5FD;
--primary-400: #60A5FA;
--primary-500: #3B82F6;  /* 主色 */
--primary-600: #2563EB;
--primary-700: #1D4ED8;
--primary-800: #1E40AF;
--primary-900: #1E3A8A;

/* Secondary - 节能绿 */
--secondary-50:  #ECFDF5;
--secondary-100: #D1FAE5;
--secondary-200: #A7F3D0;
--secondary-300: #6EE7B7;
--secondary-400: #34D399;
--secondary-500: #10B981;  /* 辅助色 */
--secondary-600: #059669;
--secondary-700: #047857;
--secondary-800: #065F46;
--secondary-900: #064E3B;
```

### 2.2 功能色

```css
/* Success - 节省/正向 */
--success-50:  #F0FDF4;
--success-500: #22C55E;
--success-600: #16A34A;

/* Warning - 提醒/注意 */
--warning-50:  #FFFBEB;
--warning-500: #F59E0B;
--warning-600: #D97706;

/* Danger - 错误/超额 */
--danger-50:  #FEF2F2;
--danger-500: #EF4444;
--danger-600: #DC2626;

/* Info - 提示/说明 */
--info-50:  #EFF6FF;
--info-500: #3B82F6;
--info-600: #2563EB;
```

### 2.3 电表类型主题色

| 电表类型 | 主题色 | 用途 |
|----------|--------|------|
| 家庭用电 | `#3B82F6` (蓝色) | 家庭场景卡片、图标、标签 |
| 商业用电 | `#F59E0B` (琥珀色) | 商业场景卡片、图标、标签 |
| 工业用电 | `#6366F1` (靛蓝色) | 工业场景卡片、图标、标签 |

```tsx
// Tailwind 映射
const meterTypeColors = {
  residential: 'bg-blue-500 text-white',
  commercial: 'bg-amber-500 text-white',
  industrial: 'bg-indigo-500 text-white',
};

// React Native StyleSheet
const meterTypeStyles = {
  residential: { backgroundColor: '#3B82F6', color: '#FFFFFF' },
  commercial: { backgroundColor: '#F59E0B', color: '#FFFFFF' },
  industrial: { backgroundColor: '#6366F1', color: '#FFFFFF' },
};
```

### 2.4 中性色

```css
/* 灰度色 */
--gray-50:  #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;
--gray-400: #9CA3AF;
--gray-500: #6B7280;
--gray-600: #4B5563;
--gray-700: #374151;
--gray-800: #1F2937;
--gray-900: #111827;

/* 背景 */
--bg-primary:   #FFFFFF;
--bg-secondary: #F9FAFB;
--bg-tertiary:  #F3F4F6;

/* 文字 */
--text-primary:   #111827;
--text-secondary: #4B5563;
--text-tertiary:  #9CA3AF;
--text-inverse:   #FFFFFF;
```

---

## 三、字体系统

### 3.1 Web 字体

```css
/* 中文优先 */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;

/* 数字等宽（金额、电量显示） */
font-family: 'Inter', 'SF Mono', 'Roboto Mono', monospace;
```

### 3.2 字号规范

| 级别 | 大小 | 字重 | 行高 | 用途 |
|------|------|------|------|------|
| Display | 36px | 700 | 1.2 | 首页大标题 |
| H1 | 28px | 700 | 1.3 | 页面标题 |
| H2 | 22px | 600 | 1.35 | 区块标题 |
| H3 | 18px | 600 | 1.4 | 卡片标题 |
| H4 | 16px | 600 | 1.5 | 小标题 |
| Body | 15px | 400 | 1.6 | 正文 |
| Body-sm | 13px | 400 | 1.5 | 辅助文字 |
| Caption | 12px | 400 | 1.4 | 标签、时间 |

### 3.3 金额/数字显示规范

```tsx
// 金额显示：¥228.5
<span className="text-2xl font-bold tabular-nums">
  ¥{amount.toFixed(1)}
</span>

// 电量显示：380.5 度
<span className="text-lg font-medium tabular-nums">
  {kwh.toFixed(1)} <span className="text-sm text-gray-500">度</span>
</span>

// 节省金额（绿色高亮）
<span className="text-xl font-bold text-green-600 tabular-nums">
  -¥{savings.toFixed(1)}
</span>

// 偏差百分比
<span className={cn(
  "text-sm font-medium",
  deviation < 0.1 ? "text-green-600" : deviation < 0.15 ? "text-amber-600" : "text-red-600"
)}>
  {(deviation * 100).toFixed(1)}%
</span>
```

---

## 四、间距系统

### 4.1 基础单位

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

### 4.2 常用间距模式

| 场景 | 间距 |
|------|------|
| 页面内边距 | 16px (mobile) / 24px (tablet) / 32px (desktop) |
| 卡片内边距 | 16px |
| 卡片间距 | 12px |
| 表单字段间距 | 16px |
| 按钮内边距 | 12px 24px |
| 区块间距 | 24px |

---

## 五、组件规范

### 5.1 按钮

#### Primary Button

```tsx
// Web (Tailwind)
<button className="
  bg-blue-600 hover:bg-blue-700
  text-white font-medium
  px-6 py-3 rounded-xl
  transition-colors duration-200
  disabled:opacity-50 disabled:cursor-not-allowed
  active:scale-[0.98]
">
  开始推演
</button>

// React Native
<TouchableOpacity
  style={{
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  }}
  activeOpacity={0.8}
>
  <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>
    开始推演
  </Text>
</TouchableOpacity>
```

#### Secondary Button

```tsx
<button className="
  bg-white border border-gray-300
  text-gray-700 font-medium
  px-6 py-3 rounded-xl
  hover:bg-gray-50
  transition-colors duration-200
">
  取消
</button>
```

#### Meter Type Button（电表类型选择）

```tsx
// 三选一按钮组
<div className="grid grid-cols-3 gap-3">
  {[
    { type: 'residential', label: '家庭用电', icon: Home, color: 'blue' },
    { type: 'commercial', label: '商业用电', icon: Store, color: 'amber' },
    { type: 'industrial', label: '工业用电', icon: Factory, color: 'indigo' },
  ].map(({ type, label, icon: Icon, color }) => (
    <button
      key={type}
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
        selected === type
          ? `border-${color}-500 bg-${color}-50`
          : "border-gray-200 hover:border-gray-300"
      )}
    >
      <Icon className={cn("w-6 h-6", selected === type ? `text-${color}-500` : "text-gray-400")} />
      <span className={cn("text-sm font-medium", selected === type ? `text-${color}-700` : "text-gray-600")}>
        {label}
      </span>
    </button>
  ))}
</div>
```

### 5.2 卡片

#### Scenario Card（场景卡片）

```tsx
<div className="
  bg-white rounded-2xl p-4
  border border-gray-200
  shadow-sm hover:shadow-md
  transition-shadow duration-200
  cursor-pointer
">
  {/* 头部：类型标签 + 城市 */}
  <div className="flex items-center justify-between mb-3">
    <span className={cn(
      "px-2.5 py-1 rounded-full text-xs font-medium",
      meterType === 'residential' && "bg-blue-100 text-blue-700",
      meterType === 'commercial' && "bg-amber-100 text-amber-700",
      meterType === 'industrial' && "bg-indigo-100 text-indigo-700",
    )}>
      {meterTypeLabel}
    </span>
    <span className="text-xs text-gray-400">{city}</span>
  </div>

  {/* 场景名称 */}
  <h3 className="text-lg font-semibold text-gray-900 mb-2">{name}</h3>

  {/* 数据摘要 */}
  <div className="flex items-center gap-4 text-sm">
    <div>
      <span className="text-gray-500">月估</span>
      <span className="ml-1 font-bold text-gray-900">¥{estimatedCost}</span>
    </div>
    <div>
      <span className="text-gray-500">精度</span>
      <span className={cn("ml-1 font-medium", deviationColor)}>{deviation}%</span>
    </div>
  </div>
</div>
```

### 5.3 输入框

```tsx
// Text Input
<div className="space-y-1.5">
  <label className="text-sm font-medium text-gray-700">
    设备名称
  </label>
  <input
    type="text"
    className="
      w-full px-4 py-3
      bg-white border border-gray-300 rounded-xl
      text-gray-900 placeholder:text-gray-400
      focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
      transition-all duration-200
    "
    placeholder="如：客厅空调"
  />
</div>

// Number Input（电量/金额）
<div className="space-y-1.5">
  <label className="text-sm font-medium text-gray-700">
    日均使用时长（小时）
  </label>
  <div className="relative">
    <input
      type="number"
      className="w-full px-4 py-3 pr-12 bg-white border border-gray-300 rounded-xl ..."
    />
    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
      小时
    </span>
  </div>
</div>
```

### 5.4 结果展示卡片

#### Simulation Result Card（推演结果）

```tsx
<div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
  {/* 头部：情景名称 + 节省金额 */}
  <div className="p-4 border-b border-gray-100">
    <div className="flex items-center justify-between">
      <h4 className="font-semibold text-gray-900">{scenarioName}</h4>
      {savings > 0 && (
        <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
          省 ¥{savings.toFixed(1)}/月
        </span>
      )}
    </div>
  </div>

  {/* 数据对比 */}
  <div className="p-4 space-y-3">
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-500">预估月用电</span>
      <span className="font-medium tabular-nums">{estimatedKwh.toFixed(1)} 度</span>
    </div>
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-500">预估月电费</span>
      <span className="font-bold text-lg tabular-nums">¥{estimatedCost.toFixed(1)}</span>
    </div>
    <div className="h-px bg-gray-100" />
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-500">年节省预估</span>
      <span className="font-bold text-green-600 tabular-nums">
        ¥{(savings * 12).toFixed(0)}
      </span>
    </div>
  </div>

  {/* 底部：操作 */}
  <div className="px-4 py-3 bg-gray-50 flex gap-2">
    <button className="flex-1 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
      应用此方案
    </button>
  </div>
</div>
```

---

## 六、图标规范

### 6.1 图标库

| 平台 | 库 | 安装 |
|------|----|------|
| Web | Lucide React | `npm install lucide-react` |
| Mobile | @expo/vector-icons | 内置 |

### 6.2 核心图标映射

| 功能 | Web (Lucide) | Mobile (Ionicons) |
|------|-------------|-------------------|
| 首页 | `Home` | `home` |
| 场景 | `Building2` | `business` |
| 推演 | `Calculator` | `calculator` |
| 对账 | `Receipt` | `receipt` |
| 设置 | `Settings` | `settings` |
| 添加 | `Plus` | `add` |
| 删除 | `Trash2` | `trash` |
| 编辑 | `Pencil` | `create` |
| 保存 | `Check` | `checkmark` |
| 关闭 | `X` | `close` |
| 返回 | `ChevronLeft` | `chevron-back` |
| 家庭 | `Home` | `home` |
| 商业 | `Store` | `storefront` |
| 工业 | `Factory` | `construct` |
| 空调 | `Wind` | `snow` |
| 冰箱 | `Refrigerator` | `cube` |
| 照明 | `Lightbulb` | `bulb` |
| 电动车 | `BatteryCharging` | `battery-charging` |

---

## 七、布局规范

### 7.1 Web 布局

```
Desktop (>= 1024px)
┌─────────────────────────────────────┐
│  Sidebar    │      Main Content     │
│  (200px)    │      (flex-1)         │
│             │                       │
│  Dashboard  │   ┌───────────────┐   │
│  Scenarios  │   │   Header      │   │
│  Simulate   │   ├───────────────┤   │
│  Reconcile  │   │               │   │
│  Settings   │   │   Content     │   │
│             │   │               │   │
│             │   └───────────────┘   │
└─────────────────────────────────────┘

Tablet (768px - 1023px)
┌────────────────────────────┐
│  Header (hamburger menu)   │
├────────────────────────────┤
│                            │
│        Content             │
│                            │
└────────────────────────────┘

Mobile (< 768px)
┌─────────────────────┐
│  Header             │
├─────────────────────┤
│                     │
│  Content            │
│                     │
├─────────────────────┤
│  Tab Bar (bottom)   │
└─────────────────────┘
```

### 7.2 Mobile 布局

```tsx
// Mobile 底部 Tab 导航
const tabs = [
  { name: '首页', icon: 'home', href: '/' },
  { name: '场景', icon: 'business', href: '/scenarios' },
  { name: '推演', icon: 'calculator', href: '/simulate' },
  { name: '我的', icon: 'person', href: '/profile' },
];
```

---

## 八、动画与交互

### 8.1 过渡效果

```css
/* 按钮点击 */
transition: all 200ms ease;

/* 卡片悬停 */
transition: box-shadow 200ms ease, transform 200ms ease;

/* 页面切换 */
transition: opacity 300ms ease, transform 300ms ease;

/* 数字变化 */
transition: color 500ms ease;
```

### 8.2 微交互

| 场景 | 效果 |
|------|------|
| 按钮点击 | `scale(0.98)` + 背景色变深 |
| 卡片悬停 | `shadow-md` + `translateY(-2px)` |
| 加载状态 | 骨架屏 (Shimmer) |
| 成功保存 | Toast 提示，2秒自动消失 |
| 错误提示 | 输入框抖动 + 红色边框 |
| 数字更新 | 数字滚动动画 (CountUp) |

### 8.3 加载状态

```tsx
// Skeleton 骨架屏
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
  <div className="h-4 bg-gray-200 rounded w-1/2" />
</div>

// Loading Spinner
<div className="flex items-center justify-center py-8">
  <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
</div>
```

---

## 九、响应式断点

```typescript
// Tailwind 断点
const breakpoints = {
  sm: '640px',   // 小屏手机横屏
  md: '768px',   // 平板竖屏
  lg: '1024px',  // 平板横屏 / 小桌面
  xl: '1280px',  // 桌面
  '2xl': '1536px', // 大桌面
};

// 常用响应式模式
// 网格：手机 1 列 → 平板 2 列 → 桌面 3 列
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"

// 侧边栏：手机隐藏 → 桌面显示
className="hidden lg:block w-64"

// 内边距：手机 4 → 平板 6 → 桌面 8
className="p-4 md:p-6 lg:p-8"
```

---

## 十、电表类型 UI 差异化

### 10.1 场景创建流程

```
Step 1: 选择电表类型
┌─────────────────────────────┐
│  选择用电类型               │
│                             │
│  ┌─────┐ ┌─────┐ ┌─────┐ │
│  │ 🏠  │ │ 🏪  │ │ 🏭  │ │
│  │家庭 │ │商业 │ │工业 │ │
│  │蓝色 │ │琥珀 │ │靛蓝 │ │
│  └─────┘ └─────┘ └─────┘ │
└─────────────────────────────┘

Step 2: 填写场景信息（根据类型动态变化）
家庭：户型、面积、家庭成员数
商业：商铺面积、行业、营业时间
工业：变压器容量、产线数量、班次

Step 3: 添加设备（预置库根据类型变化）
```

### 10.2 推演结果展示差异

| 类型 | 展示重点 |
|------|----------|
| 家庭 | 月省金额、年省金额、阶梯档位提醒 |
| 商业 | 分时电价优化建议、营业时段分析 |
| 工业 | 基本电费优化、需量控制建议、功率因数 |

---

## 十一、Dark Mode（未来支持）

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #111827;
    --bg-secondary: #1F2937;
    --bg-tertiary: #374151;
    --text-primary: #F9FAFB;
    --text-secondary: #D1D5DB;
    --text-tertiary: #9CA3AF;
  }
}
```

---

## 十二、设计资源

| 资源 | 链接/说明 |
|------|----------|
| Logo | `./logo_wattpredict.png` |
| 色彩 | Tailwind CSS 默认色板 + 品牌色 |
| 字体 | Inter (Google Fonts) |
| 图标 | Lucide React / Ionicons |
| 组件库 | shadcn/ui |

---

**版本**：v1.0
**更新**：2026-10-13
**适用范围**：Web + Mobile
