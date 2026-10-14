# 瓦特预言 (WattPredict)

跨平台电费推演平台：帮助家庭、商业、工业用户预测和优化电费支出。MVP v0.1 覆盖广东全省。

## 架构

```
apps/web        Next.js 15 仪表盘（场景 / 推演 / 电器 / 账单核对 / 概览）
apps/mobile     React Native + Expo（概览 / 推演 / 电器 / 账单 四页）
packages/
  wattengine    Go 推演引擎（阶梯/分时/两部制 + 账单反推 + 行动建议）
supabase/       数据库迁移（scenarios / appliances / simulation_runs / bills）
docs/           项目文档与 UI 规范
```

## 快速开始

```bash
bun run dev            # 一键同启：瓦特引擎 (:8088) + Web (:3000)
bun run dev:mobile     # 移动端 Expo（真机需配 EXPO_PUBLIC_ENGINE_URL，见 apps/mobile/README.md）
bun run test:engine    # 引擎单元测试
bun run typecheck      # Web 端类型检查
```

Web 端需在 `apps/web/.env.local` 配置 Supabase 与引擎地址（见该文件示例，勿提交）。

## 核心能力

- **电费推演**：广东 2025 核价口径，阶梯（含季节分档）/ 单一制 / 分时 TOU / 工业两部制
- **账单核对**：真实账单反推用电画像，偏差诊断，推演模型持续校准
- **行动建议**：阶梯超档预警、商业分时测算提示、工业容需申报优化
- **电器估算**：22 种预设（占空比校准），30 天月耗，一键带入推演

详细规范见 [CLAUDE.md](CLAUDE.md)。
