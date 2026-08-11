// 仪表盘占位页（阶段 6）
// 阶段 13-14 替换为正式仪表盘：8 张统计卡片（产品/询价/样品/浏览等）
import { LayoutDashboard } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
      <LayoutDashboard size={32} className="mx-auto mb-3 text-brand-green" aria-hidden="true" />
      <h1 className="text-lg font-semibold text-brand-green">仪表盘</h1>
      <p className="mt-2 text-sm text-gray-500">阶段 13-14 将在此构建统计卡片（产品/询价/样品/浏览）</p>
    </div>
  );
}
