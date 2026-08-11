// 产品详情布局容器（ProductDetailLayout.tsx，06 号文档 §5.2）
// 服务端组件：按后台拖拽布局 layoutJson 的顺序渲染 7 种区块；
// 无自定义布局时使用默认布局（06 §5.1：图库+信息并排，描述/视频/冲泡/规格/推荐依次向下）
import { ProductImageGallery } from './ProductImageGallery';
import { ProductInfo, type ProductInfoData } from './ProductInfo';
import { ProductVideo, type ProductVideoData } from './ProductVideo';
import { BrewingGuide } from './BrewingGuide';
import { ProductSpecs } from './ProductSpecs';
import { Recommended, type RecommendedItem } from './Recommended';

export interface DetailBlockProps {
  locale: string;
  images: Array<{ url: string; alt: string | null }>;
  info: ProductInfoData;
  categoryName: string | null;
  description: string;
  brewingGuide: string;
  videos: ProductVideoData[];
  recommended: RecommendedItem[];
  showcaseMode?: boolean;
}

// 区块键归一化（兼容两种命名：种子数据的 gallery/video 与 06 号文档的 imageGallery/...）
function normalizeBlock(key: string): string {
  switch (key) {
    case 'gallery':
    case 'imageGallery':
      return 'gallery';
    case 'info':
    case 'productInfo':
      return 'info';
    case 'description':
      return 'description';
    case 'brewing':
    case 'brewingGuide':
      return 'brewing';
    case 'video':
    case 'videos':
      return 'video';
    case 'specs':
      return 'specs';
    case 'recommended':
    case 'recommendations':
      return 'recommended';
    default:
      return key;
  }
}

function Block({ block, p }: { block: string; p: DetailBlockProps }) {
  const showPrice = !p.showcaseMode || p.info.showPriceInShowcase;
  switch (block) {
    case 'gallery':
      return <ProductImageGallery images={p.images} productName={p.locale === 'zh' ? p.info.nameZh : p.info.nameEn} />;
    case 'info':
      return <ProductInfo product={p.info} locale={p.locale} categoryName={p.categoryName} showcaseMode={p.showcaseMode} />;
    case 'description':
      return p.description ? (
        <div>
          <h2 className="mb-3 font-serif text-xl text-brand-green">
            {p.locale === 'zh' ? '产品描述' : 'Description'}
          </h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">{p.description}</p>
        </div>
      ) : null;
    case 'brewing':
      return <BrewingGuide content={p.brewingGuide} locale={p.locale} />;
    case 'video':
      // 06 §5.3：仅在至少有一个视频/360°资源时显示
      return p.videos.length > 0 ? (
        <div>
          <h2 className="mb-3 font-serif text-xl text-brand-green">
            {p.locale === 'zh' ? '视频展示' : 'Product Video'}
          </h2>
          <ProductVideo videos={p.videos} />
        </div>
      ) : null;
    case 'specs':
      return (
        <ProductSpecs
          spec={p.info.spec}
          sku={p.info.sku}
          priceCNY={p.info.priceCNY}
          priceUSD={p.info.priceUSD}
          locale={p.locale}
          showPrice={showPrice}
        />
      );
    case 'recommended':
      return <Recommended items={p.recommended} locale={p.locale} />;
    default:
      return null;
  }
}

export function ProductDetailLayout({ layoutJson, ...p }: DetailBlockProps & { layoutJson: string | null }) {
  // 解析后台布局；失败或为空时用默认顺序
  let order: string[] = [];
  if (layoutJson) {
    try {
      const parsed = JSON.parse(layoutJson);
      if (Array.isArray(parsed)) order = parsed.map((k) => normalizeBlock(String(k))).filter(Boolean);
    } catch {
      order = [];
    }
  }

  // 默认布局（06 §5.1）：图库+信息并排首屏，其余依次
  if (order.length === 0) {
    return (
      <div className="space-y-10">
        <div className="grid gap-8 md:grid-cols-2">
          <Block block="gallery" p={p} />
          <Block block="info" p={p} />
        </div>
        <Block block="description" p={p} />
        <Block block="video" p={p} />
        <Block block="brewing" p={p} />
        <Block block="specs" p={p} />
        <Block block="recommended" p={p} />
      </div>
    );
  }

  // 自定义布局：按后台顺序逐个渲染
  return (
    <div className="space-y-10">
      {order.map((block, i) => (
        <div key={`${block}-${i}`}>
          <Block block={block} p={p} />
        </div>
      ))}
    </div>
  );
}
