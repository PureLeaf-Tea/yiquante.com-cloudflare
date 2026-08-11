'use client';

// 语言切换组件（LanguageSwitcher.tsx）
// 6 种语言（中/英/俄/德/西/法）；选择后写 NEXT_LOCALE Cookie 记忆，并跳转到对应语言路径
// Cookie 由阶段 6 的路由中间件消费（IP 自动识别 + 手动切换记忆）
import { usePathname, useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';

// 6 种语言的显示名称（用各自语言自称，方便客户识别）
const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'ru', label: 'Русский' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
] as const;

export interface LanguageSwitcherProps {
  // 当前语言（用于高亮选中项）
  currentLocale?: string;
  className?: string;
}

export function LanguageSwitcher({ currentLocale = 'en', className }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleChange = (locale: string) => {
    // 1. Cookie 记忆用户选择（下次访问优先于 IP 自动识别）
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;

    // 2. 跳转对应语言路径：英文是默认语言不加前缀，其余语言加 /{locale} 前缀
    const segments = pathname.split('/').filter(Boolean);
    const localeCodes = LOCALES.map((l) => l.code as string);
    // 如果第一段已经是语言前缀，先去掉
    if (localeCodes.includes(segments[0])) {
      segments.shift();
    }
    const rest = segments.join('/');
    const target = locale === 'en' ? `/${rest}` : `/${locale}${rest ? '/' + rest : ''}`;
    router.push(target);
  };

  return (
    <label className={'relative inline-flex items-center ' + (className || '')}>
      <Globe size={16} className="absolute left-3 text-gray-400 pointer-events-none" aria-hidden="true" />
      <select
        aria-label="切换语言"
        value={currentLocale}
        onChange={(e) => handleChange(e.target.value)}
        className="min-h-touch appearance-none rounded-lg border border-gray-300 bg-white pl-9 pr-8 py-2 text-sm text-gray-700 outline-none focus:border-brand-green cursor-pointer"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
