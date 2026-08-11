'use client';

// 后台布局壳（AdminShell.tsx）
// 客户端容器：组合 AdminTopbar + AdminSidebar + 页面内容，
// 挂载 useInactivityTimer（1 小时无操作自动退出），管理移动端抽屉开合
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AdminTopbar } from './AdminTopbar';
import { AdminSidebar } from './AdminSidebar';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';

// 超时守卫：只在已登录页面挂载（登录页不需要计时）
// ★独立组件是因为 Hook 不能条件调用；且 setTimeout 上限约 24.8 天，
//   传超大值会被浏览器归零立即触发，绝不能用“超长计时”变相禁用
function InactivityGuard() {
  useInactivityTimer(60);
  return null;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // 移动端侧边栏抽屉开合
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ★后台安全规范：1 小时无操作自动退出（登录页不挂计时器）
  const isLoginPage = pathname === '/admin';

  // 登录页：纯净居中布局，不显示侧边栏/顶栏（07 号文档）
  if (isLoginPage) {
    return <div className="min-h-screen bg-admin-dark">{children}</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <InactivityGuard />
      <AdminTopbar onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1">
        <AdminSidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
        {/* 移动端抽屉遮罩 */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
