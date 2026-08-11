// 前台语言根布局（阶段 10 重构）
// 只负责 html/body + 多语言 Provider + Toast；导航页脚由 (main) 分组布局承担，
// 这样展示区独立详情等"无导航页脚"页面可以直接挂在 [locale] 下
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { isValidLocale } from '@/i18n/config';
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
          {children}
          <ToastProvider />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
