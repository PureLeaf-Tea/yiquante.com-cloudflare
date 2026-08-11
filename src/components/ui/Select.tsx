'use client';

// 下拉选择组件（Select.tsx）
// 规范（08 号文档 §2）：标签 + 说明文字三要素；用原生 <select> 保证移动端弹出系统选择器体验
import { forwardRef, useId } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

// 单个选项
export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  required?: boolean;
  helpText?: string;
  error?: string;
  options: SelectOption[];
  // 未选择时的占位项（如"请选择分类"）
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, required, helpText, error, options, placeholder, className, id, ...props }, ref) => {
    const autoId = useId();
    const selectId = id || autoId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
            {required && <span className="text-red-600 ml-0.5">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full min-h-touch rounded-lg border bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition-colors',
            'focus:border-brand-green focus:ring-1 focus:ring-brand-green',
            error ? 'border-red-500' : 'border-gray-300',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error ? (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        ) : helpText ? (
          <p className="mt-1 text-xs text-gray-500">{helpText}</p>
        ) : null}
      </div>
    );
  }
);
Select.displayName = 'Select';

export { Select };
