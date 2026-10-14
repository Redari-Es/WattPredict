'use server';

import { redirect } from 'next/navigation';
import { ScenarioSchema, BillInputSchema, type SimulationResult, type ReconcileResult } from '@/lib/types';
import type { ScenarioRecord, SimulationRun, BillRecord } from '@/lib/domain';
import { simulate, reconcile } from '@/lib/engine';
import { createClient } from '@/lib/supabase/server';

export type SimulateActionResult =
  | { ok: true; result: SimulationResult }
  | { ok: false; error: string };

export async function simulateScenario(formData: FormData): Promise<SimulateActionResult> {
  const touRaw = formData.get('tou_profile');
  let touProfile: Record<string, number> | undefined;
  if (typeof touRaw === 'string' && touRaw) {
    try {
      touProfile = JSON.parse(touRaw) as Record<string, number>;
    } catch {
      return { ok: false, error: '分时画像格式错误' };
    }
  }

  const parsed = ScenarioSchema.safeParse({
    name: formData.get('name'),
    province: formData.get('province'),
    city: formData.get('city'),
    meter_type: formData.get('meter_type'),
    has_tou: formData.get('has_tou') === 'on' || formData.get('has_tou') === 'true',
    monthly_kwh: formData.get('monthly_kwh'),
    transformer_kva: formData.get('transformer_kva') || undefined,
    demand_kw: formData.get('demand_kw') || undefined,
    tou_profile: touProfile,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') };
  }

  try {
    // 季节阶梯分档：缺省按当前月份
    const result = await simulate({ ...parsed.data, month: parsed.data.month ?? new Date().getMonth() + 1 });
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

/** 保存推演历史（双方案结果） */
export async function saveSimulationRunAction(input: {
  scenario_id: string;
  monthly_kwh: number;
  flat_result: SimulationResult;
  tou_result?: SimulationResult | null;
}): Promise<{ ok: boolean; run?: SimulationRun; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: 'Supabase 未配置' };

  const saving = input.tou_result
    ? Math.round((input.flat_result.total_cost - input.tou_result.total_cost) * 100) / 100
    : null;

  const { data, error } = await supabase
    .from('simulation_runs')
    .insert({ ...input, saving })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, run: data as SimulationRun };
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

// ---------------------------------------------------------------------------
// 账单核对（Reconcile）：真实账单 → 瓦特引擎反推 → 偏差诊断
// ---------------------------------------------------------------------------

export type ReconcileActionResult =
  | { ok: true; result: ReconcileResult }
  | { ok: false; error: string };

/** 调用瓦特引擎核对账单（不落库，仅计算） */
export async function reconcileBill(
  scenario: Pick<ScenarioRecord, 'province' | 'meter_type' | 'transformer_kva' | 'demand_kw'>,
  bill: unknown,
): Promise<ReconcileActionResult> {
  const parsed = BillInputSchema.safeParse(bill);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') };
  }
  const { peak_kwh, flat_kwh, valley_kwh } = parsed.data;
  // 三项明细齐全才传给引擎（缺一则视为无分时明细）
  const hasTouDetail =
    peak_kwh != null && flat_kwh != null && valley_kwh != null &&
    peak_kwh + flat_kwh + valley_kwh > 0;
  // 账期月份 → 季节阶梯分档
  const month = parsed.data.period ? Number(parsed.data.period.split('-')[1]) : undefined;

  try {
    const result = await reconcile({
      province: scenario.province,
      meter_type: scenario.meter_type,
      transformer_kva: scenario.transformer_kva,
      demand_kw: scenario.demand_kw,
      total_kwh: parsed.data.total_kwh,
      total_cost: parsed.data.total_cost,
      month,
      ...(hasTouDetail ? { peak_kwh, flat_kwh, valley_kwh } : {}),
    });
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '瓦特引擎暂不可用' };
  }
}

/** 保存账单（同场景同账期 upsert） */
export async function saveBillAction(input: {
  scenario_id: string;
  period: string;
  total_kwh: number;
  total_cost: number;
  peak_kwh?: number | null;
  flat_kwh?: number | null;
  valley_kwh?: number | null;
}): Promise<{ ok: boolean; bill?: BillRecord; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: 'Supabase 未配置' };

  const { data, error } = await supabase
    .from('bills')
    .upsert(input, { onConflict: 'scenario_id,period' })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, bill: data as BillRecord };
}

/** 删除账单：RLS 限制只能删自己场景下的 */
export async function deleteBillAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: 'Supabase 未配置' };

  const { error } = await supabase.from('bills').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
