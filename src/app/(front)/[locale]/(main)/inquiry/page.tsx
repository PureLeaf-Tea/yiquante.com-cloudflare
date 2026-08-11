// 询价提交页（/[locale]/inquiry）
import { InquiryForm } from '@/components/inquiry/InquiryForm';

export default function InquiryPage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 font-serif text-2xl text-brand-green md:text-3xl">
        {zh ? '在线询价' : 'Send Inquiry'}
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        {zh ? '填写联系方式与需求，我们会在 24 小时内回复。' : 'Fill in your contact details and requirements. We will reply within 24 hours.'}
      </p>
      <InquiryForm locale={params.locale} />
    </div>
  );
}
