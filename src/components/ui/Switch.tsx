'use client';

// 开关组件（Switch.tsx）
// 用于后台的"启用/停用"类设置（如 GDPR 开关、hCaptcha 开关）
// 触摸区 ≥48px；开启态为品牌深绿
import { cn } from '@/lib/cn';

export interface SwitchProps {
  // 是否开启
  checked: boolean;
  // 切换回调
  onChange: (checked: boolean) => void;
  // 禁用
  disabled?: boolean;
  // 无障碍描述（读屏软件用）
  label?: string;
  className?: string;
}

export function Switch({ checked, onChange, disabled, label, className }: SwitchProps) {
  return (
    // role="switch"：语义化开关，键盘可操作
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        // min-h-touch 保证 48px 触摸高度；滑块本体 44×24
        'inline-flex min-h-touch items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      <span
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
          checked ? 'bg-brand-green' : 'bg-gray-300'
        )}
      >
        {/* 滑块：开启时右移 */}
        <span
          className={cn(
            'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
          )}
        />
      </span>
    </button>
  );
}
