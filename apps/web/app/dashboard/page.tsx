import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardApp } from '@/components/dashboard/DashboardApp';
import type { HeaderUser } from '@/components/dashboard/Header';

export default async function DashboardPage() {
  const supabase = await createClient();

  let user: HeaderUser;
  if (supabase) {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) redirect('/login');
    user = {
      email: authUser.email ?? '',
      name: (authUser.user_metadata?.full_name as string | undefined) ?? authUser.email ?? '用户',
      avatarUrl: (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
    };
  } else {
    // 开发模式：未配置 Supabase
    user = { email: 'dev@wattpredict.local', name: '开发模式', avatarUrl: null };
  }

  return <DashboardApp user={user} />;
}
