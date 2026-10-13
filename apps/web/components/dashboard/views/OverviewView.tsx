'use client';

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingDown, Zap, Wallet, Leaf, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { METER_TYPE_LABELS } from '@/lib/domain';
import { formatEnergy } from '@/lib/units';
import { monthlyTrend, dailyUsage } from '@/lib/mock-data';
import { useDashboardStore } from '@/lib/store';

const AMBER = 'hsl(43 96% 56%)';
const CYAN = 'hsl(187 92% 50%)';
const PIE_COLORS = ['hsl(43 96% 56%)', 'hsl(187 92% 50%)', 'hsl(262 83% 65%)'];

const kpis = [
  { label: '本月电费', value: '¥255.30', sub: '420 度', icon: Wallet, accent: true },
  { label: '较上月节省', value: '¥50.60', sub: '-16.5%', icon: TrendingDown, accent: false },
  { label: '本月用电', value: '420 度', sub: '420 kWh', icon: Zap, accent: false },
  { label: '碳减排', value: '58.8', sub: 'kg CO₂', icon: Leaf, accent: false },
];

const tierPie = [
  { name: '第一档', value: 153.1 },
  { name: '第二档', value: 102.2 },
];

export function OverviewView() {
  const { scenarios, startSimulation } = useDashboardStore();

  return (
    <div className="space-y-6">
      {/* KPI 卡片 */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
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
        {/* 年度用电趋势 */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>用电趋势</CardTitle>
            <CardDescription>近 12 个月用电量与电费</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="kwhFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={AMBER} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'hsl(240 5% 64%)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(240 5% 64%)', fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(240 10% 6%)', border: '1px solid hsl(240 4% 16%)',
                    borderRadius: 8, fontSize: 13,
                  }}
                  formatter={(value, name) => [name === 'kwh' ? `${value} kWh` : `¥${value}`, name === 'kwh' ? '用电量' : '电费']}
                />
                <Area type="monotone" dataKey="kwh" stroke={AMBER} strokeWidth={2} fill="url(#kwhFill)" />
                <Area type="monotone" dataKey="cost" stroke={CYAN} strokeWidth={1.5} fill="none" strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 阶梯构成 */}
        <Card>
          <CardHeader>
            <CardTitle>阶梯电费构成</CardTitle>
            <CardDescription>本月（广东居民阶梯）</CardDescription>
          </CardHeader>
          <CardContent className="flex h-72 flex-col">
            <ResponsiveContainer width="100%" height="75%">
              <PieChart>
                <Pie
                  data={tierPie}
                  dataKey="value"
                  innerRadius="55%"
                  outerRadius="85%"
                  paddingAngle={4}
                  strokeWidth={0}
                >
                  {tierPie.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(240 10% 6%)', border: '1px solid hsl(240 4% 16%)',
                    borderRadius: 8, fontSize: 13,
                  }}
                  formatter={(value) => [`¥${value}`, '费用']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 text-xs text-muted-foreground">
              {tierPie.map((t, i) => (
                <span key={t.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                  {t.name} ¥{t.value}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* 每日用电 */}
        <Card>
          <CardHeader>
            <CardTitle>每日用电</CardTitle>
            <CardDescription>近 14 天</CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: 'hsl(240 5% 64%)', fontSize: 11 }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fill: 'hsl(240 5% 64%)', fontSize: 12 }} axisLine={false} tickLine={false} width={32} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(240 10% 6%)', border: '1px solid hsl(240 4% 16%)',
                    borderRadius: 8, fontSize: 13,
                  }}
                  formatter={(value) => [`${value} kWh`, '用电量']}
                />
                <Bar dataKey="kwh" fill={CYAN} radius={[4, 4, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 场景速览 */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>用电场景</CardTitle>
            <CardDescription>点击场景快速发起推演</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {scenarios.map((s) => (
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
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
