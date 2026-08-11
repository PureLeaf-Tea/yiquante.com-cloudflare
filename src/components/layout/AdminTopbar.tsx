'use client';

// 后台顶部栏（AdminTopbar.tsx）
// 07 号文档 §2：品牌名 + 全局搜索框 + 用户欢迎语 + 退出；移动端含汉堡开关
import { Search, Menu, LogOut } from 'lucide-react';

export interface AdminTopbarProps {
  // 当前登录用户名（阶段 13 登录后从 JWT 取；此阶段占位）
  userName?: string;
  // 移动端打开侧边栏抽屉
  onMenuClick?: () => void;
}

export function AdminTopbar({ userName = '管理员', onMenuClick }: AdminTopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-200 bg-admin-dark px-4 text-white">
      {/* 移动端汉堡开关 */}
      <button
        type="button"
        aria-label="打开菜单"
        onClick={onMenuClick}
        className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg hover:bg-white/10 md:hidden"
      >
        <Menu size={20} />
      </button>

      {/* 品牌名 */}
      <span className="hidden text-sm font-semibold md:block">懿泉茶叶管理系统</span>

      {/* 全局搜索框（阶段 17 接 search_keywords 关键词跳转表） */}
      <div className="relative mx-auto w-full max-w-md">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" aria-hidden="true" />
        <input
          type="search"
          placeholder="搜索功能（如：备份、聊天、B2B）..."
          aria-label="后台全局搜索"
          className="w-full rounded-lg border border-white/20 bg-white/10 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/40"
        />
      </div>

      {/* 用户区 */}
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden text-sm text-white/80 sm:block">欢迎，{userName}</span>
        <button
          type="button"
          aria-label="退出登录"
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg hover:bg-white/10"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}
