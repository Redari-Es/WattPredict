# 瓦特预言 · 移动端 (apps/mobile)

React Native + Expo (SDK 57) + Expo Router。与 Web 端共享瓦特引擎（Go），暗色未来感主题对齐。

## 快速开始

```bash
cd apps/mobile
bun install
bun run start        # 启动 Metro，用 Expo Go 扫码
```

## 引擎地址配置

App 通过 `EXPO_PUBLIC_ENGINE_URL` 连接瓦特引擎（默认 `http://localhost:8088`）：

| 运行环境 | 地址 |
|----------|------|
| iOS 模拟器 | 默认即可（localhost 可用） |
| Android 模拟器 | `EXPO_PUBLIC_ENGINE_URL=http://10.0.2.2:8088` |
| 真机（Expo Go） | `EXPO_PUBLIC_ENGINE_URL=http://<电脑局域网IP>:8088` |

```bash
# 示例：真机调试
EXPO_PUBLIC_ENGINE_URL=http://192.168.1.10:8088 bun run start
```

引擎需要先启动（仓库根目录）：`bun run dev:engine`

## 功能（v1）

- **概览**：瓦特引擎在线状态（30s 轮询）、电器月耗电估算、快捷入口、最近账单
- **推演**：电表类型切换、月电量、峰平谷画像滑块 → 双方案对比 + 行动建议
- **电器**：22 种预设（功率档位/自定义、时长滑块）、30 天月估、引擎实时估价、一键带入推演
- **账单**：录入真实账单（可选峰平谷明细）→ 引擎反推画像 + 偏差诊断 + 历史记录

## 与 Web 端的差异

- v1 数据存本机内存（Zustand），不接 Supabase Auth —— 账单/电器配置不云同步
- 移动端直连瓦特引擎（Web 端走 Server Action 中转）
- 复用 Web 端 80% 的业务定义：类型、默认画像、电器预设、单位换算均为同步移植
