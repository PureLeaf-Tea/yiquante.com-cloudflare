'use client';

// 前台导航栏（Header.tsx）
// 06 号文档 §2：固定顶部、深绿背景；左 Logo + 导航项，右语言切换；移动端汉堡菜单
import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Leaf, Menu, X } from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { cn } from '@/lib/cn';

// 导航项配置（阶段 15 接 navigation_items 数据表后改为动态获取）
const NAV_ITEMS = [
  { key: 'home', href: '' },
  { key: 'products', href: '/products' },
  { key: 'b2b', href: '/b2b' },
  { key: 'about', href: '/about' },
  { key: 'certifications', href: '/certifications' },
  { key: 'contact', href: '/contact' },
] as const;

export function Header({ locale }: { locale: string }) {
  const t = useTranslations('nav');
  // 移动端汉堡菜单开合状态
  const [menuOpen, setMenuOpen] = useState(false);

  // 带语言前缀的链接（英文是默认语言也统一带前缀，切换逻辑简单一致）
  const withLocale = (href: string) => `/${locale}${href}`;

  return (
    <header className="sticky top-0 z-40 bg-brand-green text-white shadow-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        {/* Logo */}
        <Link href={withLocale('')} className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
          <Leaf size={24} className="text-brand-gold" aria-hidden="true" />
          <span className="font-serif text-lg tracking-wide">YiQuanTea</span>
        </Link>

        {/* 桌面端导航项 */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={withLocale(item.href)}
              className="rounded-lg px-3 py-2 text-sm text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        {/* 右侧：语言切换（桌面）+ 汉堡按钮（移动） */}
        <div className="flex items-center gap-2">
          <div className="hidden md:block [&_select]:border-white/30 [&_select]:bg-brand-green [&_select]:text-white">
            <LanguageSwitcher currentLocale={locale} />
          </div>
          <button
            type="button"
            aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg hover:bg-white/10 md:hidden"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* 移动端抽屉菜单 */}
      <div className={cn('md:hidden', menuOpen ? 'block' : 'hidden')}>
        <nav className="flex flex-col border-t border-white/10 px-4 pb-4 pt-2" aria-label="移动端导航">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={withLocale(item.href)}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-3 text-sm text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            >
              {t(item.key)}
            </Link>
          ))}
          <div className="mt-2 border-t border-white/10 pt-3">
            <LanguageSwitcher currentLocale={locale} />
          </div>
        </nav>
      </div>
    </header>
  );
}
