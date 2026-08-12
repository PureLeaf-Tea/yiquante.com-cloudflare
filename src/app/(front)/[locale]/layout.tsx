// 前台语言根布局（阶段 10 重构）
// 只负责 html/body + 多语言 Provider + Toast；导航页脚由 (main) 分组布局承担，
// 这样展示区独立详情等"无导航页脚"页面可以直接挂在 [locale] 下
import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { isValidLocale } from '@/i18n/config';
import { ToastProvider } from '@/components/ui/Toast';
import { SWRegister } from '@/components/ui/SWRegister';
import '../../globals.css';

// PWA 主题色（Next 14 要求走 viewport 导出）
export const viewport: Viewport = {
  themeColor: '#166534',
};

// 页面级元数据：基础标题 + hreflang 六语言互指 + x-default + Open Graph（16 号文档 §八）
export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const locale = params.locale;
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.includes('localhost')
    ? 'https://yiquantea.com'
    : process.env.NEXT_PUBLIC_SITE_URL || 'https://yiquantea.com';
  const locales = ['zh', 'en', 'ru', 'de', 'es', 'fr'];
  const languages: Record<string, string> = { 'x-default': `${SITE_URL}/en` };
  for (const l of locales) languages[l] = `${SITE_URL}/${l}`;

  return {
    title: 'YiQuanTea - Whole Leaf · Pure Nature',
    description: '懿泉茶业 YiQuanTea.com — 原叶 · 纯净自然',
    // PWA：manifest + iOS 全屏（收尾任务 1）；主题色见 viewport 导出
    manifest: '/manifest.json',
    appleWebApp: { capable: true, statusBarStyle: 'default', title: '懿泉茶业' },
    alternates: { canonical: `${SITE_URL}/${locale}`, languages },
    openGraph: {
      title: 'YiQuanTea - Whole Leaf · Pure Nature',
      description: '懿泉茶业 YiQuanTea — 嵩山原叶茶批发与出口 | Mount Song whole-leaf tea wholesale',
      siteName: 'YiQuanTea',
      locale,
      type: 'website',
    },
  };
}

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
          {children}
          <ToastProvider />
        </NextIntlClientProvider>
        <SWRegister />
      </body>
    </html>
  );
}
