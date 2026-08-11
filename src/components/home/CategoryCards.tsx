// 分类卡片区（06 号文档 §3.3）
// 8 个一级分类：桌面 4 列 → 平板 3 列 → 手机 2 列；图片懒加载
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LazyImage } from '@/components/ui/LazyImage';
import { getTopCategories } from '@/lib/queries';

export async function CategoryCards({ locale }: { locale: string }) {
  const t = await getTranslations('home.categories');
  const cats = await getTopCategories();

  return (
    <section className="mx-auto max-w-6xl px-4 py-12" aria-label="产品分类">
      <h2 className="mb-8 text-center font-serif text-2xl text-brand-green md:text-3xl">{t('title')}</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {cats.map((cat) => (
          <Link
            key={cat.id}
            href={`/products?cat=${cat.slug}`}
            className="group overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-lg"
          >
            <div className="overflow-hidden">
              <LazyImage
                src={cat.image || ''}
                alt={locale === 'zh' ? cat.nameZh : cat.nameEn}
                width={400}
                height={400}
                className="transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="p-3 text-center">
              <h3 className="text-sm font-medium text-brand-green md:text-base">
                {locale === 'zh' ? cat.nameZh : cat.nameEn}
              </h3>
              <p className="mt-1 text-xs text-gray-400">
                {cat.productCount} {locale === 'zh' ? '款产品' : 'products'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
