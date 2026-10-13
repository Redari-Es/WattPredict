'use client';

import { Zap, LayoutDashboard, Layers, Calculator, Plug } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardStore, type DashboardView } from '@/lib/store';

const NAV_ITEMS: Array<{ key: DashboardView; label: string; icon: typeof Zap }> = [
  { key: 'overview', label: '数据概览', icon: LayoutDashboard },
  { key: 'scenarios', label: '用电场景', icon: Layers },
  { key: 'simulate', label: '电费推演', icon: Calculator },
  { key: 'appliances', label: '电器预设', icon: Plug },
];

export function Sidebar() {
  const { view, setView } = useDashboardStore();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border/60 bg-card/40">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="glow-amber flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">瓦特预言</p>
          <p className="text-[10px] tracking-widest text-muted-foreground">WATTPREDICT</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const active = view === key;
          return (
            <button
              key={key}
              onClick={() => setView(key)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
                active
                  ? 'bg-primary/10 font-medium text-primary shadow-[inset_2px_0_0_0_hsl(var(--primary))]'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-4 text-[10px] text-muted-foreground">
        MVP v0.1 · 广东
      </div>
    </aside>
  );
}
