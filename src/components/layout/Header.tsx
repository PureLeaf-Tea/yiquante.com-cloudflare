'use client';

// 前台导航栏（Header.tsx）
// 06 号文档 §2：固定顶部、深绿背景；左 Logo + 导航项，右语言切换；移动端汉堡菜单
// 阶段 17：改为从 /api/config/navigation 动态获取，支持二级下拉
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Leaf, Menu, X, ChevronDown } from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { cn } from '@/lib/cn';

interface NavItem {
  id: string;
  parentId: string | null;
  labelZh: string;
  labelEn: string;
  href: string;
  openInNewTab: boolean;
  isActive: boolean;
}

// 兜底静态导航（接口未就绪时）
const FALLBACK: Array<{ labelZh: string; labelEn: string; href: string }> = [
  { labelZh: '首页', labelEn: 'Home', href: '/' },
  { labelZh: '产品', labelEn: 'Products', href: '/products' },
  { labelZh: 'B2B产品', labelEn: 'B2B Products', href: '/b2b' },
  { labelZh: '关于我们', labelEn: 'About Us', href: '/about' },
  { labelZh: '认证资质', labelEn: 'Certifications', href: '/certifications' },
  { labelZh: '联系我们', labelEn: 'Contact', href: '/contact' },
];

export function Header({ locale }: { locale: string }) {
  const zh = locale === 'zh';
  const [menuOpen, setMenuOpen] = useState(false);
  const [items, setItems] = useState<NavItem[] | null>(null);

  useEffect(() => {
    fetch('/api/config/navigation')
      .then((r) => r.json() as Promise<{ success?: boolean; data?: NavItem[] }>)
      .then((d) => {
        if (d.success && d.data) setItems(d.data.filter((i) => i.isActive));
      })
      .catch(() => {
        // 失败用兜底
      });
  }, []);

  // 带语言前缀的链接（站内路径才加前缀，完整 URL 原样）
  const withLocale = (href: string) => (href.startsWith('http') ? href : `/${locale}${href === '/' ? '' : href}`);

  const roots = items ? items.filter((i) => !i.parentId) : FALLBACK.map((f, i) => ({ id: `fb-${i}`, parentId: null, openInNewTab: false, isActive: true, ...f }));
  const childrenOf = (id: string) => (items || []).filter((i) => i.parentId === id);
  const label = (item: { labelZh: string; labelEn: string }) => (zh ? item.labelZh : item.labelEn);

  return (
    <header className="sticky top-0 z-40 bg-brand-green text-white shadow-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        {/* Logo */}
        <Link href={withLocale('/')} className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
          <Leaf size={24} className="text-brand-gold" aria-hidden="true" />
          <span className="font-serif text-lg tracking-wide">YiQuanTea</span>
        </Link>

        {/* 桌面端导航项（含二级下拉） */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">
          {roots.map((item) => {
            const children = childrenOf(item.id);
            const link = (
              <Link
                href={withLocale(item.href)}
                target={item.openInNewTab ? '_blank' : undefined}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-white/90 transition-colors hover:bg-white/10 hover:text-white"
              >
                {label(item)}
                {children.length > 0 && <ChevronDown size={13} aria-hidden="true" />}
              </Link>
            );
            if (children.length === 0) return <span key={item.id}>{link}</span>;
            return (
              <span key={item.id} className="group relative">
                {link}
                {/* 二级下拉（hover 展开） */}
                <span className="invisible absolute left-0 top-full z-50 min-w-40 rounded-lg border border-gray-100 bg-white py-1 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
                  {children.map((child) => (
                    <Link
                      key={child.id}
                      href={withLocale(child.href)}
                      target={child.openInNewTab ? '_blank' : undefined}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-brand-green/5 hover:text-brand-green"
                    >
                      {label(child)}
                    </Link>
                  ))}
                </span>
              </span>
            );
          })}
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

      {/* 移动端抽屉菜单（二级缩进） */}
      <div className={cn('md:hidden', menuOpen ? 'block' : 'hidden')}>
        <nav className="flex flex-col border-t border-white/10 px-4 pb-4 pt-2" aria-label="移动端导航">
          {roots.map((item) => (
            <span key={item.id}>
              <Link
                href={withLocale(item.href)}
                target={item.openInNewTab ? '_blank' : undefined}
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-3 text-sm text-white/90 transition-colors hover:bg-white/10 hover:text-white"
              >
                {label(item)}
              </Link>
              {childrenOf(item.id).map((child) => (
                <Link
                  key={child.id}
                  href={withLocale(child.href)}
                  target={child.openInNewTab ? '_blank' : undefined}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg py-2 pl-8 pr-3 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  └ {label(child)}
                </Link>
              ))}
            </span>
          ))}
          <div className="mt-2 border-t border-white/10 pt-3">
            <LanguageSwitcher currentLocale={locale} />
          </div>
        </nav>
      </div>
    </header>
  );
}
