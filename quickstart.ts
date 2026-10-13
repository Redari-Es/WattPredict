/**
 * WattPredict 快速上手示例
 *
 * 演示内容：
 *   1. 核心类型定义（MeterType / Scenario）
 *   2. Zod 运行时校验
 *   3. 调用瓦特引擎（/api/simulate）
 *
 * 运行方式：
 *   ENGINE_URL=http://localhost:8088 bun run quickstart.ts
 *
 * 若未设置 ENGINE_URL，将使用内置的广东居民阶梯电价进行本地演示计算。
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// 1. 类型定义（正式代码中放在 packages/shared/src/types/）
// ---------------------------------------------------------------------------

type MeterType = 'residential' | 'commercial' | 'industrial';

const ScenarioSchema = z.object({
  name: z.string().min(1).max(50),
  province: z.string().length(2), // 如 "GD"
  city: z.string().min(1),
  meter_type: z.enum(['residential', 'commercial', 'industrial']),
  has_tou: z.boolean(),
  monthly_kwh: z.number().positive(),
});

type Scenario = z.infer<typeof ScenarioSchema>;

interface SimulationResult {
  total_cost: number; // 元
  breakdown: Array<{ tier: string; kwh: number; price: number; cost: number }>;
}

// ---------------------------------------------------------------------------
// 2. 引擎调用（正式代码中放在 apps/web/lib/engine.ts）
// ---------------------------------------------------------------------------

class EngineError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'EngineError';
  }
}

async function simulate(scenario: Scenario): Promise<SimulationResult> {
  const engineUrl = process.env.ENGINE_URL;

  if (!engineUrl) {
    console.warn('⚠️  未设置 ENGINE_URL，使用本地演示计算（广东居民阶梯电价）');
    return simulateLocally(scenario);
  }

  const res = await fetch(`${engineUrl}/api/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scenario),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'unknown' }));
    throw new EngineError(`推演失败: ${error.error}`, res.status);
  }

  return res.json() as Promise<SimulationResult>;
}

/** 本地演示：广东居民阶梯电价（2025，第一档 0-260kWh / 0.5889 元等） */
function simulateLocally(scenario: Scenario): SimulationResult {
  const tiers = [
    { tier: '第一档 (0-260 kWh)', limit: 260, price: 0.5889 },
    { tier: '第二档 (261-600 kWh)', limit: 600, price: 0.6389 },
    { tier: '第三档 (600+ kWh)', limit: Infinity, price: 0.8889 },
  ];

  let remaining = scenario.monthly_kwh;
  let prevLimit = 0;
  let total = 0;
  const breakdown: SimulationResult['breakdown'] = [];

  for (const t of tiers) {
    if (remaining <= 0) break;
    const kwh = Math.min(remaining, t.limit - prevLimit);
    const cost = kwh * t.price;
    breakdown.push({ tier: t.tier, kwh, price: t.price, cost });
    total += cost;
    remaining -= kwh;
    prevLimit = t.limit;
  }

  return { total_cost: Number(total.toFixed(2)), breakdown };
}

// ---------------------------------------------------------------------------
// 3. 运行示例
// ---------------------------------------------------------------------------

async function main() {
  // Zod 运行时校验：非法输入会在 parse 阶段直接抛出
  const scenario = ScenarioSchema.parse({
    name: '广州家庭月度用电',
    province: 'GD',
    city: '广州',
    meter_type: 'residential' satisfies MeterType,
    has_tou: false,
    monthly_kwh: 420,
  });

  console.log(`📋 场景: ${scenario.name} (${scenario.meter_type})`);
  console.log(`   用电量: ${scenario.monthly_kwh} kWh\n`);

  const result = await simulate(scenario);

  console.log('💰 推演结果:');
  for (const item of result.breakdown) {
    console.log(
      `   ${item.tier}: ${item.kwh} kWh × ${item.price} 元 = ${item.cost.toFixed(2)} 元`,
    );
  }
  console.log(`   ─────────────────────────────`);
  console.log(`   合计: ${result.total_cost} 元`);
}

main().catch((err: unknown) => {
  if (err instanceof z.ZodError) {
    console.error('❌ 参数校验失败:', err.issues);
  } else if (err instanceof EngineError) {
    console.error(`❌ 引擎错误 (HTTP ${err.status}):`, err.message);
  } else {
    console.error('❌ 未知错误:', err);
  }
  process.exit(1);
});
