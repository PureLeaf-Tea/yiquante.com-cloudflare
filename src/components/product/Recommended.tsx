// 推荐产品区块（Recommended.tsx，最多 3 个）
import { ProductCard } from './ProductCard';

export interface RecommendedItem {
  id: string;
  nameZh: string;
  nameEn: string;
  slug: string;
  priceCNY: string;
  priceUSD: string;
  thumbnail: string | null;
}

export function Recommended({ items, locale }: { items: RecommendedItem[]; locale: string }) {
  if (items.length === 0) return null;

  return (
    <div>
      <h2 className="mb-4 font-serif text-xl text-brand-green">
        {locale === 'zh' ? '推荐产品' : 'Recommended Products'}
      </h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {items.map((item) => (
          <ProductCard
            key={item.id}
            locale={locale}
            product={{ ...item, spec: null }}
          />
        ))}
      </div>
    </div>
  );
}
