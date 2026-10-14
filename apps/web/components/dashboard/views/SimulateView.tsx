'use client';

import { useState, useTransition } from 'react';
import { Play, Loader2, AlertCircle, Lightbulb, TrendingDown, TrendingUp } from 'lucide-react';
import { simulateScenario, saveSimulationRunAction, type SimulateActionResult } from '@/app/actions';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { useDashboardStore } from '@/lib/store';
import { METER_TYPE_LABELS, DEFAULT_TOU_PROFILE, type ScenarioRecord } from '@/lib/domain';
import { formatEnergy } from '@/lib/units';
import type { SimulationResult } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const SEG_COLORS = ['hsl(43 96% 56%)', 'hsl(187 92% 50%)', 'hsl(262 83% 65%)', 'hsl(152 69% 45%)'];

interface PlanSegment {
  label: string;
  sub: string;
  kwh: number;
  cost: number;
}

/** 从推演结果提取可视化分段（阶梯明细或分时明细） */
function segmentsOf(r: SimulationResult): PlanSegment[] {
  if (r.tou && r.tou.length > 0) {
    return r.tou.map((t) => ({
      label: `${t.name}段`,
      sub: `${t.hours} · ${t.price} 元`,
      kwh: t.kwh,
      cost: t.cost,
    }));
  }
  return r.breakdown.map((b) => ({
    label: b.tier,
    sub: `${b.price} 元`,
    kwh: b.kwh,
    cost: b.cost,
  }));
}

function buildFormData(
  s: ScenarioRecord,
  kwh: string,
  hasTou: boolean,
  touProfile: Record<string, number>,
): FormData {
  const fd = new FormData();
  fd.set('name', s.name);
  fd.set('province', s.province);
  fd.set('city', s.city);
  fd.set('meter_type', s.meter_type);
  fd.set('has_tou', String(hasTou));
  fd.set('monthly_kwh', kwh);
  if (s.transformer_kva) fd.set('transformer_kva', String(s.transformer_kva));
  if (s.demand_kw) fd.set('demand_kw', String(s.demand_kw));
  if (hasTou) fd.set('tou_profile', JSON.stringify(touProfile));
  return fd;
}

function PlanCard({
  title, result, highlight,
}: { title: string; result: SimulationResult; highlight: boolean }) {
  const segments = segmentsOf(result);
  return (
    <div
      className={`rounded-xl border p-5 ${
        highlight ? 'glow-amber border-primary/40 bg-primary/5' : 'border-border/60'
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {highlight && <Badge variant="amber">推荐</Badge>}
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight">¥{result.total_cost.toFixed(2)}</p>
      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        <p>电度电费 ¥{result.energy_cost.toFixed(2)}</p>
        {result.basic_fee != null && result.basic_fee > 0 && (
          <p>基本电费（两部制）¥{result.basic_fee.toFixed(2)}</p>
        )}
      </div>

      {/* 费用构成条 */}
      <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-secondary">
        {segments.map((s, i) => (
          <div
            key={s.label}
            style={{
              width: `${(s.cost / result.energy_cost) * 100}%`,
              background: SEG_COLORS[i % SEG_COLORS.length],
            }}
          />
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {segments.map((s, i) => (
          <li key={s.label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: SEG_COLORS[i % SEG_COLORS.length] }}
              />
              {s.label}
              <span className="text-muted-foreground">{s.sub}</span>
            </span>
            <span className="font-medium">
              {formatEnergy(s.kwh)} · ¥{s.cost.toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SimulateView() {
  const { scenarios, simScenarioId, simKwh, simTouProfile, addSimulationRun } = useDashboardStore();
  const [scenarioId, setScenarioId] = useState(simScenarioId ?? scenarios[0]?.id ?? '');
  const [kwh, setKwh] = useState(String(simKwh ?? scenarios[0]?.monthly_kwh ?? 420));
  const [pending, startTransition] = useTransition();
  const [flat, setFlat] = useState<SimulateActionResult | null>(null);
  const [tou, setTou] = useState<SimulateActionResult | null>(null);

  const scenario = scenarios.find((s) => s.id === scenarioId);
  const meterType = scenario?.meter_type ?? 'residential';
  // 账单核对带入的真实画像优先，否则用电表类型默认画像
  const [touProfile, setTouProfile] = useState<Record<string, number>>(
    simTouProfile ? { ...simTouProfile } : { ...DEFAULT_TOU_PROFILE[meterType] },
  );

  // 切换场景（电表类型变化）时重置画像为该类型默认值
  const [prevMeterType, setPrevMeterType] = useState(meterType);
  if (meterType !== prevMeterType) {
    setPrevMeterType(meterType);
    setTouProfile({ ...DEFAULT_TOU_PROFILE[meterType] });
  }

  const profileSum = Object.values(touProfile).reduce((a, b) => a + b, 0);

  function run() {
    if (!scenario) return;
    startTransition(async () => {
      // 并行推演两种方案：现行（阶梯/单一制）vs 分时（TOU，带自定义画像）
      const [flatRes, touRes] = await Promise.all([
        simulateScenario(buildFormData(scenario, kwh, false, touProfile)),
        simulateScenario(buildFormData(scenario, kwh, true, touProfile)),
      ]);
      setFlat(flatRes);
      setTou(touRes);

      // 云端模式下保存推演历史（不阻塞 UI）
      if (flatRes.ok && isSupabaseConfigured()) {
        void saveSimulationRunAction({
          scenario_id: scenario.id,
          monthly_kwh: Number(kwh),
          flat_result: flatRes.result,
          tou_result: touRes.ok ? touRes.result : null,
        }).then((saved) => {
          if (saved.ok && saved.run) addSimulationRun(saved.run);
        });
      }
    });
  }

  const both = flat?.ok && tou?.ok ? { flat: flat.result, tou: tou.result } : null;
  const diff = both ? both.flat.total_cost - both.tou.total_cost : 0; // >0 表示分时更省
  const error = (flat && !flat.ok && flat.error) || (tou && !tou.ok && tou.error) || null;

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {/* 输入面板 */}
      <Card>
        <CardHeader>
          <CardTitle>推演参数</CardTitle>
          <CardDescription>瓦特引擎将并行推演「现行方案」与「分时方案」</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>用电场景</Label>
            <Select value={scenarioId} onValueChange={setScenarioId}>
              <SelectTrigger><SelectValue placeholder="选择场景" /></SelectTrigger>
              <SelectContent>
                {scenarios.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {METER_TYPE_LABELS[s.meter_type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sim-kwh">月用电量 (kWh)</Label>
            <Input
              id="sim-kwh"
              type="number" min="1" step="0.1"
              value={kwh}
              onChange={(e) => setKwh(e.target.value)}
            />
          </div>

          {/* 分时用电画像（仅影响分时方案） */}
          <div className="space-y-2.5 rounded-lg border border-border/60 p-3">
            <div className="flex items-center justify-between">
              <Label>分时用电画像</Label>
              <button
                type="button"
                onClick={() => setTouProfile({ ...DEFAULT_TOU_PROFILE[meterType] })}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                重置
              </button>
            </div>
            {(['峰', '平', '谷'] as const).map((period) => (
              <div key={period} className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{period}段</span>
                  <span className="font-medium text-foreground">{touProfile[period]}%</span>
                </div>
                <Slider
                  value={[touProfile[period]]}
                  onValueChange={([v]) => setTouProfile((p) => ({ ...p, [period]: v }))}
                  min={0} max={100} step={1}
                />
              </div>
            ))}
            <p className={`text-[11px] ${profileSum === 100 ? 'text-muted-foreground' : 'text-primary'}`}>
              合计 {profileSum}%{profileSum !== 100 && '（引擎将按比例自动归一化）'}
            </p>
          </div>

          {scenario && (
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{scenario.city}</Badge>
              <Badge variant="outline">{METER_TYPE_LABELS[scenario.meter_type]}</Badge>
              {scenario.has_tou && <Badge variant="cyan">已开通分时</Badge>}
              {scenario.meter_type === 'industrial' && (
                <Badge variant="secondary">
                  两部制 · {scenario.transformer_kva}kVA / {scenario.demand_kw}kW
                </Badge>
              )}
            </div>
          )}

          <Button className="w-full" onClick={run} disabled={pending || !scenario}>
            {pending ? <Loader2 className="animate-spin" /> : <Play />}
            {pending ? '推演中…' : '对比推演'}
          </Button>

          {error && (
            <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 对比结果 */}
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>方案对比</CardTitle>
          <CardDescription>
            {scenario ? `${scenario.name} · ${formatEnergy(Number(kwh))}/月` : '选择场景后运行推演'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {both ? (
            <>
              {/* 差额横幅 */}
              <div
                className={`flex items-center gap-3 rounded-lg border p-4 ${
                  diff > 0
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-accent/40 bg-accent/5'
                }`}
              >
                {diff > 0 ? (
                  <TrendingDown className="h-5 w-5 shrink-0 text-primary" />
                ) : (
                  <TrendingUp className="h-5 w-5 shrink-0 text-accent" />
                )}
                <p className="text-sm">
                  {diff > 0 ? (
                    <>
                      分时方案每月可省{' '}
                      <span className="text-lg font-bold text-primary">¥{diff.toFixed(2)}</span>
                      <span className="text-muted-foreground">
                        （-{((diff / both.flat.total_cost) * 100).toFixed(1)}%）
                      </span>
                    </>
                  ) : (
                    <>
                      当前用电画像下分时方案反而多付{' '}
                      <span className="text-lg font-bold text-accent">¥{Math.abs(diff).toFixed(2)}</span>
                      ，建议维持现行方案
                    </>
                  )}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <PlanCard
                  title={scenario?.meter_type === 'residential' ? '现行方案 · 阶梯电价' : '现行方案 · 单一制'}
                  result={both.flat}
                  highlight={diff <= 0}
                />
                <PlanCard title="分时方案 · 峰平谷" result={both.tou} highlight={diff > 0} />
              </div>

              {/* 节省建议 */}
              {both.tou.savings && (
                <div className="flex items-start gap-2.5 rounded-lg border border-accent/30 bg-accent/5 p-3.5 text-sm">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>{both.tou.savings.text}</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              选择场景并点击「对比推演」
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
