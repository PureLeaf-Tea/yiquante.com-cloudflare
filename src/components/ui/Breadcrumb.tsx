// 面包屑导航组件（Breadcrumb.tsx）
// 用 ChevronRight（右箭头）图标分隔层级，最后一级高亮显示且不可点击
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/cn';

// 面包屑中的一级
export interface BreadcrumbItem {
  label: string;
  // 跳转路径；最后一级不传 href
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="面包屑导航" className={cn('flex items-center flex-wrap text-sm', className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="flex items-center">
            {index > 0 && <ChevronRight size={14} className="mx-1.5 text-gray-400" aria-hidden="true" />}
            {isLast ? (
              // 末级：当前页，高亮不可点
              <span className="font-medium text-brand-green" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href || '/'}
                className="flex items-center gap-1 text-gray-500 hover:text-brand-green transition-colors"
              >
                {index === 0 && <Home size={14} aria-hidden="true" />}
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
