'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AirVent, Refrigerator, Flame, WashingMachine, CookingPot, Monitor, Tv, Car,
  Smartphone, Laptop, Router, Microwave, Fan, Lightbulb, Wind, Gamepad2,
  Projector, Shirt, Soup, ChefHat, Droplets, Heater, Plug,
  Minus, Plus, ArrowLeftRight, Loader2,
} from 'lucide-react';
import { appliancePresets, monthlyKwh } from '@/lib/mock-data';
import { APPLIANCE_CATEGORY_LABELS, type ApplianceCategory } from '@/lib/domain';
import {
  ENERGY_UNITS, POWER_UNITS, convertEnergy, convertPower, formatEnergy, formatPower,
  type EnergyUnit, type PowerUnit,
} from '@/lib/units';
import { simulateScenario } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const ICONS = {
  AirVent, Refrigerator, Flame, WashingMachine, CookingPot, Monitor, Tv, Car,
  Smartphone, Laptop, Router, Microwave, Fan, Lightbulb, Wind, Gamepad2,
  Projector, Shirt, Soup, ChefHat, Droplets, Heater, Plug,
} as const;

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
          1 度 = 1 kWh = 1000 Wh · 1 kW = 1000 W · 能耗(kWh) = 功率(kW) × 时长(h)
        </p>
      </CardContent>
    </Card>
  );
}

export function AppliancesView() {
  const [counts, setCounts] = useState<Record<string, number>>({ ac: 1, fridge: 1, phone: 1, router: 1 });
  const [category, setCategory] = useState<ApplianceCategory | 'all'>('all');
  const [estimate, setEstimate] = useState<{ cost: number } | { error: string } | null>(null);
  const [estimating, setEstimating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const adjust = (id: string, delta: number) =>
    setCounts((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + delta) }));

  const totalKwh = appliancePresets.reduce(
    (sum, p) => sum + monthlyKwh(p, counts[p.id] ?? 0), 0,
  );
  const activeCount = Object.values(counts).filter((n) => n > 0).length;

  // 总量变化时自动调用瓦特引擎估算电费（防抖 600ms）
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (totalKwh <= 0) {
      setEstimate(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setEstimating(true);
      const fd = new FormData();
      fd.set('name', '电器组合估算');
      fd.set('province', 'GD');
      fd.set('city', '广州');
      fd.set('meter_type', 'residential');
      fd.set('has_tou', 'false');
      fd.set('monthly_kwh', String(totalKwh));
      const res = await simulateScenario(fd);
      setEstimate(res.ok ? { cost: res.result.total_cost } : { error: res.error });
      setEstimating(false);
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [totalKwh]);

  const visible = category === 'all'
    ? appliancePresets
    : appliancePresets.filter((p) => p.category === category);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        {/* 汇总 + 瓦特引擎自动估价 */}
        <Card className="glow-cyan border-accent/25 xl:col-span-2">
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-accent/15 p-2.5 text-accent">
                <Plug className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  已选 {activeCount} 类电器 · 预估月耗电
                </p>
                <p className="text-2xl font-bold tracking-tight">
                  {formatEnergy(totalKwh)}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({totalKwh.toFixed(1)} kWh)
                  </span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">瓦特引擎估价（广东居民阶梯）</p>
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
          </CardContent>
        </Card>

        <UnitConverter />
      </div>

      {/* 分类筛选 */}
      <Tabs value={category} onValueChange={(v) => setCategory(v as ApplianceCategory | 'all')}>
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          {Object.entries(APPLIANCE_CATEGORY_LABELS).map(([key, label]) => (
            <TabsTrigger key={key} value={key}>{label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {visible.map((p) => {
          const count = counts[p.id] ?? 0;
          const Icon = ICONS[p.icon as keyof typeof ICONS] ?? Plug;
          return (
            <Card key={p.id} className={count > 0 ? 'border-primary/40' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className={`rounded-lg p-2 ${count > 0 ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => adjust(p.id, -1)} disabled={count === 0}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold">{count}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => adjust(p.id, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="pt-2 text-sm">{p.name}</CardTitle>
                <CardDescription className="text-xs">
                  {formatPower(p.power_w)} · {p.hours_per_day}h/天
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">
                  {count > 0 ? formatEnergy(monthlyKwh(p, count)) : '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  单台 {formatEnergy(monthlyKwh(p))}/月
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
