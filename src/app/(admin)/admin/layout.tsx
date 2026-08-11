// 后台根布局（(admin)/admin/layout.tsx）
// 路由组 (admin)：后台拥有独立的 html/body，不受多语言影响（02 号文档 §8）
// AdminShell 客户端壳负责：顶栏 + 侧边栏 + 1 小时无操作超时
import type { Metadata } from 'next';
import { AdminShell } from '@/components/layout/AdminShell';
import { ToastProvider } from '@/components/ui/Toast';
import '../../globals.css';

export const metadata: Metadata = {
  title: '懿泉茶叶管理系统',
  // 后台禁止搜索引擎收录（robots.txt 也会 Disallow /admin/）
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>
        <AdminShell>{children}</AdminShell>
        <ToastProvider />
      </body>
    </html>
  );
}
