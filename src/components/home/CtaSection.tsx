// CTA 行动区（06 号文档 §3.7）
// 深绿背景 + 白色按钮：「立即询价」+「申请样品」
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Send, FlaskConical } from 'lucide-react';
import { getCtaButtons } from '@/lib/queries';

export async function CtaSection({ locale }: { locale: string }) {
  const t = await getTranslations('home.cta');
  const buttons = await getCtaButtons();

  // 两个按钮的图标（按顺序：询价 / 样品）
  const icons = [Send, FlaskConical];

  return (
    <section className="bg-brand-green py-14" aria-label="行动号召">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <h2 className="font-serif text-2xl text-white md:text-3xl">{t('title')}</h2>
        <div className="mt-7 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {buttons.map((b, i) => {
            const Icon = icons[i] || Send;
            return (
              <Link
                key={b.id}
                href={`/${locale}${b.linkUrl}`}
                className="inline-flex min-h-touch min-w-touch items-center gap-2 rounded-btn border-2 border-white px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-white hover:text-brand-green"
              >
                <Icon size={16} aria-hidden="true" />
                {locale === 'zh' ? b.textZh : b.textEn}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
