// 客户评价区（06 号文档 §3.6）
// 已审核的评价卡片：客户名、评分、内容；桌面 3 列，手机 1 列
import { getTranslations } from 'next-intl/server';
import { Star, Quote } from 'lucide-react';
import { getPublishedReviews } from '@/lib/queries';

export async function ReviewsSection({ locale }: { locale: string }) {
  const t = await getTranslations('home.reviews');
  const reviews = await getPublishedReviews();

  if (reviews.length === 0) return null;

  return (
    <section className="bg-white py-12" aria-label="客户评价">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mb-8 text-center font-serif text-2xl text-brand-green md:text-3xl">{t('title')}</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {reviews.map((r) => (
            <div key={r.id} className="relative rounded-xl border border-gray-100 bg-brand-cream p-6 shadow-sm">
              <Quote size={28} className="absolute right-4 top-4 text-brand-gold/40" aria-hidden="true" />
              {/* 星级 */}
              <div className="flex gap-0.5" aria-label={`${r.rating} 星评价`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={15}
                    className={i < r.rating ? 'fill-brand-gold text-brand-gold' : 'text-gray-300'}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">{r.content}</p>
              <p className="mt-4 text-sm font-medium text-brand-green">
                {r.name}
                {r.locale && <span className="ml-2 text-xs font-normal text-gray-400">{r.locale.toUpperCase()}</span>}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
