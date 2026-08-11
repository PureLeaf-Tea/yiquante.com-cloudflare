'use client';

// 弹窗组件（Modal.tsx）
// 规范（08 号文档 §3.1）：遮罩半透明黑 60%；桌面居中最大宽 600px；手机全屏无圆角；
// 结构 = 标题栏（含关闭按钮）+ 内容区 + 底部按钮区
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ModalProps {
  // 是否打开
  open: boolean;
  // 关闭回调（点遮罩 / 点叉 / 按 Esc 都会触发）
  onClose: () => void;
  // 弹窗标题
  title?: string;
  children: ReactNode;
  // 底部按钮区（传取消/确认按钮）
  footer?: ReactNode;
  // 自定义宽度类（默认 max-w-[600px]）
  widthClassName?: string;
}

export function Modal({ open, onClose, title, children, footer, widthClassName }: ModalProps) {
  // Esc 键关闭弹窗
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    // 遮罩层：半透明黑色 60%，点击遮罩关闭
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 md:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* 弹窗主体：移动端全屏无圆角（max-md），桌面居中卡片 */}
      <div
        className={cn(
          'flex flex-col bg-white shadow-xl',
          'h-full w-full max-md:rounded-none',
          'md:h-auto md:max-h-[85vh] md:rounded-2xl',
          widthClassName || 'md:max-w-[600px]'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-semibold text-brand-green">{title}</h3>
          <button
            type="button"
            aria-label="关闭弹窗"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* 内容区（可滚动） */}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {/* 底部按钮区 */}
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
