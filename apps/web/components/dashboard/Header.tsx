'use client';

import { useEffect, useState } from 'react';
import { LogOut, User as UserIcon, Menu } from 'lucide-react';
import { useDashboardStore } from '@/lib/store';
import { getEngineStatus, signOut } from '@/app/actions';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from './ThemeToggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const VIEW_TITLES = {
  overview: '数据概览',
  scenarios: '用电场景',
  simulate: '电费推演',
  appliances: '电器预设',
  reconcile: '账单核对',
} as const;

export interface HeaderUser {
  email: string;
  name: string;
  avatarUrl: string | null;
}

function EngineStatusBadge() {
  const [status, setStatus] = useState<{ ok: boolean; latencyMs: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = () => getEngineStatus().then((s) => !cancelled && setStatus(s));
    check();
    const timer = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!status) return <Badge variant="outline">瓦特引擎检测中…</Badge>;
  return (
    <Badge variant={status.ok ? 'cyan' : 'destructive'} className="gap-1.5">
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status.ok ? 'bg-accent animate-pulse' : 'bg-destructive-foreground',
        )}
      />
      {/* 小屏只显示在线/离线，延迟数字在 ≥sm 才展示 */}
      {status.ok ? '引擎在线' : '引擎离线'}
      {status.ok && <span className="hidden sm:inline">· {status.latencyMs}ms</span>}
    </Badge>
  );
}

export function Header({ user, onMenuClick }: { user: HeaderUser; onMenuClick: () => void }) {
  const view = useDashboardStore((s) => s.view);
  const initials = (user.name || user.email).slice(0, 2).toUpperCase();

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-border/60 px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        {/* 移动端菜单按钮 */}
        <button
          onClick={onMenuClick}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary lg:hidden"
          aria-label="打开菜单"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-base font-semibold">{VIEW_TITLES[view]}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden sm:block"><EngineStatusBadge /></div>
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <Avatar>
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm">{user.name}</p>
                  <p className="truncate text-xs font-normal text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
              <LogOut />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
