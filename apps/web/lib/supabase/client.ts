'use client';

import { createBrowserClient } from '@supabase/ssr';
import { isSupabaseConfigured, supabaseKey } from './config';

/** 浏览器端 Supabase 客户端；未配置时返回 null（开发模式） */
export function createClient() {
  if (!isSupabaseConfigured()) return null;
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseKey()!);
}
