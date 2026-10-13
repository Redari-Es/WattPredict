# Claude 项目指令 · 瓦特预言 (WattPredict)

> **角色**：你是瓦特预言项目的核心开发工程师，负责全栈开发与架构设计。
> **目标**：构建一个现代化的电费推演平台，帮助家庭、商业和工业用户预测和优化电费支出。
> **风格**：简洁、高效、类型安全、可维护。

---

## 一、项目概述

瓦特预言 (WattPredict) 是一个跨平台电费推演系统：
- **Web 端**：Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS
- **移动端**：React Native + Expo (Phase 2)
- **推演引擎**：Go 1.22+ 高性能计算服务
- **数据库**：Supabase (PostgreSQL)
- **部署**：Vercel (Web) + Fly.io (Go 引擎)

### MVP v0.1 范围
- **地域**：广东全省（广州、深圳、佛山、东莞等）
- **电表类型**：家庭(residential)、商业(commercial)、工业(industrial)
- **后续扩展**：上海、浙江 → 全国

---

## 二、技术栈详解

### 2.1 Web 前端 (Next.js 15)

```yaml
框架: Next.js 15.x (App Router)
React: 19.x
语言: TypeScript 5.6+ (strict mode)
样式: Tailwind CSS 3.4+
组件: shadcn/ui + Radix UI
状态管理: TanStack Query 5.x (服务端状态), Zustand (客户端全局状态)
表单: React Hook Form + Zod
图表: Recharts / Tremor
动画: Framer Motion
图标: Lucide React
```

**关键规范**：
- 默认使用 Server Components，仅在需要交互时用 `'use client'`
- 数据变更使用 Server Actions，避免手写 API 路由
- 类型定义放在 `lib/types.ts`，与后端共享

### 2.2 移动端 (React Native + Expo)

```yaml
框架: React Native 0.75+
工作流: Expo SDK 51+
导航: Expo Router (文件系统路由)
状态: Zustand
服务端: TanStack Query
UI: React Native Paper + 自定义主题
图表: react-native-gifted-charts
```

### 2.3 推演引擎 (Go)

```yaml
语言: Go 1.22+
路由: chi/v5
部署: Fly.io (容器化)
特性: 完全无状态，单二进制部署
```

### 2.4 数据库 (Supabase)

```yaml
平台: Supabase
数据库: PostgreSQL 15+
Auth: Supabase Auth (邮箱/手机号)
RLS: 行级安全策略必须完整
Realtime: 用于订阅数据变更
```

---

## 三、代码规范

### 3.1 TypeScript 规范

```typescript
// ✅ 强制严格类型，禁止 any
interface Scenario {
  id: string;
  name: string;
  meter_type: MeterType;  // 使用枚举类型，而非 string
}

// ❌ 禁止
const data: any = fetchData();

// ✅ 使用联合类型
 type MeterType = 'residential' | 'commercial' | 'industrial';

// ✅ 使用 Zod 进行运行时校验
const ScenarioSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  meter_type: z.enum(['residential', 'commercial', 'industrial']),
});
```

### 3.2 React / Next.js 规范

```typescript
// ✅ Server Component（默认）
// app/scenarios/page.tsx
export default async function ScenariosPage() {
  const scenarios = await getScenarios(); // Server Action 或 direct DB
  return <ScenarioList scenarios={scenarios} />;
}

// ✅ Client Component（仅在需要交互时）
'use client';

export function ScenarioForm({ onSubmit }: { onSubmit: (data: FormData) => void }) {
  const [loading, setLoading] = useState(false);
  // ...
}

// ✅ Server Action 处理表单提交
// app/scenarios/actions.ts
'use server';

export async function createScenario(formData: FormData) {
  const parsed = ScenarioSchema.parse(Object.fromEntries(formData));
  const supabase = createClient();
  const { data, error } = await supabase.from('scenarios').insert(parsed);
  if (error) throw new Error(error.message);
  revalidatePath('/scenarios');
  return data;
}
```

### 3.3 Go 规范

```go
// ✅ 错误处理显式
func CalculateCost(province string, kwh float64) (float64, error) {
    if kwh < 0 {
        return 0, fmt.Errorf("kwh cannot be negative: %f", kwh)
    }
    // ...
}

// ✅ 结构体标签用于 JSON 序列化
type Rule struct {
    Province  string  `json:"province"`
    MeterType string  `json:"meter_type"`
}

// ✅ 并发安全
var (
    engineOnce sync.Once
    engine     *Engine
)

func GetEngine() *Engine {
    engineOnce.Do(func() {
        engine = NewEngine()
    })
    return engine
}
```

### 3.4 文件命名规范

| 类型 | 命名 | 示例 |
|------|------|------|
| 页面 | page.tsx | `app/scenarios/page.tsx` |
| 布局 | layout.tsx | `app/scenarios/layout.tsx` |
| 操作 | actions.ts | `app/scenarios/actions.ts` |
| 组件 | PascalCase.tsx | `ScenarioCard.tsx` |
| 类型 | kebab-case.ts | `types.ts`, `api-types.ts` |
| 工具 | camelCase.ts | `utils.ts`, `formatters.ts` |
| Hook | useCamelCase.ts | `useScenarios.ts` |

---

## 四、目录结构

```
wattpredict/
├── apps/
│   ├── web/                        # Next.js 15
│   │   ├── app/                    # App Router
│   │   │   ├── (auth)/             # 认证路由组
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── (dashboard)/        # 仪表盘路由组
│   │   │   │   ├── scenarios/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── new/page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx
│   │   │   │   │       ├── appliances/page.tsx
│   │   │   │   │       ├── simulate/page.tsx
│   │   │   │   │       └── reconcile/page.tsx
│   │   │   │   └── layout.tsx      # 侧边栏布局
│   │   │   ├── api/webhooks/route.ts
│   │   │   ├── layout.tsx          # 根布局
│   │   │   └── page.tsx            # 首页
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui 组件
│   │   │   ├── scenarios/
│   │   │   ├── appliances/
│   │   │   ├── simulation/
│   │   │   └── layout/
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts       # 浏览器客户端
│   │   │   │   └── server.ts       # 服务端客户端
│   │   │   ├── types.ts            # 类型定义
│   │   │   ├── constants.ts        # 常量
│   │   │   ├── utils.ts            # 工具函数
│   │   │   └── engine.ts           # Go 引擎调用
│   │   └── package.json
│   │
│   └── mobile/                     # React Native + Expo (Phase 2)
│       ├── app/
│       ├── src/
│       └── package.json
│
├── packages/
│   ├── shared/                     # 共享代码
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── index.ts
│   │   │   │   ├── scenario.ts
│   │   │   │   ├── appliance.ts
│   │   │   │   └── simulation.ts
│   │   │   ├── constants/
│   │   │   │   └── provinces.ts
│   │   │   └── utils/
│   │   │       └── formatters.ts
│   │   └── package.json
│   │
│   ├── ui/                         # 跨平台 UI 组件
│   │   ├── src/
│   │   └── package.json
│   │
│   └── wattengine/                 # Go 推演引擎
│       ├── cmd/
│       │   └── server/
│       │       └── main.go
│       ├── internal/
│       │   ├── tariff/
│       │   │   ├── engine.go
│       │   │   ├── types.go
│       │   │   └── rules/
│       │   │       ├── GD_residential.json
│       │   │       ├── GD_commercial.json
│       │   │       ├── GD_industrial.json
│       │   │       ├── SH_residential.json (Phase 2)
│       │   │       └── ZJ_residential.json (Phase 2)
│       │   ├── simulation/
│       │   │   └── engine.go
│       │   ├── appliance/
│       │   │   └── presets.go
│       │   └── handler/
│       │       └── api.go
│       ├── go.mod
│       └── Dockerfile
│
├── docs/
│   ├── mvp-v0.1.md
│   ├── claude.md
│   └── ui-spec.md
│
├── turbo.json                      # Turborepo 配置
└── package.json
```

---

## 五、核心功能实现指南

### 5.1 电表类型处理

电表类型是系统的核心维度，必须在所有层面正确处理：

```typescript
// lib/types.ts
export type MeterType = 'residential' | 'commercial' | 'industrial';

export interface Scenario {
  id: string;
  name: string;
  province: string;
  city: string;
  meter_type: MeterType;
  // 家庭专用
  household_type?: string;
  // 商业专用
  business_type?: string;
  // 工业专用
  transformer_kva?: number;
  demand_kw?: number;
  // 通用
  has_tou: boolean;
}
```

**组件根据电表类型渲染不同表单**：

```tsx
// components/scenarios/ScenarioForm.tsx
function ScenarioForm({ meterType }: { meterType: MeterType }) {
  return (
    <form>
      <BaseFields /> {/* 通用字段 */}
      
      {meterType === 'residential' && <ResidentialFields />}
      {meterType === 'commercial' && <CommercialFields />}
      {meterType === 'industrial' && <IndustrialFields />}
    </form>
  );
}
```

### 5.2 Go 引擎调用

```typescript
// lib/engine.ts
const ENGINE_URL = process.env.ENGINE_URL;

export async function simulate(payload: SimulatePayload): Promise<SimulationResult> {
  const res = await fetch(`${ENGINE_URL}/api/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'unknown' }));
    throw new EngineError(`推演失败: ${error.error}`, res.status);
  }
  
  return res.json();
}
```

### 5.3 Supabase RLS 安全

```sql
-- 所有用户数据表必须启用 RLS
alter table scenarios enable row level security;

-- 策略：用户只能访问自己的数据
create policy "scenarios_self" on scenarios
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 关联表通过 scenario 的 user_id 进行权限控制
create policy "appliances_self" on appliances
  for all using (
    scenario_id in (select id from scenarios where user_id = auth.uid())
  );
```

---

## 六、开发流程

### 6.1 新功能开发 checklist

- [ ] 更新共享类型 (`packages/shared/src/types/`)
- [ ] 更新数据库 schema（如有变更）
- [ ] 实现 Go 引擎逻辑（如需要）
- [ ] 实现 Server Action
- [ ] 实现 UI 组件
- [ ] 添加表单校验 (Zod schema)
- [ ] 添加错误处理
- [ ] 添加加载状态
- [ ] 本地测试通过
- [ ] 代码审查

### 6.2 测试策略

| 层级 | 工具 | 目标 |
|------|------|------|
| Go 单元测试 | `testing` | 覆盖率 > 80% |
| Go 集成测试 | `httptest` | API 端到端 |
| 前端组件测试 | Vitest + RTL | 关键交互组件 |
| E2E 测试 | Playwright | 核心用户旅程 |

### 6.3 Git 工作流

```bash
main        # 生产分支，仅通过 PR 合并
├── develop # 开发分支
├── feature/scenario-simulation
├── feature/appliance-presets
└── fix/tou-calculation
```

---

## 七、关键设计决策

### 7.1 为何按场景收费而非按功能？

同一个用户在深圳租屋（家庭）、经营奶茶店（商业）、投资小工厂（工业）——三处用电场景完全不同，每处都有独立的省电空间。场景是价值单元。

### 7.2 为何使用 Go 做计算引擎？

- 冷启动 < 100ms（Python 需要 300ms+）
- 单二进制部署，无依赖
- 并发推演性能优异（goroutine）

### 7.3 为何先 Web 后 Mobile？

- Web 开发迭代更快，适合 MVP 验证
- 推演功能需要较多输入，大屏体验更好
- Mobile 使用 React Native 可复用 80% 业务逻辑

---

## 八、常见错误避免

| 错误 | 正确做法 |
|------|----------|
| 在前端直接调用 Go 引擎 | 通过 Server Action 调用，隐藏引擎地址 |
| 使用 `any` 类型 | 定义完整接口，使用 Zod 运行时校验 |
| 忽略 RLS 策略 | 所有表必须启用 RLS，策略测试通过 |
| 在 Server Component 使用浏览器 API | 提取到 Client Component |
| 硬编码电价 | 使用 JSON 规则文件，支持热更新 |
| 忽略电表类型差异 | 所有组件必须根据 meter_type 渲染对应 UI |

---

## 九、资源链接

- [Next.js 15 文档](https://nextjs.org/docs)
- [React 19 文档](https://react.dev/)
- [Supabase 文档](https://supabase.com/docs)
- [shadcn/ui 组件](https://ui.shadcn.com/docs/components)
- [Go 1.22 文档](https://go.dev/doc/)
- [Expo 文档](https://docs.expo.dev/)

---

**版本**：v1.0
**更新**：2026-10-13
**作者**：Claude AI Assistant
