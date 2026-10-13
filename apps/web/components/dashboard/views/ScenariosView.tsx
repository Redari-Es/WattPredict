'use client';

import { useState } from 'react';
import { Plus, Trash2, Calculator } from 'lucide-react';
import { useDashboardStore } from '@/lib/store';
import { METER_TYPE_LABELS, GD_CITIES, type ScenarioRecord } from '@/lib/domain';
import { formatEnergy } from '@/lib/units';
import type { MeterType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const METER_BADGE: Record<MeterType, 'amber' | 'cyan' | 'secondary'> = {
  residential: 'amber',
  commercial: 'cyan',
  industrial: 'secondary',
};

function NewScenarioDialog() {
  const addScenario = useDashboardStore((s) => s.addScenario);
  const [open, setOpen] = useState(false);
  const [meterType, setMeterType] = useState<MeterType>('residential');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const scenario: ScenarioRecord = {
      id: `sc-${crypto.randomUUID().slice(0, 8)}`,
      name: String(fd.get('name')),
      province: 'GD',
      city: String(fd.get('city')),
      meter_type: meterType,
      has_tou: fd.get('has_tou') === 'on',
      monthly_kwh: Number(fd.get('monthly_kwh')),
      ...(meterType === 'residential' && { household_type: String(fd.get('household_type')) }),
      ...(meterType === 'commercial' && { business_type: String(fd.get('business_type')) }),
      ...(meterType === 'industrial' && {
        transformer_kva: Number(fd.get('transformer_kva')),
        demand_kw: Number(fd.get('demand_kw')),
      }),
    };
    addScenario(scenario);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> 新建场景
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建用电场景</DialogTitle>
          <DialogDescription>按电表类型填写对应信息（当前支持广东省）</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sc-name">场景名称</Label>
              <Input id="sc-name" name="name" placeholder="如：广州租屋" required maxLength={50} />
            </div>
            <div className="space-y-1.5">
              <Label>城市</Label>
              <Select name="city" defaultValue="广州">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GD_CITIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>电表类型</Label>
              <Select value={meterType} onValueChange={(v) => setMeterType(v as MeterType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">家庭</SelectItem>
                  <SelectItem value="commercial">商业</SelectItem>
                  <SelectItem value="industrial">工业</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sc-kwh">月均用电量 (kWh)</Label>
              <Input id="sc-kwh" name="monthly_kwh" type="number" min="1" step="0.1" placeholder="420" required />
            </div>
          </div>

          {/* 按电表类型渲染专属字段 */}
          {meterType === 'residential' && (
            <div className="space-y-1.5">
              <Label>住宅类型</Label>
              <Select name="household_type" defaultValue="普通住宅">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="普通住宅">普通住宅</SelectItem>
                  <SelectItem value="城中村">城中村</SelectItem>
                  <SelectItem value="别墅">别墅</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {meterType === 'commercial' && (
            <div className="space-y-1.5">
              <Label>经营业态</Label>
              <Select name="business_type" defaultValue="餐饮">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="餐饮">餐饮</SelectItem>
                  <SelectItem value="零售">零售</SelectItem>
                  <SelectItem value="办公">办公</SelectItem>
                  <SelectItem value="酒店住宿">酒店住宿</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {meterType === 'industrial' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sc-kva">变压器容量 (kVA)</Label>
                <Input id="sc-kva" name="transformer_kva" type="number" min="1" placeholder="250" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sc-demand">最大需量 (kW)</Label>
                <Input id="sc-demand" name="demand_kw" type="number" min="1" placeholder="180" required />
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" name="has_tou" className="h-4 w-4 accent-amber-500" />
            已开通分时电价 (TOU)
          </label>

          <Button type="submit" className="w-full">创建场景</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ScenariosView() {
  const { scenarios, removeScenario, startSimulation } = useDashboardStore();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>用电场景</CardTitle>
          <CardDescription className="mt-1">
            每个场景是一处独立用电空间（家庭 / 商业 / 工业），共 {scenarios.length} 个
          </CardDescription>
        </div>
        <NewScenarioDialog />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>城市</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>分时电价</TableHead>
              <TableHead className="text-right">月均用电量</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scenarios.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.city}</TableCell>
                <TableCell>
                  <Badge variant={METER_BADGE[s.meter_type]}>{METER_TYPE_LABELS[s.meter_type]}</Badge>
                </TableCell>
                <TableCell>{s.has_tou ? <Badge variant="cyan">已开通</Badge> : '—'}</TableCell>
                <TableCell className="text-right">{formatEnergy(s.monthly_kwh)}/月</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => startSimulation(s.id, s.monthly_kwh)}
                    >
                      <Calculator /> 推演
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeScenario(s.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
