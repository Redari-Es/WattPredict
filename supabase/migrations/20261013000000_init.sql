-- ============================================================
-- WattPredict 初始 schema：用电场景表 + RLS
-- ============================================================

create table public.scenarios (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 50),
  province        text not null,
  city            text not null,
  meter_type      text not null check (meter_type in ('residential', 'commercial', 'industrial')),
  has_tou         boolean not null default false,
  monthly_kwh     numeric not null check (monthly_kwh >= 0),
  -- 家庭专用
  household_type  text,
  -- 商业专用
  business_type   text,
  -- 工业专用（两部制）
  transformer_kva numeric check (transformer_kva is null or transformer_kva > 0),
  demand_kw       numeric check (demand_kw is null or demand_kw > 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index scenarios_user_id_idx on public.scenarios (user_id);

-- ---------- RLS：用户只能访问自己的场景 ----------
alter table public.scenarios enable row level security;

create policy "scenarios_select_own" on public.scenarios
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "scenarios_insert_own" on public.scenarios
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "scenarios_update_own" on public.scenarios
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "scenarios_delete_own" on public.scenarios
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------- updated_at 自动维护 ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger scenarios_set_updated_at
  before update on public.scenarios
  for each row execute function public.set_updated_at();
