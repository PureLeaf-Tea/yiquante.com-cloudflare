// 前台 404 页（双语）
import Link from 'next/link';
import { Home } from 'lucide-react';

export default function LocaleNotFound({ params }: { params: { locale: string } }) {
  const zh = params?.locale === 'zh';

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-serif text-6xl text-brand-gold">404</p>
      <h1 className="text-lg font-medium text-brand-green">
        {zh ? '页面不存在' : 'Page Not Found'}
      </h1>
      <p className="text-sm text-gray-400">
        {zh ? '您访问的页面不存在或已被移动。' : 'The page you are looking for does not exist or has been moved.'}
      </p>
      <Link
        href={`/${params?.locale || 'en'}`}
        className="inline-flex min-h-touch items-center gap-2 rounded-btn bg-brand-green px-6 text-sm font-medium text-white hover:bg-brand-green/90"
      >
        <Home size={15} aria-hidden="true" />
        {zh ? '返回首页' : 'Back to Home'}
      </Link>
    </div>
  );
}
