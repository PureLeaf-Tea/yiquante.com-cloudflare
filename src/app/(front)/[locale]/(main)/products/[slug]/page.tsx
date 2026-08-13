// 产品详情页（/[locale]/products/[slug]）
// 按后台拖拽布局渲染 7 区块；下架产品未登录 → 404
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getProductBySlug } from '@/lib/queries';
import { ProductDetailLayout } from '@/components/product/ProductDetailLayout';

export default async function ProductDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const params = await paramsPromise;
  const { locale, slug } = params;
  const zh = locale === 'zh';

  const data = await getProductBySlug(slug, locale);
  if (!data) notFound();

  // 下架产品：未登录返回 404（05 号文档 §4.2 规则）
  if (data.product.status !== 'active') {
    const user = await getCurrentUser();
    if (!user) notFound();
  }

  const { product } = data;
  const name = zh ? product.nameZh : product.nameEn;
  const thumbnail = data.images[0]?.url ?? null;

  // schema.org Product 结构化数据（16 号文档 §八）
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    image: thumbnail ? [thumbnail] : undefined,
    description: data.description || undefined,
    sku: product.sku || undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'CNY',
      price: product.priceCNY,
      availability: product.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* schema.org 结构化数据；R4：将 '<' 转义为 \u003c（合法 JSON 转义，语义不变），防产品名/描述含 </script> 截断标签 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      {/* 面包屑 */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-400" aria-label="面包屑">
        <Link href={`/${locale}`} className="hover:text-brand-green">
          {zh ? '首页' : 'Home'}
        </Link>
        <ChevronRight size={13} aria-hidden="true" />
        <Link href={`/${locale}/products`} className="hover:text-brand-green">
          {zh ? '产品' : 'Products'}
        </Link>
        <ChevronRight size={13} aria-hidden="true" />
        <span className="text-brand-green">{name}</span>
      </nav>

      <ProductDetailLayout
        layoutJson={data.layoutJson}
        locale={locale}
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
    </div>
  );
}
