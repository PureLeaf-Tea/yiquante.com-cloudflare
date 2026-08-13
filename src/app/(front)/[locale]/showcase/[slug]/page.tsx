// 展示区独立详情页（/[locale]/showcase/[slug]，06 号文档 §六）
// ★无导航栏、无页脚（不经过 (main) 布局）；noindex 不被搜索收录；
// 内容同产品详情，价格按 showPriceInShowcase 显隐；独立语言切换器 + 二维码
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Leaf } from 'lucide-react';
import { getProductBySlug } from '@/lib/queries';
import { ProductDetailLayout } from '@/components/product/ProductDetailLayout';
import { ShowcaseLanguageSwitcher } from '@/components/showcase/ShowcaseLanguageSwitcher';
import { QRCodeButton } from '@/components/showcase/QRCodeButton';
import { StorefrontProviders } from '@/components/storefront/StorefrontProviders';

// ★noindex：展示区独立详情页不被搜索引擎收录（02 §9.6 / 06 §六）
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ShowcaseDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const params = await paramsPromise;
  const { locale, slug } = params;
  const zh = locale === 'zh';

  const data = await getProductBySlug(slug, locale);
  // 产品不存在或不属于任何展示区分类 → 404
  if (!data || !data.inShowcase) notFound();

  const { product } = data;
  const thumbnail = data.images[0]?.url ?? null;

  return (
    // 只要 Context（ProductInfo 的询价/对比按钮需要），不要浮动挂件（独立页规格）
    <StorefrontProviders locale={locale} widgets={false}>
    <div className="min-h-screen bg-white">
      {/* 极简顶栏：品牌标识 + 独立语言切换 + 二维码（无网站导航） */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href={`/${locale}/b2b`} className="flex items-center gap-2 text-brand-green">
            <Leaf size={20} className="text-brand-gold" aria-hidden="true" />
            <span className="font-serif">YiQuanTea</span>
          </Link>
          <div className="flex items-center gap-2">
            <QRCodeButton slug={slug} locale={locale} />
            <ShowcaseLanguageSwitcher currentLocale={locale} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <ProductDetailLayout
          layoutJson={data.layoutJson}
          locale={locale}
          showcaseMode
          images={data.images.map((i) => ({ url: i.url, alt: i.alt }))}
          info={{
            id: product.id,
            nameZh: product.nameZh,
            nameEn: product.nameEn,
            slug: product.slug,
            priceCNY: product.priceCNY,
            priceUSD: product.priceUSD,
            spec: product.spec,
            sku: product.sku,
            thumbnail,
            showPriceInShowcase: product.showPriceInShowcase,
          }}
          categoryName={zh ? data.categoryName : data.categoryNameEn}
          description={data.description}
          brewingGuide={data.brewingGuide}
          videos={data.videos.map((v) => ({ url: v.url, type: v.type, title: v.title, thumbnail: v.thumbnail }))}
          recommended={data.recommended}
        />
      </main>
    </div>
    </StorefrontProviders>
  );
}
