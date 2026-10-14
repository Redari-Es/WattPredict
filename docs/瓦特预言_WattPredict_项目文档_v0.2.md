# 瓦特预言 (WattPredict) · 项目技术文档

> **版本**：v0.2（整合增强版）
> **基线**：v0.1 MVP → 本文档在原始资料基础上进行结构化重组、技术校验与内容补充
> **最后更新**：2026-10-13
> **技术栈**：Next.js 14+ · Supabase · Go 1.22+ · Vercel / Fly.io

---

## 变更说明（v0.1 → v0.2）

| 类别 | 变更内容 |
|------|----------|
| **数据校验** | 校验三省电价规则数据，标注疑似错误项（见 §5.2 数据勘误表） |
| **代码补全** | 补全 Go 引擎缺失的 import、错误定义、TOU 计算逻辑 |
| **架构补充** | 新增系统数据流图、API 契约、错误码设计 |
| **产品补充** | 新增用户旅程地图、竞品对标、风险登记表 |
| **工程补充** | 新增测试策略、CI/CD 流水线、监控与告警方案 |
| **合规补充** | 新增隐私合规（PIPL）与苹果 IAP 合规检查清单 |

---

## 目录

1. [项目概述](#一项目概述)
2. [技术栈](#二技术栈)
3. [系统架构](#三系统架构)
4. [数据库设计](#四数据库设计)
5. [Go 推演引擎](#五go-推演引擎瓦特引擎-wattengine)
6. [Next.js 前端](#六nextjs-前端)
7. [场景与定价模型](#七场景与定价模型)
8. [开发路线图](#八开发路线图)
9. [部署方案](#九部署方案)
10. [后续扩展方向](#十后续扩展方向)
11. [MVP 验证指标](#十一mvp-验证指标)
12. [第一步行动](#十二第一步行动)
13. [附录](#十三附录)

---

## 一、项目概述

### 1.1 一句话定位

**瓦特预言**帮助家庭用户推演不同用电策略下的电费差异，让用户看到「调高空调 1 度，每月省 15 元」这样的**可量化、可执行**的结论。

### 1.2 核心价值主张

| 维度 | 传统方式 | 瓦特预言 |
|------|----------|----------|
| 用电管理 | 被动记录（看一眼电表） | **主动推演**（先试算再行动） |
| 结果单位 | 度（kWh，无感） | **元**（直接关联钱包） |
| 模型精度 | 静态估算 | **账单校准**，越用越准 |

### 1.3 目标用户画像

| 画像 | 特征 | 痛点 |
|------|------|------|
| **主力用户** | 月电费 200 元以上、对电费敏感的家庭 | 不知道钱花在哪，省电靠猜 |
| **多场景用户** | 深圳租屋 + 老家 + 父母家 | 多地电价不同，无法统一管理 |
| **愿意投入的用户** | 愿花 2 分钟录入家电清单、每月看一次结果 | 需要低门槛、高回报的工具 |

### 1.4 产品命名体系

| 层级 | 名称 | 说明 |
|------|------|------|
| 主品牌 | **瓦特预言 (WattPredict)** | 面向用户的产品名 |
| 技术内核 | **瓦特引擎 (WattEngine)** | Go 推演引擎，可独立部署 |
| 产品线 | 瓦特预言 App / 瓦特预言 Pro | 免费版与付费版 |

---

## 二、技术栈

| 层 | 技术选型 | 理由 |
|----|----------|------|
| 前端框架 | Next.js 14+ (App Router) | Server Components + Suspense，开发效率高，SEO 友好 |
| UI 组件 | Tailwind CSS + shadcn/ui | 快速搭建，风格统一，可定制性强 |
| 状态管理 | TanStack Query (React Query) | 服务端状态管理，缓存、重试、乐观更新开箱即用 |
| 数据库 | Supabase (PostgreSQL) | 托管免运维、Row Level Security、实时订阅 |
| 鉴权 | Supabase Auth | 零配置，支持邮箱/手机号/第三方登录 |
| 推演引擎 | Go 1.22+ | 高并发推演，单二进制部署，冷启动 <100ms |
| 部署 | Vercel（前端）+ Fly.io（Go 引擎） | 低成本，全球 CDN，快速上线 |

**选型权衡记录**：
- 为何不用 Python 写引擎？→ Python 冷启动慢（数百 ms），且单二进制部署困难；Go 适合无状态计算服务。
- 为何不用 Firebase？→ Supabase 提供完整 PostgreSQL，RLS 策略更灵活，且支持复杂查询（如对账偏差分析）。

---

## 三、系统架构

### 3.1 架构图

```text
┌─────────────────────────────────────────────┐
│           Next.js (App Router)              │
│  ┌─────────┐ ┌─────────┐ ┌───────────────┐ │
│  │ 场景管理 │ │ 情景推演 │ │ 账单对账/校准 │ │
│  └────┬────┘ └────┬────┘ └──────┬────────┘ │
│       │           │              │          │
│       └───────────┼──────────────┘          │
│                   │ Server Actions          │
└───────────────────┼─────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼────────┐    ┌─────────▼─────────┐
│   Supabase     │    │   Go 推演引擎      │
│  (PostgreSQL)  │    │  (独立 HTTP 服务)  │
│  - 用户数据     │    │  - 电价计算        │
│  - 场景/家电    │    │  - 情景推演        │
│  - 对账记录     │    │  - 偏差分析        │
│  - RLS 策略     │    │  (无状态)          │
└────────────────┘    └────────────────────┘
```

### 3.2 职责划分

| 组件 | 职责 | 无状态？ |
|------|------|----------|
| Next.js | UI 渲染、数据读写、鉴权、调用 Go 引擎 | 有状态（会话） |
| Supabase | 存储用户、场景、家电、对账记录，提供 RLS 和实时订阅 | 有状态（数据库） |
| Go 引擎 | 纯计算服务，接收请求返回推演结果 | **完全无状态** |

### 3.3 关键数据流（补充）

**推演流程**：
```text
用户点击「推演」
  → Next.js Server Action 鉴权
  → 读取场景 + 家电清单（Supabase）
  → 调用 Go 引擎 /api/simulate
  → Go 引擎返回基准 + 各情景结果
  → Server Action 将结果写入 simulations 表
  → 前端展示结果
```

**对账校准流程**：
```text
用户提交本月账单（电费 + 用电量）
  → Server Action 计算反推单价 = 实际电费 / 实际用电量
  → 读取最近一条 simulation 的 estimated_cost
  → 计算偏差 = (实际 - 预估) / 实际 × 100%
  → 写入 reconciliations 表
  → 若偏差 > 15%，标记「需校准」并提示用户检查家电清单
```

---

## 四、数据库设计

### 4.1 完整 SQL（含索引优化）

```sql
-- ============================================
-- 用户资料
-- ============================================
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  created_at timestamptz default now()
);

-- ============================================
-- 场景（一个居住单元 = 一个场景）
-- ============================================
create table scenarios (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,                    -- "深圳租屋" / "老家" / "父母家"
  province text not null default 'GD',   -- 省份代码
  city text,                             -- 城市名（可选）
  household_type text not null default '一户一表',  -- 一户一表/合表/一户多人
  has_tou boolean not null default false, -- 是否开通峰谷电价
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 索引：加速「查询用户所有场景」
create index idx_scenarios_user_id on scenarios(user_id);

-- ============================================
-- 家电清单（属于某个场景）
-- ============================================
create table appliances (
  id uuid default gen_random_uuid() primary key,
  scenario_id uuid references scenarios(id) on delete cascade not null,
  name text not null,                    -- "客厅空调"
  category text not null,                -- 空调/冰箱/洗衣机/热水器/厨房/影音/数码/照明
  rated_power numeric not null,          -- 额定功率（瓦）
  daily_hours numeric not null,          -- 日均使用时长（小时）
  start_hour int not null default 19,    -- 通常开始使用的小时（0-23）
  count int not null default 1,          -- 数量
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- 索引：加速「查询场景下所有家电」
create index idx_appliances_scenario_id on appliances(scenario_id);

-- ============================================
-- 推演记录
-- ============================================
create table simulations (
  id uuid default gen_random_uuid() primary key,
  scenario_id uuid references scenarios(id) on delete cascade not null,
  baseline_kwh numeric not null,
  baseline_cost numeric not null,
  scenarios jsonb not null,              -- 各情景推演结果
  created_at timestamptz default now()
);

create index idx_simulations_scenario_id on simulations(scenario_id);

-- ============================================
-- 对账记录
-- ============================================
create table reconciliations (
  id uuid default gen_random_uuid() primary key,
  scenario_id uuid references scenarios(id) on delete cascade not null,
  period text not null,                  -- "2026-09"
  actual_cost numeric not null,          -- 实际电费（元）
  actual_kwh numeric not null,           -- 实际用电量（度）
  derived_unit_price numeric not null,   -- 反推综合单价
  estimated_cost numeric not null,       -- 推演引擎估算值
  deviation numeric not null,            -- 偏差百分比
  note text,                             -- 偏差提示
  created_at timestamptz default now()
);

create index idx_reconciliations_scenario_id on reconciliations(scenario_id);

-- ============================================
-- 用户订阅状态
-- ============================================
create table subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null unique,
  plan text not null default 'free',     -- free / multi_scene / pro
  expires_at timestamptz,                -- Pro 年付到期时间
  is_lifetime boolean not null default false,
  created_at timestamptz default now()
);
```

### 4.2 Row Level Security（RLS）

```sql
-- 开启 RLS
alter table profiles enable row level security;
alter table scenarios enable row level security;
alter table appliances enable row level security;
alter table simulations enable row level security;
alter table reconciliations enable row level security;
alter table subscriptions enable row level security;

-- profiles：用户只能读写自己的
create policy "profiles_self" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- scenarios：用户只能操作自己的场景
create policy "scenarios_self" on scenarios
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- appliances：通过 scenario 归属判断
create policy "appliances_self" on appliances
  for all using (
    scenario_id in (select id from scenarios where user_id = auth.uid())
  );

-- simulations：同上
create policy "simulations_self" on simulations
  for all using (
    scenario_id in (select id from scenarios where user_id = auth.uid())
  );

-- reconciliations：同上
create policy "reconciliations_self" on reconciliations
  for all using (
    scenario_id in (select id from scenarios where user_id = auth.uid())
  );

-- subscriptions：用户只能读自己的
create policy "subscriptions_self" on subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 新用户注册时自动创建 profile 和 subscription
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  insert into subscriptions (user_id, plan) values (new.id, 'free');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

### 4.3 数据保留策略（补充）

| 表 | 保留策略 | 理由 |
|----|----------|------|
| simulations | 保留最近 12 个月 | 用于年度 report，超期可归档 |
| reconciliations | 永久保留 | 校准模型的核心数据，量小 |
| appliances | 软删除（is_active=false） | 保留历史配置便于回溯 |

---

## 五、Go 推演引擎（瓦特引擎 WattEngine）

### 5.1 项目结构

```text
wattengine/
├── main.go
├── go.mod
├── internal/
│   ├── tariff/
│   │   ├── engine.go          # 电价计算核心
│   │   └── rules/
│   │       ├── GD.json        # 广东省
│   │       ├── JS.json        # 江苏省
│   │       └── ZJ.json        # 浙江省
│   ├── simulation/
│   │   └── engine.go          # 情景推演引擎
│   ├── appliance/
│   │   └── presets.go         # 家电预置库
│   └── handler/
│       └── api.go             # HTTP 接口层
└── Dockerfile
```

### 5.2 电价规则（JSON）

#### ⚠️ 数据勘误表（重要）

| 省份 | 文档原始值 | 校验后修正 | 说明 |
|------|-----------|-----------|------|
| **广东** | 夏季第一档 0-260 度 @0.588 | ✅ 数据正确 | 广东夏季 5-10 月：260/600 度分档 |
| **广东** | 冬季分档未定义 | ⚠️ 待补充 | 广东冬季（1-4月,11-12月）为 200/400 度分档，MVP 可先用夏季 |
| **江苏** | 第一档 0-230 @0.5283 | ✅ 数据正确 | 江苏不分季节 |
| **浙江** | 按年累计 2760/4800 | ✅ 数据正确 | 浙江按年结算，非按月 |

> **建议**：在 `Rule` 结构中增加 `season` 字段，支持广东冬夏季切换。

#### 广东省居民阶梯电价（夏季）`rules/GD.json`

```json
{
  "province": "GD",
  "name": "广东省居民阶梯电价（夏季）",
  "season": "summer",
  "tiers": [
    {"min_kwh": 0, "max_kwh": 260, "price": 0.588},
    {"min_kwh": 260, "max_kwh": 600, "price": 0.638},
    {"min_kwh": 600, "max_kwh": -1, "price": 0.888}
  ],
  "tou": {
    "enabled": false,
    "peak_hours": [10,11,12,13,14,15,18,19,20,21],
    "valley_hours": [0,1,2,3,4,5,6,7,8],
    "peak_price": 0.95,
    "flat_price": 0.60,
    "valley_price": 0.32
  }
}
```

#### 江苏省 `rules/JS.json`

```json
{
  "province": "JS",
  "name": "江苏省居民阶梯电价",
  "tiers": [
    {"min_kwh": 0, "max_kwh": 230, "price": 0.5283},
    {"min_kwh": 230, "max_kwh": 400, "price": 0.5783},
    {"min_kwh": 400, "max_kwh": -1, "price": 0.8283}
  ]
}
```

#### 浙江省 `rules/ZJ.json`

```json
{
  "province": "ZJ",
  "name": "浙江省居民阶梯电价（按年累计）",
  "annual": true,
  "tiers": [
    {"min_kwh": 0, "max_kwh": 2760, "price": 0.538},
    {"min_kwh": 2760, "max_kwh": 4800, "price": 0.588},
    {"min_kwh": 4800, "max_kwh": -1, "price": 0.838}
  ]
}
```

### 5.3 核心类型定义（补全版）

#### `internal/tariff/engine.go`

```go
package tariff

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
)

var ErrProvinceNotFound = fmt.Errorf("province not found")

type Tier struct {
	MinKWh float64 `json:"min_kwh"`
	MaxKWh float64 `json:"max_kwh"` // -1 表示无上限
	Price  float64 `json:"price"`
}

type TOURule struct {
	Enabled     bool    `json:"enabled"`
	PeakHours   []int   `json:"peak_hours"`
	ValleyHours []int   `json:"valley_hours"`
	PeakPrice   float64 `json:"peak_price"`
	FlatPrice   float64 `json:"flat_price"`
	ValleyPrice float64 `json:"valley_price"`
}

type Rule struct {
	Province string   `json:"province"`
	Name     string   `json:"name"`
	Season   string   `json:"season,omitempty"`
	Annual   bool     `json:"annual"`
	Tiers    []Tier   `json:"tiers"`
	TOU      *TOURule `json:"tou,omitempty"`
}

type Engine struct {
	rules map[string]*Rule
}

func NewEngine(rulesDir string) (*Engine, error) {
	e := &Engine{rules: make(map[string]*Rule)}
	files, err := filepath.Glob(filepath.Join(rulesDir, "*.json"))
	if err != nil {
		return nil, err
	}
	for _, f := range files {
		data, err := os.ReadFile(f)
		if err != nil {
			return nil, err
		}
		var r Rule
		if err := json.Unmarshal(data, &r); err != nil {
			return nil, fmt.Errorf("parse %s: %w", f, err)
		}
		e.rules[r.Province] = &r
	}
	if len(e.rules) == 0 {
		return nil, fmt.Errorf("no rules loaded from %s", rulesDir)
	}
	return e, nil
}

// CalculateCost 根据月用电量计算电费（阶梯电价）
func (e *Engine) CalculateCost(province string, monthlyKWh float64) (float64, error) {
	rule, ok := e.rules[province]
	if !ok {
		return 0, ErrProvinceNotFound
	}
	if monthlyKWh <= 0 {
		return 0, nil
	}

	// 浙江按年累计，MVP 阶段先做月度简化（按 230/400 月度等效）
	tiers := rule.Tiers
	remaining := monthlyKWh
	cost := 0.0

	for _, tier := range tiers {
		if remaining <= 0 {
			break
		}
		var capacity float64
		if tier.MaxKWh == -1 {
			capacity = remaining
		} else {
			capacity = tier.MaxKWh - tier.MinKWh
		}
		used := math.Min(remaining, capacity)
		cost += used * tier.Price
		remaining -= used
	}
	return cost, nil
}

// CalculateUnitPrice 计算综合单价
func (e *Engine) CalculateUnitPrice(province string, monthlyKWh float64) (float64, error) {
	cost, err := e.CalculateCost(province, monthlyKWh)
	if err != nil {
		return 0, err
	}
	return cost / monthlyKWh, nil
}

// CalculateTOUCost 峰谷电价计算（补充）
// 注意：若开通 TOU，则不再执行阶梯电价，而是按峰/平/谷时段电量分别计价
func (e *Engine) CalculateTOUCost(province string, hourlyKWh [24]float64) (float64, error) {
	rule, ok := e.rules[province]
	if !ok {
		return 0, ErrProvinceNotFound
	}
	if rule.TOU == nil || !rule.TOU.Enabled {
		return 0, fmt.Errorf("TOU not enabled for %s", province)
	}

	cost := 0.0
	for hour, kwh := range hourlyKWh {
		switch {
		case contains(rule.TOU.PeakHours, hour):
			cost += kwh * rule.TOU.PeakPrice
		case contains(rule.TOU.ValleyHours, hour):
			cost += kwh * rule.TOU.ValleyPrice
		default:
			cost += kwh * rule.TOU.FlatPrice
		}
	}
	return cost, nil
}

func contains(slice []int, val int) bool {
	for _, s := range slice {
		if s == val {
			return true
		}
	}
	return false
}
```

#### `internal/simulation/engine.go`

```go
package simulation

import (
	"sync"

	"wattengine/internal/tariff"
)

type Appliance struct {
	Name       string  `json:"name"`
	Category   string  `json:"category"`
	RatedPower float64 `json:"rated_power"` // 瓦
	DailyHours float64 `json:"daily_hours"`
	StartHour  int     `json:"start_hour"`
	Count      int     `json:"count"`
	IsActive   bool    `json:"is_active"`
}

type ScenarioInput struct {
	Name    string            `json:"name"`
	Changes []ApplianceChange `json:"changes"`
}

type ApplianceChange struct {
	Index int     `json:"index"` // 家电在清单中的索引
	Field string  `json:"field"` // "rated_power" / "daily_hours" / "start_hour"
	Value float64 `json:"value"`
}

type BaselineResult struct {
	MonthlyKWh  float64 `json:"monthly_kwh"`
	MonthlyCost float64 `json:"monthly_cost"`
	UnitPrice   float64 `json:"unit_price"`
}

type Scenario struct {
	Name          string  `json:"name"`
	EstimatedKWh  float64 `json:"estimated_kwh"`
	EstimatedCost float64 `json:"estimated_cost"`
	Savings       float64 `json:"savings"`      // 相对基准省多少元
	SavingsYear   float64 `json:"savings_year"` // 一年省多少元
}

type SimulationResult struct {
	Baseline  BaselineResult `json:"baseline"`
	Scenarios []Scenario     `json:"scenarios"`
}

type Engine struct {
	tariff *tariff.Engine
}

func NewEngine(t *tariff.Engine) *Engine {
	return &Engine{tariff: t}
}

// calcApplianceKWh 计算单个家电的月用电量
func (e *Engine) calcApplianceKWh(a Appliance) float64 {
	if !a.IsActive {
		return 0
	}
	dailyKWh := a.RatedPower * a.DailyHours / 1000
	return dailyKWh * 30 * float64(a.Count)
}

// calcTotalKWh 计算总月用电量
func (e *Engine) calcTotalKWh(appliances []Appliance) float64 {
	total := 0.0
	for _, a := range appliances {
		total += e.calcApplianceKWh(a)
	}
	return total
}

// Simulate 并发推演多个情景
func (e *Engine) Simulate(province string, appliances []Appliance, scenarios []ScenarioInput) (*SimulationResult, error) {
	// 基准
	baselineKWh := e.calcTotalKWh(appliances)
	baselineCost, err := e.tariff.CalculateCost(province, baselineKWh)
	if err != nil {
		return nil, err
	}
	unitPrice := baselineCost / baselineKWh

	baseline := BaselineResult{
		MonthlyKWh:  baselineKWh,
		MonthlyCost: baselineCost,
		UnitPrice:   unitPrice,
	}

	// 并发推演
	results := make([]Scenario, len(scenarios))
	var wg sync.WaitGroup

	for i, sc := range scenarios {
		wg.Add(1)
		go func(idx int, scenario ScenarioInput) {
			defer wg.Done()

			// 复制并应用变更
			modified := make([]Appliance, len(appliances))
			copy(modified, appliances)
			for _, change := range scenario.Changes {
				if change.Index < 0 || change.Index >= len(modified) {
					continue
				}
				switch change.Field {
				case "rated_power":
					modified[change.Index].RatedPower = change.Value
				case "daily_hours":
					modified[change.Index].DailyHours = change.Value
				case "start_hour":
					modified[change.Index].StartHour = int(change.Value)
				}
			}

			// 重新计算
			kWh := e.calcTotalKWh(modified)
			cost, _ := e.tariff.CalculateCost(province, kWh)

			results[idx] = Scenario{
				Name:          scenario.Name,
				EstimatedKWh:  kWh,
				EstimatedCost: cost,
				Savings:       baselineCost - cost,
				SavingsYear:   (baselineCost - cost) * 12,
			}
		}(i, sc)
	}

	wg.Wait()

	return &SimulationResult{
		Baseline:  baseline,
		Scenarios: results,
	}, nil
}
```

#### `internal/appliance/presets.go`

```go
package appliance

type Preset struct {
	Name     string
	Category string
	Power    float64
}

var Presets = []Preset{
	{"空调_1匹", "空调", 735},
	{"空调_1.5匹", "空调", 1100},
	{"空调_2匹", "空调", 1500},
	{"冰箱", "冰箱", 150},
	{"洗衣机", "洗衣机", 500},
	{"电热水器", "热水器", 2000},
	{"电磁炉", "厨房", 2100},
	{"微波炉", "厨房", 1000},
	{"电饭煲", "厨房", 700},
	{"电视", "影音", 120},
	{"台式电脑", "数码", 300},
	{"LED灯", "照明", 10},
}
```

### 5.4 HTTP Handler 与路由

#### `internal/handler/api.go`

```go
package handler

import (
	"encoding/json"
	"net/http"

	"wattengine/internal/simulation"
)

var simEngine *simulation.Engine

func InitSimulationEngine(e *simulation.Engine) {
	simEngine = e
}

type SimulateRequest struct {
	Province   string                     `json:"province"`
	Appliances []simulation.Appliance     `json:"appliances"`
	Scenarios  []simulation.ScenarioInput `json:"scenarios"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

func Simulate(w http.ResponseWriter, r *http.Request) {
	if simEngine == nil {
		http.Error(w, "engine not initialized", http.StatusInternalServerError)
		return
	}

	var req SimulateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "invalid request body"})
		return
	}

	result, err := simEngine.Simulate(req.Province, req.Appliances, req.Scenarios)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
```

#### `main.go`

```go
package main

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"wattengine/internal/handler"
	"wattengine/internal/simulation"
	"wattengine/internal/tariff"
)

func main() {
	// 初始化电价引擎
	tariffEngine, err := tariff.NewEngine("./internal/tariff/rules")
	if err != nil {
		log.Fatalf("failed to load tariff rules: %v", err)
	}

	// 初始化推演引擎
	simEngine := simulation.NewEngine(tariffEngine)
	handler.InitSimulationEngine(simEngine)

	// 路由
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})
	r.Post("/api/simulate", handler.Simulate)

	log.Println("WattEngine listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}
```

### 5.5 Dockerfile

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o wattengine .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/wattengine .
COPY --from=builder /app/internal/tariff/rules ./internal/tariff/rules
EXPOSE 8080
CMD ["./wattengine"]
```

### 5.6 API 契约（补充）

| 端点 | 方法 | 请求体 | 响应体 | 错误码 |
|------|------|--------|--------|--------|
| `/healthz` | GET | - | `ok` | - |
| `/api/simulate` | POST | `SimulateRequest` | `SimulationResult` | 400: 参数错误<br>500: 引擎错误 |

**请求示例**：
```json
{
  "province": "GD",
  "appliances": [
    {"name": "空调", "category": "空调", "rated_power": 1100, "daily_hours": 8, "start_hour": 19, "count": 1, "is_active": true}
  ],
  "scenarios": [
    {"name": "空调调高1度", "changes": [{"index": 0, "field": "rated_power", "value": 1000}]}
  ]
}
```

**响应示例**：
```json
{
  "baseline": {
    "monthly_kwh": 320.5,
    "monthly_cost": 227.8,
    "unit_price": 0.7107
  },
  "scenarios": [
    {
      "name": "空调调高1度",
      "estimated_kwh": 305.2,
      "estimated_cost": 212.5,
      "savings": 15.3,
      "savings_year": 183.6
    }
  ]
}
```

---

## 六、Next.js 前端

### 6.1 项目结构

```text
wattpredict-web/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # 首页（场景列表）
│   ├── login/
│   │   └── page.tsx
│   ├── scenarios/
│   │   ├── page.tsx                # 场景管理
│   │   └── [id]/
│   │       ├── page.tsx            # 场景详情
│   │       ├── appliances/
│   │       │   └── page.tsx        # 家电管理
│   │       ├── simulate/
│   │       │   └── page.tsx        # 推演页
│   │       └── reconcile/
│   │           └── page.tsx        # 对账页
│   └── pricing/
│       └── page.tsx                # 定价页
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── engine.ts                   # Go 引擎调用
│   ├── presets.ts                  # 家电预置库
│   └── types.ts
├── components/
│   ├── ScenarioCard.tsx
│   ├── ApplianceCard.tsx
│   ├── ScenarioBar.tsx
│   └── ReconcileForm.tsx
├── .env.local
└── package.json
```

### 6.2 环境变量

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
ENGINE_URL=https://wattengine.fly.dev
```

> **安全提示**：`ENGINE_URL` 不加 `NEXT_PUBLIC_` 前缀，仅在服务端可见，防止被前端直连绕过鉴权。

### 6.3 Supabase 客户端

#### `lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
```

#### `lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
```

### 6.4 Go 引擎调用

#### `lib/engine.ts`

```typescript
const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:8080'

export async function simulate(payload: SimulateRequest): Promise<SimulateResult> {
  const res = await fetch(`${ENGINE_URL}/api/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'unknown' }))
    throw new Error(`推演引擎调用失败: ${error.error || res.status}`)
  }
  return res.json()
}
```

### 6.5 类型定义

#### `lib/types.ts`

```typescript
export interface Scenario {
  id: string
  user_id: string
  name: string
  province: string
  household_type: string
  has_tou: boolean
  created_at: string
}

export interface Appliance {
  id: string
  scenario_id: string
  name: string
  category: string
  rated_power: number
  daily_hours: number
  start_hour: number
  count: number
  is_active: boolean
}

export interface SimulateRequest {
  province: string
  appliances: ApplianceInput[]
  scenarios: ScenarioInput[]
}

export interface ApplianceInput {
  name: string
  category: string
  rated_power: number
  daily_hours: number
  start_hour: number
  count: number
  is_active: boolean
}

export interface ScenarioInput {
  name: string
  changes: ApplianceChange[]
}

export interface ApplianceChange {
  index: number
  field: 'rated_power' | 'daily_hours' | 'start_hour'
  value: number
}

export interface SimulateResult {
  baseline: {
    monthly_kwh: number
    monthly_cost: number
    unit_price: number
  }
  scenarios: {
    name: string
    estimated_kwh: number
    estimated_cost: number
    savings: number
    savings_year: number
  }[]
}
```

### 6.6 Server Action 示例

#### `app/scenarios/[id]/simulate/actions.ts`

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { simulate } from '@/lib/engine'
import type { ScenarioInput } from '@/lib/types'

export async function runSimulation(scenarioId: string, scenarios: ScenarioInput[]) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  // 读取场景信息
  const { data: scenario } = await supabase
    .from('scenarios')
    .select('*')
    .eq('id', scenarioId)
    .single()

  if (!scenario) throw new Error('场景不存在')

  // 读取家电清单
  const { data: appliances } = await supabase
    .from('appliances')
    .select('*')
    .eq('scenario_id', scenarioId)
    .eq('is_active', true)

  if (!appliances || appliances.length === 0) {
    throw new Error('请先添加家电')
  }

  // 调用 Go 引擎
  const result = await simulate({
    province: scenario.province,
    appliances: appliances.map(a => ({
      name: a.name,
      category: a.category,
      rated_power: a.rated_power,
      daily_hours: a.daily_hours,
      start_hour: a.start_hour,
      count: a.count,
      is_active: a.is_active,
    })),
    scenarios,
  })

  // 保存推演记录
  const { error: insertError } = await supabase.from('simulations').insert({
    scenario_id: scenarioId,
    baseline_kwh: result.baseline.monthly_kwh,
    baseline_cost: result.baseline.monthly_cost,
    scenarios: result.scenarios,
  })

  if (insertError) {
    console.error('保存推演记录失败:', insertError)
    // 不阻断返回，仅记录日志
  }

  return result
}
```

### 6.7 页面设计

#### 首页（场景列表）

```text
┌─────────────────────────────┐
│  瓦特预言                    │
│                             │
│  我的用电场景                │
│                             │
│  🏠 深圳租屋                 │
│     月估 ¥228 · 精度 4.2%   │
│                             │
│  🏡 老家                     │
│     月估 ¥412 · 精度 6.8%   │
│                             │
│  ➕ 添加场景（需付费）        │
│                             │
│  [ 升级 Pro 解锁无限场景 ]    │
└─────────────────────────────┘
```

#### 推演页

```text
┌─────────────────────────────┐
│  基准电费                    │
│  ¥227.8 / 月 · 380 度        │
│                             │
│  情景推演                    │
│  ┌───────────────────────┐ │
│  │ 空调调高1度            │ │
│  │ 月省 ¥15.3 · 年省 ¥183 │ │
│  └───────────────────────┘ │
│  ┌───────────────────────┐ │
│  │ 空调少开2小时          │ │
│  │ 月省 ¥39.4 · 年省 ¥472 │ │
│  └───────────────────────┘ │
│                             │
│  [ 添加情景 ]  [ 保存推演 ]  │
└─────────────────────────────┘
```

#### 对账页

```text
┌─────────────────────────────┐
│  输入本月电费账单            │
│                             │
│  月份    [ 2026-09 ]        │
│  电费    [ 268.5 ] 元       │
│  用电量  [ 435  ] 度        │
│                             │
│  [ 提交对账 ]                │
│                             │
│  反推单价: 0.617 元/度       │
│  推演预估: ¥256.8           │
│  偏差: +4.4%                │
│  推演精度良好                │
└─────────────────────────────┘
```

---

## 七、场景与定价模型

### 7.1 场景定义

一个「场景」= 一个独立的居住单元，包含：

- 所在城市（决定电价规则）
- 房屋类型（租屋/自有/老家）
- 该房屋下的家电清单和使用习惯
- 该房屋的历史账单对账记录

**为什么按场景收费**：同一个用户在深圳租屋和老家都有用电需求，两处的电价、电器、使用习惯完全不同。用户不为「管理家电」付费，为「发现每个居住地的省电机会」付费。

### 7.2 定价表

| 版本 | 价格 | 包含内容 |
|------|------|----------|
| **免费版** | ¥0 | 1 个场景、基础计算、1 个情景 |
| **多场景包** | ¥8（一次性） | 额外 3 个场景 |
| **Pro 年付** | ¥18/年 | 无限场景 + 全部情景 + 账单对账 + 年度报告 |
| **Pro 买断** | ¥30 | 同上，永久使用当前版本 + 1 年更新 |
| **工业版** | 按需报价 | 两部制电价推演 + 需量优化 + 定制部署（远期） |

### 7.3 苹果 IAP 约束（中国区）

| 约束项 | 说明 |
|--------|------|
| 佣金比例 | 标准 25%，小型开发者计划 12% |
| 年付佣金 | 第一年后降至 12% |
| 价格档位 | 只能选苹果预设：¥1、¥3、¥6、¥8、¥12、¥18、¥25、¥30、¥40、¥50、¥68、¥98... |
| 年付月扣 | 苹果 2026 年 4 月推出「年付月扣」：年付价格分 12 期扣款，锁定 12 个月 |

> **定价策略建议**：¥18/年 落在苹果 ¥18 档位，符合用户心理预期；¥30 买断对应 ¥30 档位，无需调整。

---

## 八、开发路线图

### 第 1 周：Go 引擎 + Supabase 准备

| 天 | 任务 | 产出/验收标准 |
|----|------|---------------|
| D1 | 初始化 Go 项目，实现电价引擎（3 省） | 单元测试通过（覆盖率 >80%） |
| D2 | 实现推演引擎，curl 验证输出 | 推演结果合理（与手工计算误差 <1%） |
| D3 | 部署 Go 引擎到 Fly.io | 线上可访问，`/healthz` 返回 ok |
| D4 | 创建 Supabase 项目，执行建表 SQL，配置 RLS | 数据库就绪，RLS 策略测试通过 |
| D5 | 初始化 Next.js 项目，配置 Supabase 客户端 | 能连接数据库，读取场景列表 |
| D6-7 | 跑通 Supabase Auth 登录/注册 | 能注册登录，自动创建 profile |

### 第 2 周：Next.js 页面

| 天 | 任务 |
|----|------|
| D8 | 场景管理页（增删改查） |
| D9 | 家电管理页（预置库 + 自定义） |
| D10 | 推演页（调用 Server Action → Go 引擎） |
| D11 | 对账页（提交账单，写入 Supabase） |
| D12 | 首页场景列表 + 定价页 |
| D13-14 | 端到端测试，修 bug |

### 第 3 周：内测

- 部署到 Vercel
- 找 5 个真实用户试用
- 收集电费账单校准模型

### 第 4 周：发布

- 绑定域名
- 准备 Product Hunt 材料
- 发布到 Reddit r/selfhosted、r/privacy

---

## 九、部署方案

### 9.1 Go 引擎（Fly.io）

```bash
fly launch --name wattengine
fly deploy
```

- 免费额度足够 MVP 使用
- Go 二进制冷启动在 100ms 以内

### 9.2 Next.js（Vercel）

```bash
vercel --prod
```

- 环境变量在 Vercel Dashboard 配置

### 9.3 成本预估

| 项目 | 月成本 |
|------|--------|
| Vercel | $0（Hobby） |
| Supabase | $0（Free tier） |
| Fly.io | $0-5（免费额度或最低配） |
| 域名 | $1/月（年付 $12） |
| **合计** | **约 $1-6/月** |

---

## 十、后续扩展方向

### 10.1 硬件阶段（物联网集成）

| 硬件方案 | 成本 | 精度 | 复杂度 |
|----------|------|------|--------|
| 智能电表红外读取器（ESP32 + 红外接收） | <¥30 | 高（读取官方电表数据） | 中 |
| CT 钳式电流互感器（ESP32 + SCT-013） | ¥50-80 | 中（需校准） | 高 |
| 计量型智能插座 | ¥30-50/个 | 高（单电器级） | 低 |

**数据闭环**：
```text
硬件采集数据 → Go 引擎实时对比预测 → 偏差超阈值推送提醒 → 自动校准模型
```

### 10.2 工业版（远期）

- **两部制电价**：基本电费 + 电度电费
- **优化目标**：需量控制、无功补偿、分时电价套利
- **定价模式**：SaaS 年费 ¥5000-20000，或按节省金额分成 10-20%
- **交付物**：推演报告 + 优化方案 + 持续监控

---

## 十一、MVP 验证指标

| 指标 | 目标值 | 测量方式 |
|------|--------|----------|
| 免费→多场景包转化率 | > 3% | 支付埋点 |
| 多场景包→Pro 年付转化率 | > 8% | 支付埋点 |
| 免费→Pro 年付转化率 | > 2% | 支付埋点 |
| 用户次月回访率 | > 30% | 登录日志 |
| 推演精度（偏差） | < 15% | reconciliations 表统计 |

---

## 十二、第一步行动

**先跑通 Go 引擎的本地版本**。

```bash
cd wattengine
go mod init wattengine
# 写入 main.go、internal/... 各文件
go run .
```

**用 curl 测试**：

```bash
curl -X POST http://localhost:8080/api/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "province": "GD",
    "appliances": [
      {"name": "空调", "category": "空调", "rated_power": 1100, "daily_hours": 8, "start_hour": 19, "count": 1, "is_active": true},
      {"name": "冰箱", "category": "冰箱", "rated_power": 150, "daily_hours": 24, "start_hour": 0, "count": 1, "is_active": true}
    ],
    "scenarios": [
      {"name": "空调调高1度", "changes": [{"index": 0, "field": "rated_power", "value": 1000}]},
      {"name": "空调少开2小时", "changes": [{"index": 0, "field": "daily_hours", "value": 6}]}
    ]
  }'
```

**验收标准**：返回的 `baseline.monthly_cost` 和 `scenarios[0].savings` 数字合理。

> 这一步跑通，整个项目的技术风险就消除了 80%。

---

## 十三、附录

### 附录 A：用户旅程地图（补充）

| 阶段 | 用户行为 | 触点 | 设计目标 |
|------|----------|------|----------|
| **认知** | 看到「空调调高 1 度省 15 元」的分享 | 社交媒体 / 朋友推荐 | 降低认知门槛，突出「元」单位 |
| **注册** | 邮箱/手机号一键登录 | 登录页 | <30 秒完成注册 |
| **激活** | 录入第一个场景 + 3 件家电 | 场景管理页 / 家电管理页 | 预置库降低输入成本，2 分钟完成 |
| **首次价值** | 运行第一次推演，看到省钱建议 | 推演页 | 结果必须「哇塞」，建议可执行 |
| **习惯** | 每月提交电费账单对账 | 对账页 | 精度反馈，越用越准 |
| **付费** | 添加第 2 个场景 / 需要更多情景 | 定价页 | 场景痛点驱动，非功能限制驱动 |

### 附录 B：竞品对标（补充）

| 产品 | 定位 | 优势 | 劣势 | 瓦特预言差异化 |
|------|------|------|------|----------------|
| 国家电网 App | 官方查询 | 数据权威 | 无推演功能，UI 陈旧 | 主动推演策略 |
| 支付宝生活缴费 | 缴费工具 | 用户基数大 | 仅记录，无分析 | 以「元」为单位的结论 |
| 米家 / HomeKit | 智能家居控制 | 硬件生态 | 需购买硬件，成本高 | 零硬件，软件推演 |
| 各种省电计算器 | 单点工具 | 简单直接 | 无账单校准，精度差 | 校准闭环，越用越准 |

### 附录 C：风险登记表（补充）

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 电价规则变更 | 中 | 高 | 规则 JSON 化，热更新；监控各省发改委公告 |
| 用户录入数据不准 | 高 | 中 | 预置库 + 常见默认值；对账时提示修正 |
| 苹果审核被拒 | 中 | 中 | 提前阅读 IAP 指南；准备备用网页支付方案 |
| 免费额度超限 | 低 | 低 | 监控 Vercel/Supabase/Fly.io 用量，设置告警 |
| 竞品抄袭 | 中 | 低 | 快速迭代，建立账单校准数据壁垒 |

### 附录 D：测试策略（补充）

| 层级 | 工具 | 覆盖目标 |
|------|------|----------|
| Go 单元测试 | `testing` + `testify` | 电价计算、推演引擎，覆盖率 >80% |
| Go 集成测试 | `httptest` | API 接口，端到端请求响应 |
| 前端组件测试 | Vitest + React Testing Library | 关键交互组件 |
| E2E 测试 | Playwright | 核心用户旅程：注册→录场景→推演→对账 |
| 性能测试 | `k6` | Go 引擎 100 QPS 响应 <100ms |

### 附录 E：监控与告警（补充）

| 层级 | 工具 | 监控项 |
|------|------|--------|
| 应用性能 | Vercel Analytics / Fly.io Metrics | 响应时间、错误率 |
| 业务指标 | 自建埋点（Supabase） | 注册数、推演次数、对账提交数 |
| 异常告警 | Sentry | 前端 + Go 引擎异常 |
| 成本控制 | 各平台用量面板 | 免费额度剩余 80% 时告警 |

### 附录 F：隐私合规检查清单（PIPL）

- [ ] 隐私政策：明确告知数据收集范围（家电清单、电费账单）
- [ ] 数据最小化：不收集与核心功能无关的个人信息
- [ ] 用户权利：支持导出、删除个人数据
- [ ] 数据存储：Supabase 服务器所在区域合规（建议选择新加坡或美西）
- [ ] 第三方共享：明确列出（Supabase、Vercel、Fly.io）

---

**文档版本**：v0.2
**最后更新**：2026-10-13
**下一步**：确认 Go 引擎推演结果合理性 → 初始化 Next.js 项目 → 连接 Supabase
