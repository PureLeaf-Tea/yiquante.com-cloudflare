// 隐私政策页（/[locale]/privacy，含 GDPR 数据权利说明）
import { getPageContent } from '@/lib/queries';

export default async function PrivacyPage({ params: paramsPromise }: { params: Promise<{ locale: string }> }) {
  const params = await paramsPromise;
  const zh = params.locale === 'zh';
  const content = await getPageContent('privacy');

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 font-serif text-2xl text-brand-green md:text-3xl">
        {content ? (zh ? content.titleZh : content.titleEn) : zh ? '隐私政策' : 'Privacy Policy'}
      </h1>
      <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">
        {content
          ? zh ? content.contentZh : content.contentEn
          : zh ? '内容整理中...' : 'Content coming soon...'}
      </p>
    </div>
  );
}
