'use client';

// 产品列表分页包装（ProductsPagination.tsx）
// 复用 ui/Pagination，翻页时保留 cat/search 参数
import { useRouter } from 'next/navigation';
import { Pagination } from '@/components/ui/Pagination';

export function ProductsPagination({
  locale,
  page,
  total,
  pageSize,
  categorySlug,
  search,
}: {
  locale: string;
  page: number;
  total: number;
  pageSize: number;
  categorySlug?: string;
  search?: string;
}) {
  const router = useRouter();

  const handleChange = (next: number) => {
    const params = new URLSearchParams();
    if (categorySlug) params.set('cat', categorySlug);
    if (search) params.set('search', search);
    if (next > 1) params.set('page', String(next));
    router.push(`/${locale}/products${params.toString() ? '?' + params.toString() : ''}`);
    // 翻页回到列表顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mt-8 flex justify-center" aria-label={locale === 'zh' ? '分页' : 'Pagination'}>
      <Pagination page={page} total={total} pageSize={pageSize} onChange={handleChange} />
    </div>
  );
}
