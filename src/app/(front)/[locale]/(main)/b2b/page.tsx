// B2B 入口页（/[locale]/b2b，06 号文档 §4.1）
// 公开访问：标题 + 分类卡片网格（桌面 2 列/手机 1 列，封面 16:10，无图品牌绿底）
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { getShowcaseEntryCategories } from '@/lib/queries';

export default async function B2BEntryPage({ params }: { params: { locale: string } }) {
  const locale = params.locale;
  const zh = locale === 'zh';
  const t = await getTranslations('b2b');
  const cats = await getShowcaseEntryCategories();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link
        href={`/${locale}`}
        className="mb-6 inline-flex min-h-10 items-center gap-1.5 text-sm text-gray-500 hover:text-brand-green"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        {zh ? '返回首页' : 'Back to Home'}
      </Link>

      <div className="mb-10 text-center">
        <h1 className="font-serif text-3xl text-brand-green">{t('pageTitle')}</h1>
        <p className="mt-2 text-gray-500">{t('pageSubtitle')}</p>
        <p className="mt-1 text-sm text-gray-400">{t('pageHint')}</p>
      </div>

      {cats.length === 0 ? (
        <p className="rounded-xl border border-gray-100 bg-white py-16 text-center text-sm text-gray-400">
          {t('noCategories')}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {cats.map((cat) => {
            const name = zh ? cat.nameZh : cat.nameEn;
            return (
              <Link
                key={cat.id}
                href={`/${locale}/b2b/${cat.slug}`}
                className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:border-brand-gold hover:shadow-lg"
              >
                {/* 封面 16:10；无图时品牌绿底 + 分类名 */}
                <div className="relative aspect-[16/10] w-full overflow-hidden">
                  {cat.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cat.image}
                      alt={name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-brand-green transition-transform duration-300 group-hover:scale-105">
                      <span className="px-6 text-center font-serif text-2xl text-white">{name}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between p-5">
                  <div>
                    <h2 className="text-base font-semibold text-brand-green">{name}</h2>
                    <p className="mt-1 line-clamp-1 text-sm text-gray-400">
                      {zh ? cat.descriptionZh : cat.descriptionEn}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-gold">
                    {t('categoryEnter').replace(' →', '').replace('→', '')}
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
