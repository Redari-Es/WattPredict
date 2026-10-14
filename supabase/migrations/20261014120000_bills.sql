-- ============================================================
-- 真实电费账单：数据飞轮的锚点（账单核对 / 画像反推的输入）
-- ============================================================

create table public.bills (
  id           uuid primary key default gen_random_uuid(),
  scenario_id  uuid not null references public.scenarios (id) on delete cascade,
  period       text not null,             -- 账期 'YYYY-MM'
  total_kwh    numeric not null check (total_kwh > 0),
  total_cost   numeric not null check (total_cost >= 0),
  -- 分时明细（可选，账单含峰平谷电量时填写，用于反推真实画像）
  peak_kwh     numeric check (peak_kwh >= 0),
  flat_kwh     numeric check (flat_kwh >= 0),
  valley_kwh   numeric check (valley_kwh >= 0),
  created_at   timestamptz not null default now(),
  unique (scenario_id, period)            -- 同一场景同一账期只保留一条
);

create index bills_scenario_id_idx on public.bills (scenario_id);
create index bills_period_idx on public.bills (period desc);

-- ---------- RLS：通过场景归属控制权限 ----------
alter table public.bills enable row level security;

create policy "bills_select_own" on public.bills
  for select to authenticated
  using (scenario_id in (
    select id from public.scenarios where (select auth.uid()) = user_id
  ));

create policy "bills_insert_own" on public.bills
  for insert to authenticated
  with check (scenario_id in (
    select id from public.scenarios where (select auth.uid()) = user_id
  ));

create policy "bills_update_own" on public.bills
  for update to authenticated
  using (scenario_id in (
    select id from public.scenarios where (select auth.uid()) = user_id
  ))
  with check (scenario_id in (
    select id from public.scenarios where (select auth.uid()) = user_id
  ));

create policy "bills_delete_own" on public.bills
  for delete to authenticated
  using (scenario_id in (
    select id from public.scenarios where (select auth.uid()) = user_id
  ));
