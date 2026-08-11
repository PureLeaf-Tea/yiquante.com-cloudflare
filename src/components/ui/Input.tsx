'use client';

// 输入框组件（Input.tsx）
// 规范（08 号文档 §2）：标签（必填星号）+ 占位提示 + 说明文字三要素缺一不可；
// 错误时红框 + 红色提示；密码框 autocomplete="off" + 眼睛图标切换明文
import { forwardRef, useId, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  // 标签文字（如"产品中文名"）
  label?: string;
  // 是否必填（标签后显示红色星号）
  required?: boolean;
  // 说明文字（灰色小字，解释这个输入框是干什么的）
  helpText?: string;
  // 错误信息（非空时输入框变红框并显示此文字）
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, required, helpText, error, type, className, id, ...props }, ref) => {
    // useId：React 生成的唯一 ID，保证 label 和 input 的关联（无障碍）
    const autoId = useId();
    const inputId = id || autoId;

    // 密码框的明文/密文切换状态
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const actualType = isPassword && showPassword ? 'text' : type;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
            {required && <span className="text-red-600 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={actualType}
            // 密码框禁止浏览器自动填充/保存（08 §2.3）
            autoComplete={isPassword ? 'off' : undefined}
            className={cn(
              'w-full min-h-touch rounded-lg border bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition-colors',
              'placeholder:text-gray-400 focus:border-brand-green focus:ring-1 focus:ring-brand-green',
              error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300',
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              aria-label={showPassword ? '隐藏密码' : '显示密码'}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-brand-green"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
        {error ? (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        ) : helpText ? (
          <p className="mt-1 text-xs text-gray-500">{helpText}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
