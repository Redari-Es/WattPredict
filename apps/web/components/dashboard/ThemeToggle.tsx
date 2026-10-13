'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'watt-theme';

/** 日夜主题切换按钮，持久化到 localStorage */
export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  // 与 layout.tsx 内联脚本保持一致的初始状态
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      // 隐私模式等场景下忽略持久化失败
    }
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      title={dark ? '切换到日间模式' : '切换到夜间模式'}
      aria-label={dark ? '切换到日间模式' : '切换到夜间模式'}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
