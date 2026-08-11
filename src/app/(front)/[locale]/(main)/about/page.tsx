// 关于我们页（/[locale]/about）
import { getPageContent } from '@/lib/queries';

export default async function AboutPage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';
  const content = await getPageContent('about');

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 font-serif text-2xl text-brand-green md:text-3xl">
        {content ? (zh ? content.titleZh : content.titleEn) : zh ? '关于我们' : 'About Us'}
      </h1>
      <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">
        {content
          ? zh ? content.contentZh : content.contentEn
          : zh ? '内容整理中...' : 'Content coming soon...'}
      </p>
    </div>
  );
}
