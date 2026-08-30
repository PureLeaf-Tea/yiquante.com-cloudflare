// 产品详情页（/[locale]/products/[slug]）
// 按后台拖拽布局渲染区块；下架产品未登录 → 404；
// 订单场景（订单模块第 4 期，需求文档 §4.2）：?from=order&lang=xx 时按商品 showPriceInOrder
// 隐藏价格/询价/推荐（默认隐藏），并按 lang 定位到对应语言版本；
// OG 社交分享标签（§8.1）：输出 products 表已有的 ogTitle/ogDescription/ogImage
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getProductBySlug } from '@/lib/queries';
import { isValidLocale } from '@/i18n/config';
import { ProductDetailLayout } from '@/components/product/ProductDetailLayout';

// 与前台布局/订单页同一套域名取值逻辑：本地开发也输出正式域名（OG 标签给外部爬虫用）
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.includes('localhost')
  ? 'https://yiquantea.com'
  : process.env.NEXT_PUBLIC_SITE_URL || 'https://yiquantea.com';

type RouteParams = { locale: string; slug: string };
type RouteSearchParams = { from?: string; lang?: string };

// E1：Next 15 起 ctx.params / searchParams 均为 Promise
export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await getProductBySlug(slug, locale);
  if (!data) return {};

  const { product } = data;
  const name = locale === 'zh' ? product.nameZh : product.nameEn;

  // OG 三件套：后台已配则优先，否则回退产品名/描述/首图（§8.1）
  const title = product.ogTitle || name;
  const rawDesc = product.ogDescription || data.description.replace(/\s+/g, ' ').trim();
  const description = rawDesc.length > 160 ? `${rawDesc.slice(0, 157)}...` : rawDesc;
  const rawImage = product.ogImage || data.images[0]?.url || null;
  // 外部爬虫要求绝对 URL：相对路径（本地种子图）补全域名前缀（与订单页同款处理）
  const ogImage = rawImage ? (rawImage.startsWith('/') ? `${SITE_URL}${rawImage}` : rawImage) : null;
  const url = `${SITE_URL}/${locale}/products/${slug}`;

  return {
    title,
    description: description || undefined,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: description || undefined,
      url,
      siteName: 'YiQuanTea',
      locale,
      type: 'website',
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description || undefined,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<RouteSearchParams>;
}) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;
  const { locale, slug } = params;
  const zh = locale === 'zh';

  // 订单场景（§4.2）：从 /o/ 订单页带 ?from=order&lang=xx 跳转而来；
  // lang 与路径语言不一致时纠偏重定向，保证按订单语言定位（如俄语订单 → /ru/products/slug）
  const fromOrder = searchParams.from === 'order';
  if (fromOrder && isValidLocale(searchParams.lang) && searchParams.lang !== locale) {
    redirect(`/${searchParams.lang}/products/${slug}?from=order&lang=${searchParams.lang}`);
  }

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

  // schema.org Product 结构化数据（16 号文档 §八）；
  // 订单场景隐藏价格时不带 offers 节点（价格不外泄，§4.2）
  const hidePriceInOrder = fromOrder && !product.showPriceInOrder;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    image: thumbnail ? [thumbnail] : undefined,
    description: data.description || undefined,
    sku: product.sku || undefined,
    offers: hidePriceInOrder
      ? undefined
      : {
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
          showPriceInOrder: product.showPriceInOrder,
        }}
        categoryName={zh ? data.categoryName : data.categoryNameEn}
        description={data.description}
        brewingGuide={data.brewingGuide}
        origin={data.origin}
        process={data.process}
        videos={data.videos.map((v) => ({ url: v.url, type: v.type, title: v.title, thumbnail: v.thumbnail }))}
        recommended={data.recommended}
        orderMode={fromOrder}
        showPriceInOrder={product.showPriceInOrder}
      />
    </div>
  );
}
