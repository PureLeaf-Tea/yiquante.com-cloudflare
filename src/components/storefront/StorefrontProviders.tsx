'use client';

// 前台状态 Provider 聚合（StorefrontProviders.tsx）
// 询价车 + 对比两个 Context，以及各自的浮动挂件；挂在 (main) 布局
// 展示区独立详情等页面可传 widgets={false}：只要 Context 不要浮动挂件
import type { ReactNode } from 'react';
import { InquiryCartProvider } from './InquiryCartContext';
import { CompareProvider } from './CompareContext';
import { InquiryCart } from './InquiryCart';
import { CompareBar } from './CompareBar';

export function StorefrontProviders({
  children,
  locale,
  widgets = true,
}: {
  children: ReactNode;
  locale: string;
  widgets?: boolean;
}) {
  return (
    <InquiryCartProvider>
      <CompareProvider>
        {children}
        {widgets && <InquiryCart locale={locale} />}
        {widgets && <CompareBar locale={locale} />}
      </CompareProvider>
    </InquiryCartProvider>
  );
}
