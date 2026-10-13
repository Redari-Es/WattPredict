'use server';

import { redirect } from 'next/navigation';
import { ScenarioSchema, type SimulationResult } from '@/lib/types';
import { simulate } from '@/lib/engine';
import { createClient } from '@/lib/supabase/server';

export type SimulateActionResult =
  | { ok: true; result: SimulationResult }
  | { ok: false; error: string };

export async function simulateScenario(formData: FormData): Promise<SimulateActionResult> {
  const parsed = ScenarioSchema.safeParse({
    name: formData.get('name'),
    province: formData.get('province'),
    city: formData.get('city'),
    meter_type: formData.get('meter_type'),
    has_tou: formData.get('has_tou') === 'on' || formData.get('has_tou') === 'true',
    monthly_kwh: formData.get('monthly_kwh'),
    transformer_kva: formData.get('transformer_kva') || undefined,
    demand_kw: formData.get('demand_kw') || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') };
  }

  try {
    const result = await simulate(parsed.data);
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '瓦特引擎暂不可用' };
  }
}

/** 引擎健康检查（供仪表盘状态徽标轮询） */
export async function getEngineStatus(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const url = process.env.ENGINE_URL ?? 'http://localhost:8088';
    const res = await fetch(`${url}/healthz`, { cache: 'no-store' });
    return { ok: res.ok, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect('/login');
}
