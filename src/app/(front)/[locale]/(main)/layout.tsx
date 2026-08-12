// (main) 分组布局：标准前台页面（首页/产品/对比/询价等）
// 结构：Header + 内容 + Footer + GDPR 横幅 + 询价车/对比浮动组件
// 展示区独立详情等"无导航页脚"页面不经过本布局
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { GDPRConsentBanner } from '@/components/layout/GDPRConsentBanner';
import { StorefrontProviders } from '@/components/storefront/StorefrontProviders';
import { ChatWidget } from '@/components/chat/ChatWidget';

export default function MainLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <StorefrontProviders locale={locale}>
      <Header locale={locale} />
      <main className="min-h-screen">{children}</main>
      <Footer locale={locale} />
      <GDPRConsentBanner />
      <ChatWidget locale={locale} />
    </StorefrontProviders>
  );
}
