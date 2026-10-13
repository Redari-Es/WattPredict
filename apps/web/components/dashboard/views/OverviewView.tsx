'use client';

import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Layers, Zap, Plug, PiggyBank, ArrowRight, Plus, Calculator } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { METER_TYPE_LABELS } from '@/lib/domain';
import { formatEnergy } from '@/lib/units';
import { useDashboardStore } from '@/lib/store';

const AMBER = 'hsl(43 96% 56%)';
const CYAN = 'hsl(187 92% 50%)';
const PIE_COLORS = ['hsl(43 96% 56%)', 'hsl(187 92% 50%)', 'hsl(262 83% 65%)', 'hsl(152 69% 45%)', 'hsl(0 72% 60%)'];

const tooltipStyle = {
  background: 'hsl(240 10% 6%)',
  border: '1px solid hsl(240 4% 16%)',
  borderRadius: 8,
  fontSize: 13,
} as const;

export function OverviewView() {
  const { scenarios, appliances, simulationRuns, setView, startSimulation } = useDashboardStore();

  // ---------- 真实数据聚合 ----------
  const totalKwh = scenarios.reduce((s, sc) => s + sc.monthly_kwh, 0);
  const applianceTotal = Object.values(appliances)
    .flat()
    .reduce((s, a) => s + a.count, 0);
  const latestSaving = simulationRuns.find((r) => r.saving != null)?.saving ?? null;

  const kpis = [
    { label: '用电场景', value: String(scenarios.length), sub: `${new Set(scenarios.map((s) => s.city)).size} 个城市`, icon: Layers, accent: true },
    { label: '总月耗电', value: formatEnergy(totalKwh), sub: `${totalKwh.toFixed(0)} kWh`, icon: Zap, accent: false },
    { label: '电器总数', value: String(applianceTotal), sub: '跨全部场景', icon: Plug, accent: false },
    {
      label: '最近推演节省',
      value: latestSaving != null ? `¥${Math.abs(latestSaving).toFixed(2)}` : '—',
      sub: latestSaving != null ? (latestSaving > 0 ? '分时方案更省' : '现行方案更省') : '尚无推演记录',
      icon: PiggyBank,
      accent: false,
    },
  ];

  // 场景用电占比
  const shareData = scenarios.map((s) => ({ name: s.name, value: s.monthly_kwh }));

  // 推演历史（时间正序，双方案对比）
  const runData = [...simulationRuns].reverse().map((r, i) => ({
    name: `#${simulationRuns.length - i}`,
    现行方案: r.flat_result.total_cost,
    分时方案: r.tou_result?.total_cost ?? null,
  }));

  return (
    <div className="space-y-6">
      {/* KPI 卡片 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, sub, icon: Icon, accent }) => (
          <Card key={label} className={accent ? 'glow-amber border-primary/30' : ''}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
              </div>
              <div className={`rounded-lg p-2.5 ${accent ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* 推演历史 */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>推演历史</CardTitle>
            <CardDescription>每次对比推演的双方案电费（最近 50 次）</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {runData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={runData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(240 5% 64%)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(240 5% 64%)', fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`¥${Number(value).toFixed(2)}`]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="现行方案" fill={AMBER} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="分时方案" fill={CYAN} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <Calculator className="h-8 w-8 opacity-40" />
                <p>还没有推演记录</p>
                <Button variant="outline" size="sm" onClick={() => setView('simulate')}>
                  去推演 <ArrowRight />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 场景用电占比 */}
        <Card>
          <CardHeader>
            <CardTitle>用电分布</CardTitle>
            <CardDescription>各场景月耗电占比</CardDescription>
          </CardHeader>
          <CardContent className="flex h-72 flex-col">
            {shareData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="75%">
                  <PieChart>
                    <Pie
                      data={shareData}
                      dataKey="value"
                      innerRadius="55%"
                      outerRadius="85%"
                      paddingAngle={4}
                      strokeWidth={0}
                    >
                      {shareData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatEnergy(Number(value)), '月耗电']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {shareData.map((t, i) => (
                    <span key={t.name} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      {t.name}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <Layers className="h-8 w-8 opacity-40" />
                <p>还没有用电场景</p>
                <Button variant="outline" size="sm" onClick={() => setView('scenarios')}>
                  <Plus /> 新建场景
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 场景速览 */}
      <Card>
        <CardHeader>
          <CardTitle>用电场景</CardTitle>
          <CardDescription>点击场景快速发起推演</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {scenarios.length > 0 ? (
            scenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => startSimulation(s.id, s.monthly_kwh)}
                className="group flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-secondary/60"
              >
                <div className="flex items-center gap-3">
                  <Badge variant={s.meter_type === 'residential' ? 'amber' : s.meter_type === 'commercial' ? 'cyan' : 'secondary'}>
                    {METER_TYPE_LABELS[s.meter_type]}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.city} · {formatEnergy(s.monthly_kwh)}/月</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-sm text-muted-foreground">
              <p>创建你的第一个用电场景开始推演</p>
              <Button onClick={() => setView('scenarios')}>
                <Plus /> 新建场景
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
