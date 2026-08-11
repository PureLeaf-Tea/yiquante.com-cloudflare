'use client';

// 分页组件（Pagination.tsx）
// 默认每页 25 条（02 号文档 §9.7）；上一页/下一页 + 页码按钮，按钮 ≥48px 触摸尺寸
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface PaginationProps {
  // 当前页（从 1 开始）
  page: number;
  // 总记录数
  total: number;
  // 每页条数（默认 25）
  pageSize?: number;
  // 翻页回调
  onChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, total, pageSize = 25, onChange, className }: PaginationProps) {
  // 总页数（至少 1 页）
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  // 页码窗口：当前页前后各 2 页，边界收敛
  const windowStart = Math.max(1, Math.min(page - 2, totalPages - 4));
  const windowEnd = Math.min(totalPages, windowStart + 4);
  const pages = Array.from({ length: windowEnd - windowStart + 1 }, (_, i) => windowStart + i);

  const baseBtn =
    'inline-flex items-center justify-center min-h-touch min-w-touch rounded-lg text-sm transition-colors';

  return (
    <nav aria-label="分页" className={cn('flex items-center gap-1.5 flex-wrap', className)}>
      {/* 上一页 */}
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="上一页"
        className={cn(baseBtn, 'border border-gray-300 text-gray-600 hover:border-brand-green hover:text-brand-green disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:text-gray-600')}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>

      {/* 页码 */}
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
          className={cn(
            baseBtn,
            p === page
              ? 'bg-brand-green text-white'
              : 'border border-gray-300 text-gray-600 hover:border-brand-green hover:text-brand-green'
          )}
        >
          {p}
        </button>
      ))}

      {/* 下一页 */}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="下一页"
        className={cn(baseBtn, 'border border-gray-300 text-gray-600 hover:border-brand-green hover:text-brand-green disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:text-gray-600')}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}
