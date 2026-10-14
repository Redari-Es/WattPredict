import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardApp } from '@/components/dashboard/DashboardApp';
import type { HeaderUser } from '@/components/dashboard/Header';
import type { ScenarioRecord, ScenarioAppliance, SimulationRun, BillRecord } from '@/lib/domain';

export default async function DashboardPage() {
  const supabase = await createClient();

  let user: HeaderUser;
  let scenarios: ScenarioRecord[] | null = null;
  let appliances: ScenarioAppliance[] | null = null;
  let simulationRuns: SimulationRun[] | null = null;
  let bills: BillRecord[] | null = null;

  if (supabase) {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) redirect('/login');
    user = {
      email: authUser.email ?? '',
      name: (authUser.user_metadata?.full_name as string | undefined) ?? authUser.email ?? '用户',
      avatarUrl: (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
    };

    // 从 Supabase 加载当前用户的场景与电器（RLS 自动按 user_id 过滤）
    const { data } = await supabase
      .from('scenarios')
      .select('*')
      .order('created_at', { ascending: true });
    scenarios = (data as ScenarioRecord[] | null) ?? [];

    const { data: applianceRows } = await supabase.from('appliances').select('*');
    appliances = (applianceRows as ScenarioAppliance[] | null) ?? [];

    const { data: runRows } = await supabase
      .from('simulation_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    simulationRuns = (runRows as SimulationRun[] | null) ?? [];

    const { data: billRows } = await supabase
      .from('bills')
      .select('*')
      .order('period', { ascending: false })
      .limit(100);
    bills = (billRows as BillRecord[] | null) ?? [];
  } else {
    // 开发模式：未配置 Supabase，使用本地演示数据
    user = { email: 'dev@wattpredict.local', name: '开发模式', avatarUrl: null };
  }

  return (
    <DashboardApp
      user={user}
      initialScenarios={scenarios}
      initialAppliances={appliances}
      initialSimulationRuns={simulationRuns}
      initialBills={bills}
    />
  );
}
