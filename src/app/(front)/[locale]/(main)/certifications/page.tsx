// 认证资质页（/[locale]/certifications）
// 证书图网格 + 页面文案（page_contents）
import { BadgeCheck } from 'lucide-react';
import { getPageContent, getCertificationList } from '@/lib/queries';

export default async function CertificationsPage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';
  const content = await getPageContent('certifications');
  const certs = await getCertificationList();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-4 font-serif text-2xl text-brand-green md:text-3xl">
        {content ? (zh ? content.titleZh : content.titleEn) : zh ? '认证资质' : 'Certifications'}
      </h1>
      <p className="mb-8 text-sm leading-relaxed text-gray-600">
        {content ? (zh ? content.contentZh : content.contentEn) : ''}
      </p>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {certs.map((c) => (
          <div key={c.id} className="flex flex-col items-center rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            {c.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.imageUrl} alt={zh ? c.nameZh : c.nameEn} className="h-32 w-full rounded-lg object-cover" />
            ) : (
              <div className="flex h-32 w-full items-center justify-center rounded-lg bg-brand-green/10">
                <BadgeCheck size={36} className="text-brand-gold" aria-hidden="true" />
              </div>
            )}
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-brand-green">
              <BadgeCheck size={15} className="text-brand-gold" aria-hidden="true" />
              {zh ? c.nameZh : c.nameEn}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
