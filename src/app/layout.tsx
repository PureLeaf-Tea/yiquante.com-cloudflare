import type { Metadata } from 'next';
import './globals.css';

// 全站元数据（SEO 标题和描述，后续由 SEO 设置表动态覆盖）
export const metadata: Metadata = {
  title: 'YiQuanTea - Whole Leaf · Pure Nature',
  description: '懿泉茶业 YiQuanTea.com — 原叶 · 纯净自然',
};

// 根布局：所有页面共用的 HTML 骨架
// 阶段 6 会拆分为前台 [locale]/layout.tsx 和后台 admin/layout.tsx
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
