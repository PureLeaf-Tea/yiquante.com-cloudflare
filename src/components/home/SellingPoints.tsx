// 卖点展示区（06 号文档 §3.4）
// 3-4 个卖点：图标 + 标题 + 描述；桌面横排，手机竖排
import { getTranslations } from 'next-intl/server';
import { Leaf, ShieldCheck, Globe, Award, type LucideIcon } from 'lucide-react';
import { getSellingPoints } from '@/lib/queries';

// 数据库存图标名字符串，这里映射为 lucide-react 组件（硬规则：不用 emoji）
const ICON_MAP: Record<string, LucideIcon> = {
  Leaf,
  ShieldCheck,
  Globe,
  Award,
};

export async function SellingPoints({ locale }: { locale: string }) {
  const t = await getTranslations('home.sellingPoints');
  const points = await getSellingPoints();

  return (
    <section className="bg-white py-12" aria-label="为什么选择我们">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mb-8 text-center font-serif text-2xl text-brand-green md:text-3xl">{t('title')}</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {points.map((p) => {
            const Icon = ICON_MAP[p.icon || ''] || Leaf;
            return (
              <div key={p.id} className="flex flex-col items-center rounded-xl p-6 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                  <Icon size={26} aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold text-brand-green">
                  {locale === 'zh' ? p.titleZh : p.titleEn}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  {locale === 'zh' ? p.descriptionZh : p.descriptionEn}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
