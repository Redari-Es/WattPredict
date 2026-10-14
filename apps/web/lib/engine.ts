import type { Scenario, SimulationResult, ReconcileResult } from './types';

const ENGINE_URL = process.env.ENGINE_URL ?? 'http://localhost:8088';

export class EngineError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'EngineError';
  }
}

/** 仅在服务端调用（Server Action / Server Component），勿在浏览器中直接使用 */
export async function simulate(payload: Scenario): Promise<SimulationResult> {
  const res = await fetch(`${ENGINE_URL}/api/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'unknown' }));
    throw new EngineError(`瓦特引擎调用失败: ${error.error}`, res.status);
  }

  return res.json() as Promise<SimulationResult>;
}

/** 账单核对请求（引擎 /api/reconcile） */
export interface ReconcilePayload {
  province: string;
  meter_type: Scenario['meter_type'];
  transformer_kva?: number;
  demand_kw?: number;
  total_kwh: number;
  total_cost: number;
  peak_kwh?: number;
  flat_kwh?: number;
  valley_kwh?: number;
}

/** 账单核对：真实账单反推画像（仅服务端调用） */
export async function reconcile(payload: ReconcilePayload): Promise<ReconcileResult> {
  const res = await fetch(`${ENGINE_URL}/api/reconcile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'unknown' }));
    throw new EngineError(`瓦特引擎调用失败: ${error.error}`, res.status);
  }

  return res.json() as Promise<ReconcileResult>;
}
