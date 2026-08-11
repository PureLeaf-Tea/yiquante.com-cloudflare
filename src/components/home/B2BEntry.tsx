// B2B 产品入口卡片（06 号文档 §3.2）
// 位置：认证展示区之后、客户评价之前；所有人可见无需登录；点击跳转 /b2b
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Package, ArrowRight } from 'lucide-react';

export function B2BEntry({ locale }: { locale: string }) {
  const t = useTranslations('home.b2bEntry');

  return (
    <section className="mx-auto max-w-6xl px-4 py-6" aria-label="B2B 产品入口">
      <Link
        href={`/${locale}/b2b`}
        className="group flex flex-col gap-4 rounded-2xl bg-brand-green p-8 text-white shadow-md transition-shadow hover:shadow-xl md:flex-row md:items-center md:justify-between"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/10">
            <Package size={28} className="text-brand-gold" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-serif text-xl md:text-2xl">{t('title')}</h2>
            <p className="mt-1 text-sm text-white/75">{t('desc')}</p>
          </div>
        </div>
        {/* 进入按钮（图标 + 文字规范） */}
        <span className="inline-flex min-h-touch items-center gap-2 self-start rounded-btn border-2 border-brand-gold px-6 py-2 text-sm font-medium text-brand-gold transition-colors group-hover:bg-brand-gold group-hover:text-brand-green md:self-center">
          {t('btn')}
          <ArrowRight size={16} aria-hidden="true" />
        </span>
      </Link>
    </section>
  );
}
