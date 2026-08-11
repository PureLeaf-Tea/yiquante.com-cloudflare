// 认证展示区（06 号文档 §3.5）
// 认证证书图展示：桌面 3 列（此处 4 张用 4 列网格自适应），手机 1 列
import { getTranslations } from 'next-intl/server';
import { BadgeCheck } from 'lucide-react';
import { LazyImage } from '@/components/ui/LazyImage';
import { getCertifications } from '@/lib/queries';

export async function Certifications({ locale }: { locale: string }) {
  const t = await getTranslations('home.certifications');
  const certs = await getCertifications();

  return (
    <section className="mx-auto max-w-6xl px-4 py-12" aria-label="认证资质">
      <h2 className="mb-8 text-center font-serif text-2xl text-brand-green md:text-3xl">{t('title')}</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {certs.map((c) => (
          <div
            key={c.id}
            className="flex flex-col items-center rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <LazyImage
              src={c.imageUrl || ''}
              alt={locale === 'zh' ? c.nameZh : c.nameEn}
              width={600}
              height={400}
              objectFit="contain"
              className="rounded-lg"
            />
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-brand-green">
              <BadgeCheck size={16} className="text-brand-gold" aria-hidden="true" />
              {locale === 'zh' ? c.nameZh : c.nameEn}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
