'use client';

// 产品信息区（ProductInfo.tsx）
// 名称 / 价格 / 规格 / 操作按钮（加入询价 / 申请样品 / 加入对比）
// 展示区模式下价格按 showPriceInShowcase 显隐；
// 订单场景（?from=order）下价格/询价按钮按 showPriceInOrder 显隐（默认隐藏），
// 样品/对比按钮整体隐藏（需求文档 §4.2：仅保留商品介绍）
import Link from 'next/link';
import { ShoppingCart, FlaskConical, Scale, Check } from 'lucide-react';
import { toastSuccess } from '@/components/ui/Toast';
import { useInquiryCart } from '@/components/storefront/InquiryCartContext';
import { useCompare } from '@/components/storefront/CompareContext';

export interface ProductInfoData {
  id: string;
  nameZh: string;
  nameEn: string;
  slug: string;
  priceCNY: string;
  priceUSD: string;
  spec: string | null;
  sku: string | null;
  thumbnail: string | null;
  showPriceInShowcase: boolean;
  // 订单场景是否显示价格/询价（默认 false 隐藏，后台可按商品打开）
  showPriceInOrder?: boolean;
}

export function ProductInfo({
  product,
  locale,
  categoryName,
  showcaseMode = false,
  orderMode = false,
}: {
  product: ProductInfoData;
  locale: string;
  categoryName?: string | null;
  showcaseMode?: boolean;
  orderMode?: boolean;
}) {
  const { addItem, isInCart } = useInquiryCart();
  const { toggle, isCompared } = useCompare();

  const name = locale === 'zh' ? product.nameZh : product.nameEn;
  const inCart = isInCart(product.id);
  const compared = isCompared(product.id);
  const zh = locale === 'zh';
  // 订单场景按 showPriceInOrder（默认隐藏）；展示区 + 关闭价格显示 → 隐藏；官网前台常显
  const showPrice = orderMode ? !!product.showPriceInOrder : !showcaseMode || product.showPriceInShowcase;
  // 询价按钮与价格同开关；订单场景下样品/对比按钮不展示（§4.2）
  const showInquiry = showPrice;
  const showExtraActions = !orderMode;

  return (
    <div className="flex flex-col gap-4">
      <div>
        {categoryName && <p className="mb-1 text-sm text-gray-400">{categoryName}</p>}
        <h1 className="font-serif text-2xl text-brand-green md:text-3xl">{name}</h1>
        {product.sku && <p className="mt-1 text-xs text-gray-400">SKU: {product.sku}</p>}
      </div>

      {showPrice && (
        <p className="text-xl font-bold text-brand-gold">
          ¥{product.priceCNY} <span className="mx-2 text-gray-300">/</span> ${product.priceUSD}
        </p>
      )}

      {product.spec && (
        <p className="text-sm text-gray-600">
          <span className="text-gray-400">{zh ? '规格：' : 'Spec: '}</span>
          {product.spec}
        </p>
      )}

      {(showInquiry || showExtraActions) && (
      <div className="mt-2 flex flex-wrap gap-3">
        {showInquiry && (
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
            if (!inCart) toastSuccess(zh ? '已加入询价车' : 'Added to inquiry cart');
          }}
          className="inline-flex min-h-touch items-center gap-2 rounded-btn bg-brand-green px-6 text-sm font-medium text-white hover:bg-brand-green/90"
        >
          {inCart ? <Check size={16} aria-hidden="true" /> : <ShoppingCart size={16} aria-hidden="true" />}
          {inCart ? (zh ? '已加入询价' : 'Added') : zh ? '加入询价' : 'Add to Inquiry'}
        </button>
        )}
        {showExtraActions && (
        <Link
          href={`/${locale}/sample`}
          className="inline-flex min-h-touch items-center gap-2 rounded-btn border-2 border-brand-gold px-6 text-sm font-medium text-brand-gold hover:bg-brand-gold/10"
        >
          <FlaskConical size={16} aria-hidden="true" />
          {zh ? '申请样品' : 'Request Sample'}
        </Link>
        )}
        {showExtraActions && (
        <button
          type="button"
          onClick={() =>
            toggle({ productId: product.id, nameZh: product.nameZh, nameEn: product.nameEn, thumbnail: product.thumbnail })
          }
          className={
            'inline-flex min-h-touch items-center gap-2 rounded-btn border px-5 text-sm ' +
            (compared
              ? 'border-brand-gold bg-brand-gold/10 text-brand-gold'
              : 'border-gray-200 text-gray-500 hover:border-brand-gold hover:text-brand-gold')
          }
        >
          <Scale size={16} aria-hidden="true" />
          {compared ? (zh ? '已在对比' : 'Comparing') : zh ? '对比' : 'Compare'}
        </button>
        )}
      </div>
      )}
    </div>
  );
}
