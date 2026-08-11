'use client';

// 产品搜索框（ProductSearch.tsx）
// 回车/点击搜索：带 search 参数跳转产品列表（保留当前分类筛选）
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export function ProductSearch({
  locale,
  defaultValue = '',
  categorySlug,
}: {
  locale: string;
  defaultValue?: string;
  categorySlug?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  const submit = () => {
    const params = new URLSearchParams();
    if (value.trim()) params.set('search', value.trim());
    if (categorySlug) params.set('cat', categorySlug);
    router.push(`/${locale}/products${params.toString() ? '?' + params.toString() : ''}`);
  };

  return (
    <div className="flex w-full gap-2">
      <div className="relative flex-1">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder={locale === 'zh' ? '搜索产品...' : 'Search products...'}
          aria-label={locale === 'zh' ? '搜索产品' : 'Search products'}
          className="min-h-touch w-full rounded-btn border border-gray-300 bg-white pl-9 pr-4 text-sm outline-none placeholder:text-gray-400 focus:border-brand-green"
        />
      </div>
      <button
        type="button"
        onClick={submit}
        className="inline-flex min-h-touch items-center gap-1.5 rounded-btn bg-brand-green px-5 text-sm font-medium text-white hover:bg-brand-green/90"
      >
        <Search size={15} aria-hidden="true" />
        {locale === 'zh' ? '搜索' : 'Search'}
      </button>
    </div>
  );
}
