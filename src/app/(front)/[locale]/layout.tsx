// 前台根布局（(front)/[locale]/layout.tsx）
// 路由组 (front)：括号目录不参与 URL，前台多语言页面拥有独立的 html/body
// 结构：Header（顶栏）+ 页面内容 + Footer（仅首页）+ GDPR 横幅 + Toast 挂载点
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { isValidLocale } from '@/i18n/config';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { GDPRConsentBanner } from '@/components/layout/GDPRConsentBanner';
import { ToastProvider } from '@/components/ui/Toast';
import '../../globals.css';

export const metadata: Metadata = {
  title: 'YiQuanTea - Whole Leaf · Pure Nature',
  description: '懿泉茶业 YiQuanTea.com — 原叶 · 纯净自然',
};

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // 语言代码非法直接 404（next-intl 官方推荐写法）
  if (!isValidLocale(locale)) {
    notFound();
  }

  // 服务端取出当前语言的翻译字典，注入客户端 Provider
  // ★必须显式传 locale：中间件接入前 requestLocale 为空，不传会永远回退英文
  const messages = await getMessages({ locale });

  return (
    <html lang={locale}>
      <body>
        {/* 缺译兜底策略：6 个翻译文件的键集合由校验脚本保证一致，新增键时必须同步 6 语言 */}
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Header locale={locale} />
          <main className="min-h-screen">{children}</main>
          <Footer locale={locale} />
          <GDPRConsentBanner />
          <ToastProvider />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
