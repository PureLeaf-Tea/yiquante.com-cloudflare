'use client';

// 标签页组件（Tabs.tsx）
// 支持受控（外部传 value + onChange）和非受控（传 defaultValue 内部自管）两种用法
// 激活态：品牌深绿文字 + 底部 2px 深绿下划线
import { useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

// 单个标签页
export interface TabItem {
  key: string;
  // 标签上的文字
  label: ReactNode;
  // 标签对应的内容面板
  children: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  // 受控：当前激活的标签 key
  value?: string;
  // 受控：切换回调
  onChange?: (key: string) => void;
  // 非受控：默认激活的标签 key
  defaultValue?: string;
  className?: string;
}

export function Tabs({ items, value, onChange, defaultValue, className }: TabsProps) {
  // 非受控模式用内部 state；受控模式以外部 value 为准
  const [innerValue, setInnerValue] = useState(defaultValue ?? items[0]?.key);
  const activeKey = value ?? innerValue;

  const handleSelect = (key: string) => {
    if (value === undefined) setInnerValue(key);
    onChange?.(key);
  };

  const activeItem = items.find((item) => item.key === activeKey);

  return (
    <div className={className}>
      {/* 标签头 */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200" role="tablist">
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleSelect(item.key)}
              className={cn(
                'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors min-h-touch',
                active
                  ? 'border-brand-green text-brand-green'
                  : 'border-transparent text-gray-500 hover:text-brand-green'
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {/* 当前标签的内容面板 */}
      <div className="pt-4" role="tabpanel">
        {activeItem?.children}
      </div>
    </div>
  );
}
