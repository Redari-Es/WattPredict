<div align="center">

<img src="docs/logo_wattpredict_v3.png" alt="WattPredict Logo" width="160" />

# 瓦特预言 (WattPredict)

**先试算，再行动 —— 把「度」翻译成「元」的电费推演平台**

帮助家庭、商业、工业用户预测和优化电费支出。
MVP v0.1 覆盖广东全省，按 2025 最新核价口径计算。

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca?logo=react)](https://react.dev)
[![Expo](https://img.shields.io/badge/Expo-SDK_57-000020?logo=expo)](https://expo.dev)
[![Go](https://img.shields.io/badge/Go-1.22+-00add8?logo=go)](https://go.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)

</div>

---

## 为什么需要它？

| 维度 | 传统方式 | 瓦特预言 |
|------|----------|----------|
| 用电管理 | 被动记录（看一眼电表） | **主动推演**（先试算再行动） |
| 结果单位 | 度（kWh，无感） | **元**（直接关联钱包） |
| 模型精度 | 静态估算 | **账单校准**，越用越准 |

同一个用户可能同时是：深圳租屋的家庭、经营奶茶店的小业主、投资小工厂的工业用户——三处用电场景完全不同，每处都有独立的省电空间。**场景是价值单元**。

## 核心能力

### ⚡ 电费推演（瓦特引擎 WattEngine）

- **广东 2025 核价口径**：居民阶梯（含夏季/非夏季季节分档）、商业单一制与分时 TOU、工业两部制（容需量电费）
- **高精度结算**：月耗电费、阶梯跨档、峰平谷分段逐档计算
- **单二进制 Go 服务**，冷启动 < 100ms，无状态，可水平扩展

### 🧾 账单核对 · 数据飞轮

- 录入真实账单金额，**反推用电画像**（月耗电量 + 峰谷占比）
- 偏差诊断 + 环比洞察 + 准确度趋势追踪
- 画像带入推演，推演模型**越用越准**——这是产品的护城河

### 💡 行动建议引擎

- 阶梯超档预警（差多少度跨档、多花多少钱）
- 商业分时测算提示（是否值得切换 TOU）
- 工业容需量申报优化建议

### 📱 跨端体验

- **Web**：Next.js 15 仪表盘 —— 概览 / 场景 / 推演 / 电器 / 账单月历热力图
- **移动端**：Expo SDK 57 四页应用（概览 / 推演 / 电器 / 账单）

### 🔌 电器估算

22 种家电预设（占空比校准），30 天月耗一键估算，直接带入推演。

## 系统架构

```
┌─────────────────────────────────────────────────────┐
│  Next.js 15 Web (Vercel)   │   Expo Mobile           │
│  仪表盘 / 账单核对 / 热力图  │   四页随身推演            │
└──────────────┬──────────────────────────┘
               │  Server Actions (隐藏引擎地址)
┌──────────────▼──────────────────────────┐
│  Go 瓦特引擎 WattEngine (:8088, Fly.io)  │
│  阶梯 / 分时 / 两部制 · 账单反推 · 行动建议 │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Supabase (PostgreSQL + Auth + RLS)      │
│  scenarios · appliances · bills          │
└─────────────────────────────────────────┘
```

## 快速开始

```bash
# 一键同启：瓦特引擎 (:8088) + Web (:3000)
bun run dev

# 单独启动
bun run dev:engine      # 仅 Go 引擎
bun run dev:web         # 仅 Web
bun run dev:mobile      # 移动端 Expo（真机需配 EXPO_PUBLIC_ENGINE_URL）

# 质量
bun run test:engine     # 引擎单元测试
bun run typecheck       # Web 类型检查
```

Web 端需在 `apps/web/.env.local` 配置 Supabase 与引擎地址（见该文件示例，勿提交）。
数据库迁移在 `supabase/migrations/`（RLS 策略完整），可用 `scripts/db.sh` 执行。

## 项目结构

```
apps/
  web/                    # Next.js 15 仪表盘
    app/(dashboard)/      # 概览 / 场景 / 推演 / 电器 / 账单核对
    components/ lib/
  mobile/                 # Expo SDK 57 四页应用
packages/
  wattengine/             # Go 推演引擎（端口 8088）
    internal/tariff/      # 计价引擎 + 账单反推 + 规则文件（GD 2025 核价）
    internal/handler/     # POST /api/simulate · /api/reconcile · GET /healthz
supabase/migrations/      # 数据库迁移（RLS 完整）
docs/                     # 项目文档 · UI 规范 · Logo
scripts/                  # dev.sh / db.sh
```

## 技术栈

| 层 | 选型 |
|----|------|
| Web | Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind · shadcn/ui · TanStack Query · Zustand |
| Mobile | React Native · Expo SDK 57 · Expo Router |
| 引擎 | Go 1.22+ · chi/v5 · 无状态单二进制 |
| 数据 | Supabase (PostgreSQL 15 + Auth + RLS) |
| 部署 | Vercel (Web) · Fly.io (引擎) |

## 路线图

- [x] **v0.1** 广东全省 · 三类电表 · 推演 + 账单核对数据飞轮
- [x] **v1** 移动端 App · 账单月历热力图 · 季节阶梯档
- [ ] 上海 / 浙江核价接入 → 全国
- [ ] B 端 SaaS：商铺 / 园区电费托管
- [ ] 远期：VPP 虚拟电厂（聚合负荷参与需求响应）

## 文档

- [项目技术文档 v0.2](docs/瓦特预言_WattPredict_项目文档_v0.2.md) —— 完整技术规范
- [UI 规范](docs/ui-spec.md)
- [CLAUDE.md](CLAUDE.md) —— 开发约定与代码规范

---

**版本**：v0.2 · **License**：待定 · 欢迎 Issue / PR
