// 前台客户订单页（/o/[orderNo]，订单模块第 3 期，需求文档 §4.1 / §7 / §8）
// 公开页，无需登录：员工通过微信把链接发给客户，客户点开（或扫二维码）直接看自己的订单。
// 语言由订单 lang 字段决定（不走 [locale]）；主题跟随 orders.theme（brand 默认 / classic）；
// noindex + OG 社交分享标签（§8）：WhatsApp/Telegram/Facebook 用 og:*，微信靠 <title> + 首图 + description
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getOrderPublic } from '@/lib/queries';
import { isValidLocale } from '@/i18n/config';
import { OrderPageView } from '@/components/order/OrderPageView';
import { OrderMissing } from '@/components/order/OrderMissing';

// 订单数据实时变化（员工后台随时改单），且页面按路径参数动态渲染，强制动态避免被缓存/预渲染
export const dynamic = 'force-dynamic';

// 与前台布局同一套域名取值逻辑：本地开发也输出正式域名（OG 标签给外部爬虫用）
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.includes('localhost')
  ? 'https://yiquantea.com'
  : process.env.NEXT_PUBLIC_SITE_URL || 'https://yiquantea.com';

// E1：Next 15 起 ctx.params 为 Promise
export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}): Promise<Metadata> {
  const { orderNo } = await params;
  const order = await getOrderPublic(decodeURIComponent(orderNo));
  const locale = order && isValidLocale(order.lang) ? order.lang : 'en';
  const t = await getTranslations({ locale, namespace: 'orderPage' });

  // ★订单页是私密链接，不让搜索引擎收录（§9，类比 /showcase 的 noindex）
  const noindex: Metadata = { robots: { index: false, follow: false } };
  if (!order) {
    return { ...noindex, title: t('notFoundTitle') };
  }

  // <title> 精确（微信卡片标题取 title，§8.2）：客户名 · 订单（懿泉茶业）
  const title = t('metaTitle', { name: order.customerName ?? t('customerGone') });

  // description = 订单摘要（如"金骏眉 ×1、茉莉飘雪 ×2 · 已发货"，商品名按订单语言）
  const zh = locale === 'zh';
  const summaryItems = order.items
    .slice(0, 5)
    .map((i) => {
      const name = (zh ? i.nameZh || i.nameEn : i.nameEn || i.nameZh) ?? '';
      return name ? `${name} ×${i.qty}` : '';
    })
    .filter(Boolean);
  if (order.items.length > 5) summaryItems.push('…');
  const statusText = order.status === 'shipped' ? t('statusShipped') : t('statusPending');
  const description = [...summaryItems, statusText].join(zh ? '、' : ', ');

  // og:image：首件商品主图 → 品牌 Logo → 站点图标（§8.1）；微信首图由页面正文第一张 <img> 承担；
  // 外部爬虫要求绝对 URL，相对路径（本地种子图）补全域名前缀；Logo 非 http 地址时丢弃不用作 og:image
  const rawImage = order.items.find((i) => i.thumbnail)?.thumbnail ?? null;
  const ogImage = rawImage
    ? rawImage.startsWith('/')
      ? `${SITE_URL}${rawImage}`
      : rawImage
    : order.logoUrl && /^https?:\/\//.test(order.logoUrl)
      ? order.logoUrl
      : `${SITE_URL}/icons/icon-512.png`;

  const url = `${SITE_URL}/o/${order.orderNo}`;

  return {
    ...noindex,
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'YiQuanTea',
      locale,
      type: 'website',
      images: [{ url: ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function OrderPage({ params }: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = await params;
  const order = await getOrderPublic(decodeURIComponent(orderNo));
  // 订单不存在 → 友好提示页（不调 notFound()：/o 在 [locale] 体系外，就近渲染双语提示）
  if (!order) return <OrderMissing />;
  return <OrderPageView order={order} />;
}
