// 后台根布局（(admin)/admin/layout.tsx）
// 路由组 (admin)：后台拥有独立的 html/body，不受多语言影响（02 号文档 §8）
// AdminShell 客户端壳负责：顶栏 + 侧边栏 + 1 小时无操作超时
import type { Metadata, Viewport } from 'next';
import { AdminShell } from '@/components/layout/AdminShell';
import { ToastProvider } from '@/components/ui/Toast';
import { SWRegister } from '@/components/ui/SWRegister';
import '../../globals.css';

// PWA 主题色（Next 14 要求走 viewport 导出）
export const viewport: Viewport = {
  themeColor: '#166534',
};

export const metadata: Metadata = {
  title: '懿泉茶叶管理系统',
  // 后台禁止搜索引擎收录（robots.txt 也会 Disallow /admin/）
  robots: { index: false, follow: false },
  // PWA：manifest（收尾任务 1）
  manifest: '/manifest.json',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>
        <AdminShell>{children}</AdminShell>
        <ToastProvider />
        <SWRegister />
      </body>
    </html>
  );
}
