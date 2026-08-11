'use client';

// 展示区独立语言切换器（ShowcaseLanguageSwitcher.tsx）
// 展示区独立详情页专用：只改 URL 的 locale 段，不写 NEXT_LOCALE Cookie（不影响全站语言记忆）
import { usePathname, useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { locales } from '@/i18n/config';

const LABELS: Record<string, string> = {
  zh: '中文',
  en: 'English',
  ru: 'Русский',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
};

export function ShowcaseLanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleChange = (locale: string) => {
    // 替换路径第一段语言码：/{locale}/showcase/{slug}
    const segments = pathname.split('/');
    if (segments.length >= 2 && locales.includes(segments[1] as (typeof locales)[number])) {
      segments[1] = locale;
    } else {
      segments.splice(1, 0, locale);
    }
    router.push(segments.join('/'));
  };

  return (
    <label className="relative inline-flex items-center">
      <Globe size={15} className="pointer-events-none absolute left-3 text-gray-400" aria-hidden="true" />
      <select
        aria-label="Language"
        value={currentLocale}
        onChange={(e) => handleChange(e.target.value)}
        className="min-h-10 appearance-none rounded-lg border border-gray-300 bg-white pl-9 pr-6 text-sm outline-none focus:border-brand-green"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
