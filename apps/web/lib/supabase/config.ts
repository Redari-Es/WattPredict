/** Supabase 公钥：兼容新版 publishable key 与传统 anon key 两种命名 */
export function supabaseKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

/** Supabase 是否已配置（未配置时进入开发模式，跳过登录守卫） */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && supabaseKey());
}
