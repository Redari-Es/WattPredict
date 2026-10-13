-- 电器功率因品牌/能效不同而不同：允许每个场景电器覆盖预设默认功率
-- power_w 为 NULL 时使用预设默认功率
alter table public.appliances
  add column power_w numeric check (power_w is null or (power_w > 0 and power_w <= 100000));
