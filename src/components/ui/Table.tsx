'use client';

// 表格组件（Table.tsx）
// 列定义 + 数据渲染 + 加载骨架 + 空状态；移动端容器横向滚动（卡片化由各业务页自行处理）
import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { Skeleton } from './Skeleton';
import { cn } from '@/lib/cn';

// 一列的定义
export interface TableColumn<T> {
  // 唯一标识（取数据字段名或自定义 key）
  key: string;
  // 表头文字
  title: ReactNode;
  // 自定义单元格渲染（不传则直接显示 row[key]）
  render?: (row: T) => ReactNode;
  // 列宽类（如 w-32）
  className?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  // 每行的唯一 key 提取函数
  rowKey: (row: T) => string;
  // 加载中显示骨架行
  loading?: boolean;
  // 无数据时显示的提示（默认"暂无数据"）
  emptyText?: string;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  loading,
  emptyText = '暂无数据',
}: TableProps<T>) {
  return (
    // 外层容器：窄屏时横向滚动，表格不被压坏
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left">
            {columns.map((col) => (
              <th key={col.key} className={cn('px-4 py-3 font-medium text-gray-600 whitespace-nowrap', col.className)}>
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            // 加载态：骨架行（数量跟随列数自适应 5 行）
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`skeleton-${i}`} className="border-b border-gray-100">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <Skeleton shape="line" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            // 空状态
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">
                <Inbox size={32} className="mx-auto mb-2" aria-hidden="true" />
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={rowKey(row)} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3 text-gray-700', col.className)}>
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
