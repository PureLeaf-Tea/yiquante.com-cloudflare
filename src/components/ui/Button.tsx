'use client';

// 按钮组件（Button.tsx）
// 规范：所有按钮必须有 lucide-react 图标 + 汉字（08 号文档 §1.1），最小触摸尺寸 48×48px
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
// cva（class-variance-authority）：用"变体"方式管理组件样式组合（如 primary/danger × 大小）
import { cva, type VariantProps } from 'class-variance-authority';
// LucideIcon：lucide-react 图标的统一类型
import { Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

// ★按钮变体定义（03 号文档 §6.2 原文）
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-btn font-medium transition-all duration-300 min-h-touch min-w-touch px-6 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        // 主按钮：深绿实心
        primary: 'bg-brand-green text-white hover:bg-brand-green/90',
        // 描边按钮：暖金描边
        outline: 'border-2 border-brand-gold text-brand-gold bg-transparent hover:bg-brand-gold/10',
        // 幽灵按钮：无边框，浅绿悬停底
        ghost: 'text-brand-green hover:bg-brand-green/10',
        // 浅色按钮：用在深色背景上（如 Hero 区）
        light: 'border-2 border-white text-white bg-transparent hover:bg-white hover:text-brand-green',
        // 危险按钮：删除等不可逆操作（红色）
        danger: 'bg-red-600 text-white hover:bg-red-700',
        // B2B 卡片按钮：白底灰边，悬停金边
        b2b: 'bg-white border border-gray-200 hover:border-brand-gold hover:shadow-lg',
      },
      size: {
        sm: 'text-xs px-4 py-1.5 min-h-8',
        md: 'text-sm px-6 py-2 min-h-touch',
        lg: 'text-base px-8 py-3',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  // lucide-react 图标组件（图标永远在文字左侧）
  icon?: LucideIcon;
  // 加载中：显示旋转图标并禁用按钮
  loading?: boolean;
}

// forwardRef：允许父组件拿到真实 <button> DOM 引用
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, icon: Icon, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : Icon ? (
          <Icon size={16} aria-hidden="true" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button };
