// 样品申请页（/[locale]/sample，06 号文档 §7）
import { getTranslations } from 'next-intl/server';
import { SampleRequestForm } from '@/components/sample/SampleRequestForm';

export default async function SamplePage({ params: paramsPromise }: { params: Promise<{ locale: string }> }) {
  const params = await paramsPromise;
  const t = await getTranslations('sample');

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 font-serif text-2xl text-brand-green md:text-3xl">{t('pageTitle')}</h1>
      <SampleRequestForm locale={params.locale} />
    </div>
  );
}
