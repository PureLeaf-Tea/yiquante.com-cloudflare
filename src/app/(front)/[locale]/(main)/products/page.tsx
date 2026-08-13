// 产品列表页（/[locale]/products）
// 分类筛选（?cat=，含子树）+ 搜索（?search=）+ 分页 25/页；图片 LazyImage 懒加载
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PackageSearch } from 'lucide-react';
import { getAllCategories, getProductList } from '@/lib/queries';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductSearch } from '@/components/product/ProductSearch';
import { CategoryFilterSelect, type CategoryOption } from '@/components/product/CategoryFilterSelect';
import { ProductsPagination } from '@/components/product/ProductsPagination';
import { cn } from '@/lib/cn';

const PAGE_SIZE = 25; // 02 号文档 §9.7：默认 25 条/页

export default async function ProductsPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ cat?: string; search?: string; page?: string }>;
}) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;
  const locale = params.locale;
  const zh = locale === 'zh';
  const t = await getTranslations('nav');

  const categorySlug = searchParams.cat;
  const search = searchParams.search;
  const page = Math.max(1, Number(searchParams.page) || 1);

  // 分类树（桌面侧边栏 + 移动下拉共用数据）
  const allCats = await getAllCategories();
  const byParent = new Map<string | null, typeof allCats>();
  for (const c of allCats) {
    const key = c.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(c);
  }
  // 拍平为带层级的选项列表（排除 00 未分类）
  const flatOptions: CategoryOption[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const c of byParent.get(parentId) || []) {
      if (c.isProtected) continue;
      flatOptions.push({ slug: c.slug, label: zh ? c.nameZh : c.nameEn, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);

  const { items, total } = await getProductList({ categorySlug, search, page, pageSize: PAGE_SIZE });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 font-serif text-2xl text-brand-green md:text-3xl">{t('products')}</h1>

      {/* 搜索 + 移动端分类下拉 */}
      <div className="mb-6 space-y-3">
        <ProductSearch locale={locale} defaultValue={search || ''} categorySlug={categorySlug} />
        <CategoryFilterSelect locale={locale} options={flatOptions} current={categorySlug} search={search} />
      </div>

      <div className="flex gap-8">
        {/* 桌面端侧边分类树 */}
        <aside className="hidden w-52 shrink-0 md:block" aria-label={zh ? '分类筛选' : 'Category filter'}>
          <ul className="space-y-1">
            <li>
              <Link
                href={`/${locale}/products${search ? `?search=${encodeURIComponent(search)}` : ''}`}
                className={cn(
                  'block rounded-lg px-3 py-2 text-sm transition-colors',
                  !categorySlug ? 'bg-brand-green text-white' : 'text-gray-600 hover:bg-brand-green/10'
                )}
              >
                {zh ? '全部产品' : 'All Products'}
              </Link>
            </li>
            {flatOptions.map((opt) => (
              <li key={opt.slug}>
                <Link
                  href={`/${locale}/products?cat=${opt.slug}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                  className={cn(
                    'block rounded-lg px-3 py-2 text-sm transition-colors',
                    categorySlug === opt.slug ? 'bg-brand-green text-white' : 'text-gray-600 hover:bg-brand-green/10'
                  )}
                  style={{ paddingLeft: `${12 + opt.depth * 14}px` }}
                >
                  {opt.label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        {/* 产品网格 */}
        <div className="min-w-0 flex-1">
          {search && (
            <p className="mb-4 text-sm text-gray-500">
              {zh ? `搜索"${search}"，共 ${total} 个结果` : `Results for "${search}": ${total} items`}
            </p>
          )}

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-100 bg-white py-16 text-gray-400">
              <PackageSearch size={40} aria-hidden="true" />
              <p className="text-sm">{zh ? '没有找到匹配的产品' : 'No matching products found'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {items.map((p) => (
                <ProductCard key={p.id} locale={locale} product={p} />
              ))}
            </div>
          )}

          <ProductsPagination
            locale={locale}
            page={page}
            total={total}
            pageSize={PAGE_SIZE}
            categorySlug={categorySlug}
            search={search}
          />
        </div>
      </div>
    </div>
  );
}
