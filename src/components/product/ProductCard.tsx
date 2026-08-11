'use client';

// 产品卡片（ProductCard.tsx）
// LazyImage 懒加载 + 名称/价格/规格 + 加入询价 + 加入对比
import Link from 'next/link';
import { ShoppingCart, Scale, Check } from 'lucide-react';
import { LazyImage } from '@/components/ui/LazyImage';
import { toastSuccess } from '@/components/ui/Toast';
import { useInquiryCart } from '@/components/storefront/InquiryCartContext';
import { useCompare } from '@/components/storefront/CompareContext';

export interface ProductCardData {
  id: string;
  nameZh: string;
  nameEn: string;
  slug: string;
  priceCNY: string;
  priceUSD: string;
  spec: string | null;
  thumbnail: string | null;
}

export function ProductCard({ product, locale }: { product: ProductCardData; locale: string }) {
  const { addItem, isInCart } = useInquiryCart();
  const { toggle, isCompared } = useCompare();

  const name = locale === 'zh' ? product.nameZh : product.nameEn;
  const inCart = isInCart(product.id);
  const compared = isCompared(product.id);

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-lg">
      <Link href={`/${locale}/products/${product.slug}`} className="block overflow-hidden">
        <LazyImage
          src={product.thumbnail || ''}
          alt={name}
          width={400}
          height={400}
          className="transition-transform duration-300 group-hover:scale-105"
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/${locale}/products/${product.slug}`}>
          <h3 className="text-sm font-medium text-brand-green hover:text-brand-gold md:text-base">{name}</h3>
        </Link>
        {product.spec && <p className="mt-1 text-xs text-gray-400">{product.spec}</p>}
        <p className="mt-2 text-sm font-semibold text-brand-gold">
          ¥{product.priceCNY} / ${product.priceUSD}
        </p>

        {/* 操作按钮（图标 + 汉字规范） */}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              addItem({
                productId: product.id,
                productName: name,
                quantity: 1,
                thumbnail: product.thumbnail,
                priceCNY: product.priceCNY,
              });
              if (!inCart) toastSuccess(locale === 'zh' ? '已加入询价车' : 'Added to inquiry cart');
            }}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-btn bg-brand-green px-3 text-xs font-medium text-white hover:bg-brand-green/90"
          >
            {inCart ? <Check size={14} aria-hidden="true" /> : <ShoppingCart size={14} aria-hidden="true" />}
            {inCart ? (locale === 'zh' ? '已加入' : 'Added') : locale === 'zh' ? '加入询价' : 'Add to Inquiry'}
          </button>
          <button
            type="button"
            aria-label={locale === 'zh' ? '加入对比' : 'Add to compare'}
            onClick={() => toggle({ productId: product.id, nameZh: product.nameZh, nameEn: product.nameEn, thumbnail: product.thumbnail })}
            className={
              'inline-flex min-h-10 min-w-10 items-center justify-center rounded-btn border px-3 text-xs ' +
              (compared
                ? 'border-brand-gold bg-brand-gold/10 text-brand-gold'
                : 'border-gray-200 text-gray-500 hover:border-brand-gold hover:text-brand-gold')
            }
          >
            <Scale size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
