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
  // 产地/工艺（订单模块第 4 期自适应模板：有数据才渲染对应模块，空则自动隐藏）
  origin?: string;
  process?: string;
  videos: ProductVideoData[];
  recommended: RecommendedItem[];
  showcaseMode?: boolean;
  // 订单场景（从 /o/ 订单页带 ?from=order 跳转而来，需求文档 §4.2）：
  // 价格/询价按商品 showPriceInOrder 显隐（默认隐藏），推荐产品隐藏；
  // 产地/工艺/冲泡/介绍仍按数据自适应（有多少料穿多少衣）
  orderMode?: boolean;
  showPriceInOrder?: boolean;
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
  // 价格判定（三场景统一）：订单场景按 showPriceInOrder（默认隐藏）；展示区按 showPriceInShowcase；官网前台常显
  const showPrice = p.orderMode ? !!p.showPriceInOrder : !p.showcaseMode || p.info.showPriceInShowcase;
  const zh = p.locale === 'zh';
  switch (block) {
    case 'gallery':
      return <ProductImageGallery images={p.images} productName={p.locale === 'zh' ? p.info.nameZh : p.info.nameEn} />;
    case 'info':
      return (
        <ProductInfo
          product={p.info}
          locale={p.locale}
          categoryName={p.categoryName}
          showcaseMode={p.showcaseMode}
          orderMode={p.orderMode}
        />
      );
    case 'description':
      return p.description ? (
        <div>
          <h2 className="mb-3 font-serif text-xl text-brand-green">
            {zh ? '产品描述' : 'Description'}
          </h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">{p.description}</p>
        </div>
      ) : null;
    case 'origin':
      // 产地：有数据才渲染，绝不输出空标题/空白占位（§4.2 自适应模板）
      return p.origin ? (
        <div>
          <h2 className="mb-3 font-serif text-xl text-brand-green">{zh ? '产地' : 'Origin'}</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">{p.origin}</p>
        </div>
      ) : null;
    case 'process':
      // 工艺：同产地，数据驱动显隐（非茶叶类商品留空 → 自动隐藏）
      return p.process ? (
        <div>
          <h2 className="mb-3 font-serif text-xl text-brand-green">{zh ? '工艺' : 'Process'}</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">{p.process}</p>
        </div>
      ) : null;
    case 'brewing':
      return <BrewingGuide content={p.brewingGuide} locale={p.locale} />;
    case 'video':
      // 06 §5.3：仅在至少有一个视频/360°资源时显示
      return p.videos.length > 0 ? (
        <div>
          <h2 className="mb-3 font-serif text-xl text-brand-green">
            {zh ? '视频展示' : 'Product Video'}
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
      // 订单场景隐藏推荐产品（§4.2：仅保留商品介绍）
      return p.orderMode ? null : <Recommended items={p.recommended} locale={p.locale} />;
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

  // 默认布局（06 §5.1）：图库+信息并排首屏，其余依次；产地/工艺插在描述之后（§4.2 自适应模板）
  if (order.length === 0) {
    return (
      <div className="space-y-10">
        <div className="grid gap-8 md:grid-cols-2">
          <Block block="gallery" p={p} />
          <Block block="info" p={p} />
        </div>
        <Block block="description" p={p} />
        <Block block="origin" p={p} />
        <Block block="process" p={p} />
        <Block block="video" p={p} />
        <Block block="brewing" p={p} />
        <Block block="specs" p={p} />
        <Block block="recommended" p={p} />
      </div>
    );
  }

  // 自定义拖拽布局兼容（§12.8：自动显隐兜底，不让模块消失）：
  // 旧布局存于产地/工艺模块出现之前，必不含这两个键；若布局未显式编排它们，
  // 自动补位到 description 之后（无 description 则追加末尾）；无数据时块自身返回 null，不渲染任何内容；
  // 产地/工艺不进拖拽面板：拖拽保存格式（纯数组，隐藏即剔除）无法表达显式隐藏，避免两套规则互相覆盖
  const augmented = [...order];
  if (!augmented.includes('origin')) {
    const at = augmented.indexOf('description');
    const idx = at >= 0 ? at + 1 : augmented.length;
    augmented.splice(idx, 0, 'origin', 'process');
  } else if (!augmented.includes('process')) {
    augmented.splice(augmented.indexOf('origin') + 1, 0, 'process');
  }

  return (
    <div className="space-y-10">
      {augmented.map((block, i) => (
        <div key={`${block}-${i}`}>
          <Block block={block} p={p} />
        </div>
      ))}
    </div>
  );
}
