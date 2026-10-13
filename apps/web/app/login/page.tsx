'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Loader2, Mail, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Notice = { kind: 'error' | 'success'; text: string } | null;

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const configured = isSupabaseConfigured();

  async function signInWithOAuth(provider: 'github' | 'google') {
    const supabase = createClient();
    if (!supabase) return;
    setLoading(provider);
    setNotice(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setNotice({ kind: 'error', text: error.message });
      setLoading(null);
    }
  }

  async function handleEmailAuth(e: React.FormEvent<HTMLFormElement>, mode: 'signin' | 'signup') {
    e.preventDefault();
    const supabase = createClient();
    if (!supabase) return;

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email'));
    const password = String(fd.get('password'));

    setLoading(mode);
    setNotice(null);

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setNotice({ kind: 'error', text: translateAuthError(error.message) });
      } else {
        router.push('/dashboard');
        router.refresh();
        return;
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setNotice({ kind: 'error', text: translateAuthError(error.message) });
      } else if (data.session) {
        // 项目关闭了邮箱验证，直接登录成功
        router.push('/dashboard');
        router.refresh();
        return;
      } else {
        setNotice({ kind: 'success', text: '注册成功！验证邮件已发送，请查收邮箱完成验证后登录。' });
      }
    }
    setLoading(null);
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
        <CardContent className="space-y-4">
          {configured ? (
            <>
              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">邮箱登录</TabsTrigger>
                  <TabsTrigger value="signup">注册</TabsTrigger>
                </TabsList>

                {(['signin', 'signup'] as const).map((mode) => (
                  <TabsContent key={mode} value={mode}>
                    <form onSubmit={(e) => handleEmailAuth(e, mode)} className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`${mode}-email`}>邮箱</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id={`${mode}-email`}
                            name="email" type="email" required
                            placeholder="you@example.com"
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`${mode}-password`}>密码</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id={`${mode}-password`}
                            name="password" type="password" required
                            minLength={6}
                            placeholder={mode === 'signup' ? '至少 6 位' : '输入密码'}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={loading !== null}>
                        {loading === mode && <Loader2 className="animate-spin" />}
                        {mode === 'signin' ? '登录' : '创建账号'}
                      </Button>
                    </form>
                  </TabsContent>
                ))}
              </Tabs>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                或使用第三方登录
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button
                variant="outline"
                className="w-full"
                disabled={loading !== null}
                onClick={() => signInWithOAuth('github')}
              >
                {loading === 'github' ? <Loader2 className="animate-spin" /> : <GithubIcon />}
                使用 GitHub 登录
              </Button>

              {notice && (
                <p
                  className={`rounded-md border p-3 text-center text-sm ${
                    notice.kind === 'error'
                      ? 'border-destructive/40 bg-destructive/10 text-destructive'
                      : 'border-accent/40 bg-accent/10 text-accent'
                  }`}
                >
                  {notice.text}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center text-sm text-muted-foreground">
                未配置 Supabase 环境变量，当前为开发模式。
                <br />
                配置 <code className="text-primary">NEXT_PUBLIC_SUPABASE_URL</code> /{' '}
                <code className="text-primary">PUBLISHABLE_KEY</code> 后启用登录。
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

/** 常见 Supabase Auth 错误信息中文化 */
function translateAuthError(msg: string): string {
  const map: Record<string, string> = {
    'Invalid login credentials': '邮箱或密码错误',
    'Email not confirmed': '邮箱尚未验证，请查收验证邮件',
    'User already registered': '该邮箱已注册，请直接登录',
  };
  for (const [en, zh] of Object.entries(map)) {
    if (msg.includes(en)) return zh;
  }
  return msg;
}
