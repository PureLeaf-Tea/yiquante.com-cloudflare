// 客户订单页根布局（(order)/o/[orderNo]/layout.tsx，订单模块第 3 期）
// /o/[orderNo] 不走 [locale] 路由组（需求文档 §4.1/§9）：与 (front)/(admin) 一样，
// 用路由组 (order) 挂独立根布局（html/body），<html lang> 由订单 lang 字段决定；
// 查询与页面共用 getOrderPublic（React.cache 去重，同请求内只查一次库）
import type { Viewport } from 'next';
import { getOrderPublic } from '@/lib/queries';
import { isValidLocale } from '@/i18n/config';
import '../../../globals.css';

// PWA 主题色（与前台布局一致，走主站品牌深绿）
export const viewport: Viewport = {
  themeColor: '#1a3a1a',
};

export default async function OrderLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orderNo: string }>;
}) {
  const { orderNo } = await params;
  // 订单可能不存在（页面内渲染友好提示）；lang 非法时回退 en
  const order = await getOrderPublic(decodeURIComponent(orderNo));
  const lang = order && isValidLocale(order.lang) ? order.lang : 'en';

  return (
    <html lang={lang}>
      <body>{children}</body>
    </html>
  );
}
