'use client';

import { useState, useTransition } from 'react';
import {
  ReceiptText, Loader2, AlertCircle, Lightbulb, Scale, Trash2, ChevronDown,
  Calculator, TrendingUp, TrendingDown,
} from 'lucide-react';
import {
  reconcileBill, saveBillAction, deleteBillAction, type ReconcileActionResult,
} from '@/app/actions';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { useDashboardStore } from '@/lib/store';
import { METER_TYPE_LABELS, DEFAULT_TOU_PROFILE } from '@/lib/domain';
import { formatEnergy } from '@/lib/units';
import type { ReconcileResult } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const PROFILE_COLORS: Record<string, string> = {
  峰: 'hsl(43 96% 56%)',
  平: 'hsl(187 92% 50%)',
  谷: 'hsl(262 83% 65%)',
};

/** 默认账期：上个月（电费账单滞后一个月） */
function lastMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** 反推画像与默认画像的对比条 */
function ProfileCompare({
  implied, meterType,
}: { implied: Record<string, number>; meterType: keyof typeof DEFAULT_TOU_PROFILE }) {
  const def = DEFAULT_TOU_PROFILE[meterType];
  return (
    <div className="space-y-2.5">
      <p className="text-xs font-medium text-muted-foreground">反推真实画像 vs 默认画像</p>
      {(['峰', '平', '谷'] as const).map((period) => (
        <div key={period} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>{period}段</span>
            <span className="text-muted-foreground">
              实际 <span className="font-semibold text-foreground">{implied[period]}%</span>
              {' / '}默认 {def[period]}%
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${implied[period]}%`, background: PROFILE_COLORS[period] }}
            />
            {/* 默认画像刻度线 */}
            <div
              className="absolute inset-y-0 w-0.5 bg-foreground/50"
              style={{ left: `${def[period]}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReconcileView() {
  const { scenarios, bills, addBill, removeBill, startSimulation } = useDashboardStore();
  const [scenarioId, setScenarioId] = useState(scenarios[0]?.id ?? '');
  const [period, setPeriod] = useState(lastMonth());
  const [totalKwh, setTotalKwh] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [showTou, setShowTou] = useState(false);
  const [peakKwh, setPeakKwh] = useState('');
  const [flatKwh, setFlatKwh] = useState('');
  const [valleyKwh, setValleyKwh] = useState('');
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ReconcileActionResult | null>(null);
  const [saved, setSaved] = useState(false);

  const cloud = isSupabaseConfigured();
  const scenario = scenarios.find((s) => s.id === scenarioId);
  const scenarioBills = bills
    .filter((b) => b.scenario_id === scenarioId)
    .sort((a, b) => b.period.localeCompare(a.period));

  // 环比洞察：最新两期账单对比（用电/电费/均价）
  const mom = scenarioBills.length >= 2
    ? (() => {
        const [latest, prev] = scenarioBills;
        const kwhDelta = (latest.total_kwh - prev.total_kwh) / prev.total_kwh * 100;
        const costDelta = (latest.total_cost - prev.total_cost) / prev.total_cost * 100;
        const latestAvg = latest.total_cost / latest.total_kwh;
        const prevAvg = prev.total_cost / prev.total_kwh;
        return { latest, prev, kwhDelta, costDelta, latestAvg, prevAvg };
      })()
    : null;

  function submit() {
    if (!scenario) return;
    setSaved(false);
    startTransition(async () => {
      const bill = {
        total_kwh: totalKwh,
        total_cost: totalCost,
        peak_kwh: showTou && peakKwh !== '' ? peakKwh : undefined,
        flat_kwh: showTou && flatKwh !== '' ? flatKwh : undefined,
        valley_kwh: showTou && valleyKwh !== '' ? valleyKwh : undefined,
      };
      const res = await reconcileBill(scenario, bill);
      setResult(res);
      if (!res.ok || !cloud) return;

      // 核对成功后落库（同场景同账期 upsert）
      const savedRes = await saveBillAction({
        scenario_id: scenario.id,
        period,
        total_kwh: Number(totalKwh),
        total_cost: Number(totalCost),
        peak_kwh: bill.peak_kwh != null ? Number(bill.peak_kwh) : null,
        flat_kwh: bill.flat_kwh != null ? Number(bill.flat_kwh) : null,
        valley_kwh: bill.valley_kwh != null ? Number(bill.valley_kwh) : null,
      });
      if (savedRes.ok && savedRes.bill) {
        addBill(savedRes.bill);
        setSaved(true);
      }
    });
  }

  const ok = result?.ok ? (result as { ok: true; result: ReconcileResult }).result : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        {/* 账单录入 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-primary" /> 录入真实账单
            </CardTitle>
            <CardDescription>
              用真实账单校准推演模型——录得越准，推演越接近你的实际用电
            </CardDescription>
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
              <Label htmlFor="bill-period">账期</Label>
              <Input
                id="bill-period" type="month"
                value={period} onChange={(e) => setPeriod(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bill-kwh">账单电量 (度)</Label>
                <Input
                  id="bill-kwh" type="number" min="0" step="0.1" placeholder="420"
                  value={totalKwh} onChange={(e) => setTotalKwh(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bill-cost">账单金额 (元)</Label>
                <Input
                  id="bill-cost" type="number" min="0" step="0.01" placeholder="259.95"
                  value={totalCost} onChange={(e) => setTotalCost(e.target.value)}
                />
              </div>
            </div>

            {/* 分时明细（可折叠） */}
            <div className="rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => setShowTou((v) => !v)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <span>分时电量明细（可选，用于反推真实画像）</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showTou ? 'rotate-180' : ''}`} />
              </button>
              {showTou && (
                <div className="grid grid-cols-3 gap-2 border-t border-border/60 p-3">
                  {([
                    ['峰段', peakKwh, setPeakKwh],
                    ['平段', flatKwh, setFlatKwh],
                    ['谷段', valleyKwh, setValleyKwh],
                  ] as const).map(([label, val, setter]) => (
                    <div key={label} className="space-y-1">
                      <Label className="text-xs">{label} (度)</Label>
                      <Input
                        type="number" min="0" step="0.1"
                        value={val} onChange={(e) => setter(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              className="w-full"
              onClick={submit}
              disabled={pending || !scenario || !totalKwh || !totalCost || !period}
            >
              {pending ? <Loader2 className="animate-spin" /> : <Scale />}
              {pending ? '核对中…' : '核对账单'}
            </Button>

            {result && !result.ok && (
              <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {result.error}
              </p>
            )}
            {saved && (
              <p className="text-xs text-muted-foreground">已保存到云端，同账期重复录入会自动覆盖</p>
            )}
          </CardContent>
        </Card>

        {/* 核对结果 */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>核对报告</CardTitle>
            <CardDescription>
              {scenario ? `${scenario.name} · ${period} 账期` : '选择场景后录入账单'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ok ? (
              <>
                {/* 均价与偏差 */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border/60 p-4">
                    <p className="text-xs text-muted-foreground">实际均价</p>
                    <p className="mt-1 text-2xl font-bold">
                      ¥{ok.implied_avg_price.toFixed(4)}
                      <span className="text-xs font-normal text-muted-foreground">/度</span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 p-4">
                    <p className="text-xs text-muted-foreground">推演金额</p>
                    <p className="mt-1 text-2xl font-bold">¥{ok.simulated.total_cost.toFixed(2)}</p>
                  </div>
                  <div
                    className={`rounded-lg border p-4 ${
                      Math.abs(ok.deviation_pct) <= 3
                        ? 'border-accent/40 bg-accent/5'
                        : 'border-primary/40 bg-primary/5'
                    }`}
                  >
                    <p className="text-xs text-muted-foreground">偏差</p>
                    <p className="mt-1 text-2xl font-bold">
                      {ok.deviation_cost >= 0 ? '+' : ''}¥{ok.deviation_cost.toFixed(2)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        ({ok.deviation_pct >= 0 ? '+' : ''}{ok.deviation_pct}%)
                      </span>
                    </p>
                  </div>
                </div>

                {/* 反推画像 */}
                {ok.implied_profile && scenario && (
                  <div className="rounded-lg border border-border/60 p-4">
                    <ProfileCompare
                      implied={ok.implied_profile}
                      meterType={scenario.meter_type}
                    />
                  </div>
                )}

                {/* 诊断结论 */}
                <div className="space-y-2">
                  {ok.diagnosis.map((text, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 rounded-lg border border-accent/30 bg-accent/5 p-3.5 text-sm"
                    >
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>

                {/* 一键用真实画像推演 */}
                {ok.implied_profile && scenario && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      startSimulation(scenario.id, Number(totalKwh), ok.implied_profile)
                    }
                  >
                    <Calculator /> 用真实画像推演（{formatEnergy(Number(totalKwh))} ·
                    峰{ok.implied_profile['峰']}% 平{ok.implied_profile['平']}% 谷{ok.implied_profile['谷']}%）
                  </Button>
                )}
              </>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                录入账单数据后点击「核对账单」
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 账单历史 */}
      <Card>
        <CardHeader>
          <CardTitle>账单历史</CardTitle>
          <CardDescription>
            {scenario
              ? `${scenario.name} · 共 ${scenarioBills.length} 条`
              : '选择场景查看历史账单'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 环比洞察（有 2 期以上账单时） */}
          {mom && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border/60 p-4 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="text-muted-foreground">较 {mom.prev.period}：</span>
              </span>
              <span className="flex items-center gap-1.5">
                {mom.kwhDelta > 0 ? (
                  <TrendingUp className="h-4 w-4 text-primary" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-accent" />
                )}
                用电 {mom.kwhDelta >= 0 ? '+' : ''}{mom.kwhDelta.toFixed(1)}%
                <span className="text-muted-foreground">
                  （{mom.kwhDelta >= 0 ? '+' : ''}{formatEnergy(mom.latest.total_kwh - mom.prev.total_kwh)}）
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                {mom.costDelta > 0 ? (
                  <TrendingUp className="h-4 w-4 text-primary" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-accent" />
                )}
                电费 {mom.costDelta >= 0 ? '+' : ''}{mom.costDelta.toFixed(1)}%
                <span className="text-muted-foreground">
                  （{mom.costDelta >= 0 ? '+' : ''}¥{(mom.latest.total_cost - mom.prev.total_cost).toFixed(2)}）
                </span>
              </span>
              <span className="text-muted-foreground">
                均价 ¥{mom.prevAvg.toFixed(4)} → ¥{mom.latestAvg.toFixed(4)}/度
                {mom.latestAvg < mom.prevAvg && '（用电结构在变好）'}
                {mom.latestAvg > mom.prevAvg * 1.03 && '（均价明显上升，检查峰段用电或是否进入更高阶梯）'}
              </span>
            </div>
          )}

          {scenarioBills.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">账期</th>
                    <th className="pb-2 font-medium">电量</th>
                    <th className="pb-2 font-medium">金额</th>
                    <th className="pb-2 font-medium">实际均价</th>
                    <th className="pb-2 font-medium">分时明细</th>
                    <th className="pb-2 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarioBills.map((b) => (
                    <tr key={b.id} className="border-b border-border/40 last:border-0">
                      <td className="py-2.5 font-medium">{b.period}</td>
                      <td className="py-2.5">{formatEnergy(b.total_kwh)}</td>
                      <td className="py-2.5">¥{b.total_cost.toFixed(2)}</td>
                      <td className="py-2.5 text-muted-foreground">
                        ¥{(b.total_cost / b.total_kwh).toFixed(4)}/度
                      </td>
                      <td className="py-2.5">
                        {b.peak_kwh != null && b.flat_kwh != null && b.valley_kwh != null ? (
                          <Badge variant="cyan">峰{b.peak_kwh} 平{b.flat_kwh} 谷{b.valley_kwh}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">未录入</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => {
                            removeBill(b.id);
                            if (cloud) void deleteBillAction(b.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              还没有账单记录——录入第一张账单，让瓦特预言开始学习你的真实用电
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
