'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AirVent, Refrigerator, Flame, WashingMachine, CookingPot, Monitor, Tv, Car,
  Smartphone, Laptop, Router, Microwave, Fan, Lightbulb, Wind, Gamepad2,
  Projector, Shirt, Soup, ChefHat, Droplets, Heater, Plug,
  Minus, Plus, ArrowLeftRight, Loader2, CloudCheck, HardDrive, Calculator,
} from 'lucide-react';
import { appliancePresets } from '@/lib/mock-data';
import { APPLIANCE_CATEGORY_LABELS, METER_TYPE_LABELS, type ApplianceCategory } from '@/lib/domain';
import {
  ENERGY_UNITS, POWER_UNITS, convertEnergy, convertPower, formatEnergy, formatPower,
  monthlyEnergyKwh, type EnergyUnit, type PowerUnit,
} from '@/lib/units';
import { saveAppliancesAction, simulateScenario } from '@/app/actions';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { useDashboardStore } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const ICONS = {
  AirVent, Refrigerator, Flame, WashingMachine, CookingPot, Monitor, Tv, Car,
  Smartphone, Laptop, Router, Microwave, Fan, Lightbulb, Wind, Gamepad2,
  Projector, Shirt, Soup, ChefHat, Droplets, Heater, Plug,
} as const;

const DAYS_PER_MONTH = 30;

/** 单位换算器：功率（W↔kW）与电量（Wh↔kWh↔度）自动互转 */
function UnitConverter() {
  const [powerVal, setPowerVal] = useState('1100');
  const [powerFrom, setPowerFrom] = useState<PowerUnit>('W');
  const [powerTo, setPowerTo] = useState<PowerUnit>('kW');
  const [energyVal, setEnergyVal] = useState('420');
  const [energyFrom, setEnergyFrom] = useState<EnergyUnit>('kWh');
  const [energyTo, setEnergyTo] = useState<EnergyUnit>('度');

  const powerResult = useMemo(() => {
    const v = Number(powerVal);
    return Number.isFinite(v) ? convertPower(v, powerFrom, powerTo) : NaN;
  }, [powerVal, powerFrom, powerTo]);

  const energyResult = useMemo(() => {
    const v = Number(energyVal);
    return Number.isFinite(v) ? convertEnergy(v, energyFrom, energyTo) : NaN;
  }, [energyVal, energyFrom, energyTo]);

  const fmt = (n: number) => (Number.isFinite(n) ? String(Number(n.toFixed(4))) : '—');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ArrowLeftRight className="h-4 w-4 text-accent" /> 单位换算
        </CardTitle>
        <CardDescription className="text-xs">功率 / 电量自动换算</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {([
          { val: powerVal, setVal: setPowerVal, from: powerFrom, setFrom: setPowerFrom, to: powerTo, setTo: setPowerTo, units: POWER_UNITS, result: powerResult },
          { val: energyVal, setVal: setEnergyVal, from: energyFrom, setFrom: setEnergyFrom, to: energyTo, setTo: setEnergyTo, units: ENERGY_UNITS, result: energyResult },
        ] as const).map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={row.val}
              onChange={(e) => row.setVal(e.target.value)}
              type="number" min="0" step="any"
              className="h-8 w-24 text-sm"
            />
            <Select value={row.from} onValueChange={(v) => row.setFrom(v as never)}>
              <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {row.units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">→</span>
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-accent">
              {fmt(row.result)}
            </p>
            <Select value={row.to} onValueChange={(v) => row.setTo(v as never)}>
              <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {row.units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ))}
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          1 度 = 1 kWh = 1000 Wh · 1 kW = 1000 W · 月耗电 = 功率 × 时长 × {DAYS_PER_MONTH} 天
        </p>
      </CardContent>
    </Card>
  );
}

export function AppliancesView() {
  const { scenarios, appliances, setAppliance, startSimulation } = useDashboardStore();
  const [scenarioId, setScenarioId] = useState(scenarios[0]?.id ?? '');
  const [category, setCategory] = useState<ApplianceCategory | 'all'>('all');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [estimate, setEstimate] = useState<{ cost: number } | { error: string } | null>(null);
  const [estimating, setEstimating] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const estimateTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const cloud = isSupabaseConfigured();
  const scenario = scenarios.find((s) => s.id === scenarioId);
  const scenarioAppliances = appliances[scenarioId] ?? [];

  /** 电器当前状态：数量、时长、功率（优先自定义值，否则预设默认） */
  const getState = (presetId: string, defaultHours: number, defaultPower: number) => {
    const found = scenarioAppliances.find((a) => a.preset_id === presetId);
    return {
      count: found?.count ?? 0,
      hours: found?.hours_per_day ?? defaultHours,
      powerW: found?.power_w ?? defaultPower,
    };
  };

  // 月耗电总量（自定义功率 × 时长 × 30 天 × 数量）
  const totalKwh = useMemo(
    () =>
      scenarioAppliances.reduce((sum, a) => {
        const preset = appliancePresets.find((p) => p.id === a.preset_id);
        const powerW = a.power_w ?? preset?.power_w;
        return powerW ? sum + monthlyEnergyKwh(powerW, a.hours_per_day) * a.count : sum;
      }, 0),
    [scenarioAppliances],
  );
  const activeCount = scenarioAppliances.filter((a) => a.count > 0).length;

  /** 修改电器（更新 store + 防抖自动保存到云端） */
  function update(
    presetId: string,
    patch: { count?: number; hoursPerDay?: number; powerW?: number | null },
  ) {
    setAppliance(scenarioId, presetId, patch);
    if (!cloud || !scenarioId) return;
    setSaveState('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      // 从 store 读最新状态（此时 setAppliance 已生效）
      const items = useDashboardStore.getState().appliances[scenarioId] ?? [];
      const res = await saveAppliancesAction(
        scenarioId,
        items.map((a) => ({
          preset_id: a.preset_id,
          count: a.count,
          hours_per_day: a.hours_per_day,
          power_w: a.power_w ?? null,
        })),
      );
      setSaveState(res.ok ? 'saved' : 'error');
      setTimeout(() => setSaveState('idle'), 2000);
    }, 800);
  }

  // 总量变化时自动调用瓦特引擎按当前场景电价估价（防抖 800ms）
  useEffect(() => {
    if (estimateTimer.current) clearTimeout(estimateTimer.current);
    if (totalKwh <= 0 || !scenario) {
      setEstimate(null);
      return;
    }
    estimateTimer.current = setTimeout(async () => {
      setEstimating(true);
      const fd = new FormData();
      fd.set('name', `${scenario.name}·电器估算`);
      fd.set('province', scenario.province);
      fd.set('city', scenario.city);
      fd.set('meter_type', scenario.meter_type);
      fd.set('has_tou', String(scenario.has_tou));
      fd.set('monthly_kwh', String(Math.round(totalKwh * 10) / 10));
      if (scenario.transformer_kva) fd.set('transformer_kva', String(scenario.transformer_kva));
      if (scenario.demand_kw) fd.set('demand_kw', String(scenario.demand_kw));
      const res = await simulateScenario(fd);
      setEstimate(res.ok ? { cost: res.result.total_cost } : { error: res.error });
      setEstimating(false);
    }, 800);
    return () => {
      if (estimateTimer.current) clearTimeout(estimateTimer.current);
    };
  }, [totalKwh, scenario]);

  const visible = category === 'all'
    ? appliancePresets
    : appliancePresets.filter((p) => p.category === category);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        {/* 场景选择 + 汇总 + 估价 */}
        <Card className="glow-cyan border-accent/25 xl:col-span-2">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Label className="shrink-0 text-sm text-muted-foreground">所属场景</Label>
                <Select value={scenarioId} onValueChange={setScenarioId}>
                  <SelectTrigger className="h-9 w-52">
                    <SelectValue placeholder="选择场景" />
                  </SelectTrigger>
                  <SelectContent>
                    {scenarios.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} · {METER_TYPE_LABELS[s.meter_type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* 保存状态 */}
              {cloud && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {saveState === 'saving' && <><Loader2 className="h-3.5 w-3.5 animate-spin" /> 保存中…</>}
                  {saveState === 'saved' && <><CloudCheck className="h-3.5 w-3.5 text-accent" /> 已保存到云端</>}
                  {saveState === 'error' && <span className="text-destructive">保存失败</span>}
                  {saveState === 'idle' && <><HardDrive className="h-3.5 w-3.5" /> 自动保存已开启</>}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent/15 p-2.5 text-accent">
                  <Plug className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    已选 {activeCount} 类电器 · 按 {DAYS_PER_MONTH} 天/月估算
                  </p>
                  <p className="text-2xl font-bold tracking-tight">
                    {formatEnergy(totalKwh)}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({totalKwh.toFixed(1)} kWh/月)
                    </span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">瓦特引擎估价</p>
                <p className="mt-1 text-xl font-bold text-primary">
                  {estimating ? (
                    <Loader2 className="ml-auto h-5 w-5 animate-spin" />
                  ) : estimate && 'cost' in estimate ? (
                    `¥${estimate.cost.toFixed(2)}`
                  ) : estimate && 'error' in estimate ? (
                    <span className="text-sm font-normal text-destructive">引擎离线</span>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
            </div>

            {/* 一键带入推演：用电器总耗电作为推演电量 */}
            <Button
              variant="outline"
              className="w-full"
              disabled={totalKwh <= 0 || !scenario}
              onClick={() => startSimulation(scenarioId, Math.round(totalKwh * 10) / 10)}
            >
              <Calculator /> 带入推演（{formatEnergy(totalKwh)}）
            </Button>
          </CardContent>
        </Card>

        <UnitConverter />
      </div>

      {/* 分类筛选 */}
      <div className="overflow-x-auto">
        <Tabs value={category} onValueChange={(v) => setCategory(v as ApplianceCategory | 'all')}>
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            {Object.entries(APPLIANCE_CATEGORY_LABELS).map(([key, label]) => (
              <TabsTrigger key={key} value={key}>{label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {visible.map((p) => {
          const { count, hours, powerW } = getState(p.id, p.hours_per_day, p.power_w);
          const Icon = ICONS[p.icon as keyof typeof ICONS] ?? Plug;
          const itemKwh = monthlyEnergyKwh(powerW, hours) * count;
          const active = count > 0;
          return (
            <Card key={p.id} className={active ? 'border-primary/40' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className={`rounded-lg p-2 ${active ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7"
                      onClick={() => update(p.id, { count: Math.max(0, count - 1) })}
                      disabled={!active}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold">{count}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7"
                      onClick={() => update(p.id, { count: count + 1 })}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="pt-2 text-sm">{p.name}</CardTitle>
                <CardDescription className="text-xs">
                  功率可选档/自定义 · 时长滑块
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* 功率：档位快捷选择 + 手动输入 */}
                <div className="space-y-1.5">
                  {p.power_options && (
                    <div className="flex flex-wrap gap-1">
                      {p.power_options.map((opt) => (
                        <button
                          key={opt.label}
                          onClick={() => update(p.id, { powerW: opt.power_w })}
                          disabled={!active}
                          className={`rounded border px-1.5 py-0.5 text-[10px] transition-colors disabled:opacity-40 ${
                            powerW === opt.power_w
                              ? 'border-primary/60 bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:bg-secondary'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>功率</span>
                    <Input
                      type="number" min="1" step="1"
                      value={powerW}
                      onChange={(e) => {
                        const w = Number(e.target.value);
                        if (Number.isFinite(w) && w > 0) update(p.id, { powerW: w });
                      }}
                      className="h-7 w-20 px-2 text-xs"
                      disabled={!active}
                    />
                    <span>W（{formatPower(powerW)}）</span>
                  </div>
                </div>

                {/* 时长：滑动控件，0-24h，步进 0.5h */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>每日使用</span>
                    <span className="font-medium text-foreground">{hours} 小时</span>
                  </div>
                  <Slider
                    value={[hours]}
                    onValueChange={([h]) => update(p.id, { hoursPerDay: h })}
                    min={0} max={24} step={0.5}
                    disabled={!active}
                  />
                </div>

                <div className="border-t border-border/60 pt-2">
                  <p className="text-lg font-semibold">
                    {active ? formatEnergy(itemKwh) : '—'}
                    {active && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">/月</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    单台 {formatEnergy(monthlyEnergyKwh(powerW, hours))}/月
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
