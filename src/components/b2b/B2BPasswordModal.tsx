'use client';

// B2B 密码验证弹窗（B2BPasswordModal.tsx，06 号文档 §4.2）
// autocomplete=off + 眼睛显隐 + 错误提示 2 秒消失 + 锁定提示 + 桌面 400px/移动全屏
import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function B2BPasswordModal({
  open,
  onClose,
  categorySlug,
  categoryName,
  locale,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  categorySlug: string;
  categoryName: string;
  locale: string;
  onSuccess: (token: string, expiresAt: string) => void;
}) {
  const zh = locale === 'zh';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!password.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/showcase/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categorySlug, password }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: { token: string; expiresAt: string };
      };
      if (res.status === 429) {
        // 锁定 30 分钟（05 号文档 §3.8）
        setLocked(true);
        setError(data.error || (zh ? '密码错误次数过多，请30分钟后再试' : 'Too many attempts. Please try again in 30 minutes'));
        return;
      }
      if (!res.ok || !data.success || !data.data) {
        setError(data.error || (zh ? '密码错误，请重试' : 'Incorrect password, please try again'));
        // 错误提示 2 秒后消失（06 §4.2）
        setTimeout(() => setError(''), 2000);
        return;
      }
      onSuccess(data.data.token, data.data.expiresAt);
    } catch {
      setError(zh ? '网络错误，请重试' : 'Network error, please retry');
      setTimeout(() => setError(''), 2000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={zh ? '密码验证' : 'Password Required'}
      widthClassName="md:max-w-[400px]"
      footer={
        <Button onClick={submit} loading={submitting} disabled={locked} className="w-full" icon={KeyRound}>
          {zh ? '确认' : 'Confirm'}
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-center text-sm text-gray-500">
          {categoryName} — {zh ? '请输入访问密码查看产品' : 'Enter the password to view products'}
        </p>
        <Input
          type="password"
          placeholder={zh ? '请输入密码' : 'Enter password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          error={error || undefined}
        />
        <p className="text-center text-xs text-gray-400">
          {zh ? '没有密码？请联系销售人员获取' : 'No password? Contact our sales team'}
        </p>
      </div>
    </Modal>
  );
}
