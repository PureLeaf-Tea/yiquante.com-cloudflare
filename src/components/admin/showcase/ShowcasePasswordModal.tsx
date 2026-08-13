'use client';

// B2B 展示区密码管理弹窗（R2 拆分自 ShowcaseAdmin.tsx：改密码/看明文二次验证，纯展示 + 回调）
import { Eye, EyeOff } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { ShowcaseCat } from './ShowcaseCategoryTable';

export function ShowcasePasswordModal({
  open,
  cat,
  newPwd,
  adminPwd,
  plainPwd,
  busy,
  onNewPwd,
  onAdminPwd,
  onChangePwd,
  onViewPlain,
  onClose,
}: {
  open: boolean;
  cat: ShowcaseCat | null;
  newPwd: string;
  adminPwd: string;
  plainPwd: string | null;
  busy: boolean;
  onNewPwd: (v: string) => void;
  onAdminPwd: (v: string) => void;
  onChangePwd: () => void;
  onViewPlain: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={`密码管理 · ${cat?.nameZh || ''}`}>
      <div className="space-y-5">
        {/* 修改密码 */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">修改密码</p>
          <div className="flex gap-2">
            <Input type="password" placeholder="输入新密码" value={newPwd} onChange={(e) => onNewPwd(e.target.value)} />
            <Button size="sm" variant="outline" loading={busy} onClick={onChangePwd}>
              修改
            </Button>
          </div>
        </div>
        {/* 查看明文（二次验证） */}
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <p className="text-sm font-medium text-gray-700">查看当前密码（需管理员密码二次验证）</p>
          <div className="flex gap-2">
            <Input type="password" placeholder="输入您的登录密码" value={adminPwd} onChange={(e) => onAdminPwd(e.target.value)} />
            <Button size="sm" variant="outline" icon={plainPwd ? EyeOff : Eye} loading={busy} onClick={onViewPlain}>
              {plainPwd ? '隐藏' : '查看'}
            </Button>
          </div>
          {plainPwd && (
            <p className="rounded-lg bg-brand-gold/10 px-3 py-2 font-mono text-sm text-brand-green">{plainPwd}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
