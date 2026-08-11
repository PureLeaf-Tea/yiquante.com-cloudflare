'use client';

// 后台侧边栏（AdminSidebar.tsx）
// 07 号文档 §2：220px 深色侧边栏（#16213e），18 项菜单；移动端汉堡抽屉
// 硬规则：图标全部 lucide-react（不用 emoji）+ 汉字；按角色过滤菜单
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Smartphone,
  MessageSquare,
  ClipboardList,
  Star,
  Palette,
  Compass,
  Share2,
  FileText,
  Users,
  BarChart3,
  Database,
  ScrollText,
  Settings,
  Search,
  BookOpen,
  LogOut,
  Leaf,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { UserRole } from '@/types';

// 菜单项定义（07 号文档 §2 顺序）
// adminOnly：仅管理员可见（B2B 密码、员工、日志、备份涉及敏感操作）
interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { label: '仪表盘', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: '产品管理', href: '/admin/products', icon: Package },
  { label: '展示区管理', href: '/admin/showcase', icon: Smartphone, adminOnly: true },
  { label: '询价管理', href: '/admin/inquiries', icon: MessageSquare },
  { label: '样品管理', href: '/admin/samples', icon: ClipboardList },
  { label: '评论管理', href: '/admin/reviews', icon: Star },
  { label: '首页编辑', href: '/admin/homepage', icon: Palette },
  { label: '导航编辑', href: '/admin/navigation', icon: Compass },
  { label: '社交媒体', href: '/admin/social', icon: Share2 },
  { label: '页面内容', href: '/admin/pages', icon: FileText },
  { label: '员工管理', href: '/admin/staff', icon: Users, adminOnly: true },
  { label: '客户行为分析', href: '/admin/analytics', icon: BarChart3 },
  { label: '备份管理', href: '/admin/backup', icon: Database, adminOnly: true },
  { label: '操作日志', href: '/admin/logs', icon: ScrollText, adminOnly: true },
  { label: '网站设置', href: '/admin/settings', icon: Settings },
  { label: 'SEO 设置', href: '/admin/seo', icon: Search },
  { label: '操作指南', href: '/admin/guide', icon: BookOpen },
];

export interface AdminSidebarProps {
  // 当前登录角色（阶段 13 登录后从 JWT 取；此阶段占位 admin）
  role?: UserRole;
  // 移动端抽屉是否打开
  open?: boolean;
  // 移动端点击菜单后关闭抽屉
  onNavigate?: () => void;
}

export function AdminSidebar({ role = 'admin', open = true, onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();

  // 角色过滤：非 admin 隐藏 adminOnly 菜单
  const items = MENU_ITEMS.filter((item) => !item.adminOnly || role === 'admin');

  return (
    <aside
      className={cn(
        'flex h-full w-[220px] shrink-0 flex-col bg-admin-sidebar text-white',
        // 移动端：默认藏到屏幕外，open 时滑入（抽屉）；桌面端常显
        'fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:static md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
      aria-label="后台菜单"
    >
      {/* 品牌标题 */}
      <div className="flex items-center gap-2 px-5 py-4">
        <Leaf size={20} className="text-brand-gold" aria-hidden="true" />
        <span className="text-sm font-semibold">懿泉茶叶管理系统</span>
      </div>

      {/* 菜单列表 */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                active ? 'bg-admin-hover text-white' : 'text-white/70 hover:bg-admin-hover hover:text-white'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={17} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 退出登录（阶段 13 接 POST /api/auth/logout） */}
      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-admin-hover hover:text-white"
        >
          <LogOut size={17} aria-hidden="true" />
          退出登录
        </button>
      </div>
    </aside>
  );
}
