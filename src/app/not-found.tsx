// 根级 404 页（src/app/not-found.tsx）
// 路由完全不存在时由 Next.js 兜底渲染；自带 html/body（位于 [locale] 布局之外）
import Link from 'next/link';
import { Home } from 'lucide-react';

export default function RootNotFound() {
  return (
    <html lang="en">
      <body className="m-0 bg-[#fdfbf7]">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="font-serif text-6xl text-[#c9aa7b]">404</p>
          <h1 className="text-lg font-medium text-[#1a3a1a]">页面不存在 · Page Not Found</h1>
          <p className="text-sm text-gray-400">您访问的页面不存在或已被移动。</p>
          <Link
            href="/en"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#1a3a1a] px-6 text-sm font-medium text-white hover:bg-[#2d5a2d]"
          >
            <Home size={15} aria-hidden="true" />
            Back to Home
          </Link>
        </div>
      </body>
    </html>
  );
}
