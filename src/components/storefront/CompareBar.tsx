'use client';

// 对比浮动栏（CompareBar.tsx）
// 底部居中浮动：已选产品缩略图 + 去对比 + 清空；选中 1 个以上即出现
import Link from 'next/link';
import { Scale, X } from 'lucide-react';
import { useCompare } from './CompareContext';

export function CompareBar({ locale }: { locale: string }) {
  const { items, remove, clear } = useCompare();

  if (items.length === 0) return null;

  const ids = items.map((i) => i.productId).join(',');

  return (
    <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-2xl -translate-x-1/2 px-4 pb-4">
      <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-xl">
        <Scale size={18} className="shrink-0 text-brand-green" aria-hidden="true" />

        {/* 已选缩略图（可移除） */}
        <div className="flex flex-1 gap-2 overflow-x-auto">
          {items.map((item) => (
            <div key={item.productId} className="relative shrink-0">
              {item.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.thumbnail}
                  alt={locale === 'zh' ? item.nameZh : item.nameEn}
                  className="h-12 w-12 rounded-lg border border-gray-100 object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-gray-100" />
              )}
              <button
                type="button"
                aria-label={locale === 'zh' ? '移除对比' : 'Remove from compare'}
                onClick={() => remove(item.productId)}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-red-600 p-0.5 text-white hover:bg-red-700"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>

        <Link
          href={`/${locale}/compare?ids=${ids}`}
          className="inline-flex min-h-touch shrink-0 items-center gap-1.5 rounded-btn bg-brand-green px-5 text-sm font-medium text-white hover:bg-brand-green/90"
        >
          {locale === 'zh' ? `去对比（${items.length}）` : `Compare (${items.length})`}
        </Link>
        <button
          type="button"
          onClick={clear}
          className="shrink-0 text-xs text-gray-400 hover:text-red-600"
        >
          {locale === 'zh' ? '清空' : 'Clear'}
        </button>
      </div>
    </div>
  );
}
