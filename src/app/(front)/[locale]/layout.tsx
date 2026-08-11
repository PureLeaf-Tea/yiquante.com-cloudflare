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
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
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
