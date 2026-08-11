// 冲泡指南区块（BrewingGuide.tsx）
import { CupSoda } from 'lucide-react';

export function BrewingGuide({ content, locale }: { content: string; locale: string }) {
  if (!content) return null;

  return (
    <div className="rounded-xl bg-brand-green/5 p-6">
      <h2 className="mb-3 flex items-center gap-2 font-serif text-xl text-brand-green">
        <CupSoda size={20} className="text-brand-gold" aria-hidden="true" />
        {locale === 'zh' ? '冲泡指南' : 'Brewing Guide'}
      </h2>
      <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">{content}</p>
    </div>
  );
}
