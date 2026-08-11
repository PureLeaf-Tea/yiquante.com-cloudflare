'use client';

// 分类筛选（移动端下拉，CategoryFilterSelect.tsx）
// 桌面端用侧边分类树，移动端收纳为下拉选择
import { useRouter } from 'next/navigation';

export interface CategoryOption {
  slug: string;
  label: string;
  depth: number; // 层级（用于缩进显示）
}

export function CategoryFilterSelect({
  locale,
  options,
  current,
  search,
}: {
  locale: string;
  options: CategoryOption[];
  current?: string;
  search?: string;
}) {
  const router = useRouter();

  const handleChange = (slug: string) => {
    const params = new URLSearchParams();
    if (slug) params.set('cat', slug);
    if (search) params.set('search', search);
    router.push(`/${locale}/products${params.toString() ? '?' + params.toString() : ''}`);
  };

  return (
    <select
      aria-label={locale === 'zh' ? '按分类筛选' : 'Filter by category'}
      value={current || ''}
      onChange={(e) => handleChange(e.target.value)}
      className="min-h-touch w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-brand-green md:hidden"
    >
      <option value="">{locale === 'zh' ? '全部分类' : 'All Categories'}</option>
      {options.map((opt) => (
        <option key={opt.slug} value={opt.slug}>
          {' '.repeat(opt.depth)}
          {opt.label}
        </option>
      ))}
    </select>
  );
}
