// 前台占位首页（阶段 6）
// 阶段 9 会替换为正式首页：Hero 轮播 / 分类卡片 / B2B 入口 / 卖点 / 认证 / 评价 / CTA 七模块
import { useTranslations } from 'next-intl';
import { Leaf } from 'lucide-react';

export default function LocaleHomePage() {
  const t = useTranslations('common');

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-green text-white">
        <Leaf size={40} aria-hidden="true" />
      </div>
      <h1 className="font-serif text-3xl text-brand-green">
        {t('appName')}
      </h1>
      <p className="text-lg text-brand-gold">{t('slogan')}</p>
      <p className="text-sm text-gray-500">阶段 9 将在此构建正式首页（7 个模块）</p>
    </div>
  );
}
