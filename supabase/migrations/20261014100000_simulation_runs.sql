-- ============================================================
-- 推演历史：每次「对比推演」保存一条记录（双方案结果）
-- ============================================================

create table public.simulation_runs (
  id           uuid primary key default gen_random_uuid(),
  scenario_id  uuid not null references public.scenarios (id) on delete cascade,
  monthly_kwh  numeric not null check (monthly_kwh >= 0),
  flat_result  jsonb not null,          -- 现行方案（阶梯/单一制）结果
  tou_result   jsonb,                   -- 分时方案结果
  saving       numeric,                 -- 分时方案节省额（flat.total - tou.total，可为负）
  created_at   timestamptz not null default now()
);

create index simulation_runs_scenario_id_idx on public.simulation_runs (scenario_id);
create index simulation_runs_created_at_idx on public.simulation_runs (created_at desc);

-- ---------- RLS：通过场景归属控制权限 ----------
alter table public.simulation_runs enable row level security;

create policy "simulation_runs_select_own" on public.simulation_runs
  for select to authenticated
  using (scenario_id in (
    select id from public.scenarios where (select auth.uid()) = user_id
  ));

create policy "simulation_runs_insert_own" on public.simulation_runs
  for insert to authenticated
  with check (scenario_id in (
    select id from public.scenarios where (select auth.uid()) = user_id
  ));

create policy "simulation_runs_delete_own" on public.simulation_runs
  for delete to authenticated
  using (scenario_id in (
    select id from public.scenarios where (select auth.uid()) = user_id
  ));
