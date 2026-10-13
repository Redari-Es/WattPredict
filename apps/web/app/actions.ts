'use server';

import { redirect } from 'next/navigation';
import { ScenarioSchema, type SimulationResult } from '@/lib/types';
import type { ScenarioRecord } from '@/lib/domain';
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

// ---------------------------------------------------------------------------
// 场景持久化（Supabase + RLS）
// ---------------------------------------------------------------------------

export type ScenarioActionResult =
  | { ok: true; scenario: ScenarioRecord }
  | { ok: false; error: string };

/** 创建场景：user_id 由服务端从会话注入，RLS 双重保证 */
export async function createScenarioAction(
  input: Omit<ScenarioRecord, 'id'>,
): Promise<ScenarioActionResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: 'Supabase 未配置' };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '未登录' };

  const { data, error } = await supabase
    .from('scenarios')
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, scenario: data as ScenarioRecord };
}

/** 删除场景：RLS 限制只能删自己的 */
export async function deleteScenarioAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: 'Supabase 未配置' };

  const { error } = await supabase.from('scenarios').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** 保存某场景的电器组合（整体替换：删除旧的，写入 count > 0 的） */
export async function saveAppliancesAction(
  scenarioId: string,
  items: { preset_id: string; count: number; hours_per_day: number; power_w?: number | null }[],
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: 'Supabase 未配置' };

  const { error: delError } = await supabase
    .from('appliances')
    .delete()
    .eq('scenario_id', scenarioId);
  if (delError) return { ok: false, error: delError.message };

  const rows = items
    .filter((i) => i.count > 0)
    .map((i) => ({ scenario_id: scenarioId, ...i }));
  if (rows.length > 0) {
    const { error } = await supabase.from('appliances').insert(rows);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}
