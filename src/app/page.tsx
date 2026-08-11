// 阶段 1 占位首页：仅用于验证项目骨架可启动
// 阶段 9 会用多语言路由 /[locale]/page.tsx 的正式首页（7 个模块）替换本页
import { Leaf } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-brand-green text-white">
        <Leaf size={40} aria-hidden="true" />
      </div>
      <h1 className="text-3xl font-serif">懿泉茶业 YiQuanTea</h1>
      <p className="text-lg text-brand-gold">Whole Leaf · Pure Nature</p>
      <p className="text-sm text-gray-500">
        阶段 1 项目初始化完成 — Next.js 14 + Cloudflare 架构骨架已就绪
      </p>
    </main>
  );
}
