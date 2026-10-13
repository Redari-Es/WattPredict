-- ============================================================
-- 场景电器表：每个场景独立的电器组合
-- ============================================================

create table public.appliances (
  id            uuid primary key default gen_random_uuid(),
  scenario_id   uuid not null references public.scenarios (id) on delete cascade,
  preset_id     text not null,                  -- 对应前端电器预设 id（如 'ac'）
  count         integer not null default 1 check (count >= 0),
  hours_per_day numeric not null check (hours_per_day >= 0 and hours_per_day <= 24),
  created_at    timestamptz not null default now(),
  unique (scenario_id, preset_id)
);

create index appliances_scenario_id_idx on public.appliances (scenario_id);

-- ---------- RLS：通过场景归属控制权限 ----------
alter table public.appliances enable row level security;

create policy "appliances_select_own" on public.appliances
  for select to authenticated
  using (scenario_id in (
    select id from public.scenarios where (select auth.uid()) = user_id
  ));

create policy "appliances_insert_own" on public.appliances
  for insert to authenticated
  with check (scenario_id in (
    select id from public.scenarios where (select auth.uid()) = user_id
  ));

create policy "appliances_update_own" on public.appliances
  for update to authenticated
  using (scenario_id in (
    select id from public.scenarios where (select auth.uid()) = user_id
  ))
  with check (scenario_id in (
    select id from public.scenarios where (select auth.uid()) = user_id
  ));

create policy "appliances_delete_own" on public.appliances
  for delete to authenticated
  using (scenario_id in (
    select id from public.scenarios where (select auth.uid()) = user_id
  ));
