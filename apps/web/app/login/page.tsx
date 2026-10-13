'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  async function signInWithOAuth(provider: 'github' | 'google') {
    const supabase = createClient();
    if (!supabase) return;
    setLoading(provider);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(null);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* 背景光效 */}
      <div className="bg-grid absolute inset-0 opacity-40" />
      <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-accent/10 blur-[100px]" />

      <Card className="relative z-10 w-full max-w-sm border-border/60 bg-card/80 backdrop-blur">
        <CardHeader className="items-center text-center">
          <div className="glow-amber mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">瓦特预言</CardTitle>
          <CardDescription>登录以进入电费推演仪表盘</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {configured ? (
            <>
              <Button
                variant="outline"
                className="w-full"
                disabled={loading !== null}
                onClick={() => signInWithOAuth('github')}
              >
                {loading === 'github' ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                  </svg>
                )}
                使用 GitHub 登录
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={loading !== null}
                onClick={() => signInWithOAuth('google')}
              >
                {loading === 'google' ? <Loader2 className="animate-spin" /> : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                  </svg>
                )}
                使用 Google 登录
              </Button>
              {error && <p className="text-center text-sm text-destructive">{error}</p>}
            </>
          ) : (
            <>
              <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center text-sm text-muted-foreground">
                未配置 Supabase 环境变量，当前为开发模式。
                <br />
                配置 <code className="text-primary">NEXT_PUBLIC_SUPABASE_URL</code> /{' '}
                <code className="text-primary">PUBLISHABLE_KEY</code> 后启用 OAuth。
              </p>
              <Button className="w-full" onClick={() => router.push('/dashboard')}>
                以开发模式进入
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
