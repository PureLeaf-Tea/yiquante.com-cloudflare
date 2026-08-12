'use client';

// 后台顶部栏（AdminTopbar.tsx）
// 07 号文档 §2：品牌名 + 全局搜索框 + 用户欢迎语 + 退出；移动端含汉堡开关
// 全局搜索：关键词匹配 search_keywords 跳转表（阶段 19 接通）；退出调 /api/auth/logout
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Menu, LogOut } from 'lucide-react';

export interface AdminTopbarProps {
  // 当前登录用户名（JWT 解析）
  userName?: string;
  // 移动端打开侧边栏抽屉
  onMenuClick?: () => void;
}

interface KeywordRow {
  keyword: string;
  targetPath: string;
}

export function AdminTopbar({ userName = '管理员', onMenuClick }: AdminTopbarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [keywords, setKeywords] = useState<KeywordRow[]>([]);
  const [noMatch, setNoMatch] = useState(false);

  // 拉取关键词跳转表（63 条）
  useEffect(() => {
    fetch('/api/search-keywords?pageSize=100')
      .then((r) => r.json() as Promise<{ success?: boolean; data?: KeywordRow[] }>)
      .then((d) => {
        if (d.success && d.data) setKeywords(d.data);
      })
      .catch(() => {
        // 关键词表不可用时搜索不可用，不影响其他功能
      });
  }, []);

  // 回车搜索：精确匹配优先，其次包含匹配，取第一个命中跳转
  const doSearch = () => {
    const q = query.trim();
    if (!q) return;
    const lower = q.toLowerCase();
    const hit =
      keywords.find((k) => k.keyword.toLowerCase() === lower) ||
      keywords.find((k) => k.keyword.toLowerCase().includes(lower) || lower.includes(k.keyword.toLowerCase()));
    if (hit) {
      setNoMatch(false);
      setQuery('');
      router.push(hit.targetPath);
    } else {
      setNoMatch(true);
      setTimeout(() => setNoMatch(false), 2000);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // 即使接口失败也回登录页
    }
    router.push('/admin');
    router.refresh();
  };

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

      {/* 全局搜索框（search_keywords 关键词跳转表） */}
      <div className="relative mx-auto w-full max-w-md">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') doSearch();
          }}
          placeholder="搜索功能（如：备份、聊天、B2B）..."
          aria-label="后台全局搜索"
          className="w-full rounded-lg border border-white/20 bg-white/10 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/40"
        />
        {noMatch && (
          <p className="absolute left-0 top-full mt-1 rounded bg-red-600/90 px-2 py-1 text-xs text-white">
            未找到匹配功能
          </p>
        )}
      </div>

      {/* 用户区 */}
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden text-sm text-white/80 sm:block">欢迎，{userName}</span>
        <button
          type="button"
          aria-label="退出登录"
          onClick={logout}
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg hover:bg-white/10"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}
