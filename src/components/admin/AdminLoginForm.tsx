'use client';

// 后台登录表单（AdminLoginForm.tsx）
// 手机号 + 密码 → POST /api/auth/login → httpOnly Cookie → 跳转仪表盘
// 错误提示含锁定文案（5 次失败锁定 15 分钟，05 §2.1）
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Smartphone } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password.trim()) {
      setError('请输入手机号和密码');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(data.error || '登录失败，请重试');
        return;
      }
      // 登录成功：进入仪表盘
      router.push('/admin/dashboard');
      router.refresh();
    } catch {
      setError('网络错误，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        label="手机号"
        placeholder="请输入手机号"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
      />
      <Input
        label="密码"
        type="password"
        placeholder="请输入密码"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
      />
      {error && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          <Smartphone size={14} aria-hidden="true" />
          {error}
        </p>
      )}
      <Button icon={LogIn} loading={submitting} onClick={submit} className="w-full">
        登录
      </Button>
      <p className="text-center text-xs text-gray-400">连续 5 次密码错误将锁定 15 分钟</p>
    </div>
  );
}
