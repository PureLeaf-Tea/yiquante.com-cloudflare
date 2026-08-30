// 产品体系（products.ts）—— 表 6-12/33
// 7 张表：产品主表 + 图片 + 基础翻译 + 展示区额外语言翻译 + 详情页布局 + 视频/360° + 推荐关系
import {
  pgTable,
  uuid,
  varchar,
  decimal,
  integer,
  boolean,
  text,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { categories } from './categories';

// 产品主表
export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // 库存单位编码（如 JXM-001），可为空
    sku: varchar('sku', { length: 50 }),
    nameZh: varchar('name_zh', { length: 200 }).notNull(),
    nameEn: varchar('name_en', { length: 200 }).notNull(),
    // URL 标识（基于中文名转拼音自动生成，全局唯一）
    slug: varchar('slug', { length: 200 }).notNull().unique(),
    // 必须指向末级分类或"00 未分类"
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    // decimal：精确小数类型（金额不能用浮点数，会有精度误差）
    priceCNY: decimal('price_cny', { precision: 10, scale: 2 }).default('0').notNull(),
    priceUSD: decimal('price_usd', { precision: 10, scale: 2 }).default('0').notNull(),
    // 规格（如 "250g/罐"）
    spec: varchar('spec', { length: 200 }),
    // active（上架）/ inactive（下架）
    status: varchar('status', { length: 20 }).default('active').notNull(),
    // 前台"推荐产品"区展示标记
    isRecommended: boolean('is_recommended').default(false).notNull(),
    // Open Graph：社交平台分享卡片（微信/Facebook 分享时显示的标题、描述、图）
    ogTitle: varchar('og_title', { length: 200 }),
    ogDescription: varchar('og_description', { length: 500 }),
    ogImage: varchar('og_image', { length: 500 }),
    // 展示区详情页是否显示价格
    showPriceInShowcase: boolean('show_price_in_showcase').default(true).notNull(),
    // 订单模块：是否在官网前台显示（产品列表/搜索/推荐）；
    // false = 仅订单可见（赠品/包装罐等非售卖品），与 status（上架/下架）语义区分：前台隐藏 ≠ 停用
    showOnStorefront: boolean('show_on_storefront').default(true).notNull(),
    // 订单模块：从订单页跳转详情页时是否显示价格/询价/推荐等电商元素（默认隐藏）
    showPriceInOrder: boolean('show_price_in_order').default(false).notNull(),
    // SEO（搜索引擎优化）三件套
    seoTitle: varchar('seo_title', { length: 200 }),
    seoDesc: varchar('seo_desc', { length: 500 }),
    seoKeywords: varchar('seo_keywords', { length: 500 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  // 索引（04 号文档 §8）
  (table) => ({
    categoryIdx: index('idx_products_category').on(table.categoryId),
    statusIdx: index('idx_products_status').on(table.status),
    slugIdx: index('idx_products_slug').on(table.slug),
  })
);

// 产品图片（一对多，sortOrder 决定轮播顺序）
export const productImages = pgTable('product_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 500 }).notNull(),
  // 图片替代文本（无障碍 + SEO）
  alt: varchar('alt', { length: 200 }),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6 种基础语言翻译（描述 + 冲泡指南）
export const productTranslations = pgTable(
  'product_translations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    // en | zh | ru | de | es | fr
    locale: varchar('locale', { length: 10 }).notNull(),
    description: text('description').default('').notNull(),
    brewingGuide: text('brewing_guide').default('').notNull(),
    // 产地（订单模块自适应模板：空则详情页"产地"模块自动隐藏）
    origin: text('origin').default('').notNull(),
    // 工艺（订单模块自适应模板：空则详情页"工艺"模块自动隐藏）
    process: text('process').default('').notNull(),
  },
  (table) => ({
    productIdx: index('idx_translations_product').on(table.productId),
    // 每个产品每种语言只有一条翻译
    localeUnique: uniqueIndex('idx_translations_unique').on(table.productId, table.locale),
  })
);

// 展示区额外语言翻译（支持任意语言代码，如匈牙利语 hu）
export const showcaseTranslations = pgTable(
  'showcase_translations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 10 }).notNull(),
    description: text('description').default('').notNull(),
    brewingGuide: text('brewing_guide').default('').notNull(),
  },
  (table) => ({
    productIdx: index('idx_showcase_trans_product').on(table.productId),
    localeUnique: uniqueIndex('idx_showcase_trans_unique').on(table.productId, table.locale),
  })
);

// 产品详情页拖拽布局（每个产品一条，存 7 个区块的顺序和显隐 JSON）
export const productPageLayouts = pgTable('product_page_layouts', {
  id: uuid('id').defaultRandom().primaryKey(),
  // 1:1 关系：一个产品只有一份布局
  productId: uuid('product_id')
    .notNull()
    .unique()
    .references(() => products.id, { onDelete: 'cascade' }),
  layoutJson: text('layout_json').default('[]').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 产品视频 / 360° 展示资源
export const productVideos = pgTable(
  'product_videos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    url: varchar('url', { length: 500 }).notNull(),
    // "video"（MP4/MOV ≤50MB）| "360"（全景图 ≤20MB）
    type: varchar('type', { length: 20 }).notNull(),
    title: varchar('title', { length: 200 }),
    thumbnail: varchar('thumbnail', { length: 500 }),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    productIdx: index('idx_product_videos_product').on(table.productId),
  })
);

// 产品推荐关系（详情页"推荐产品"，最多 3 个）
export const recommendations = pgTable(
  'recommendations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    recommendedId: uuid('recommended_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => ({
    productIdx: index('idx_recommendations_product').on(table.productId),
    // 同一对推荐关系不能重复
    pairUnique: uniqueIndex('idx_recommendations_unique').on(table.productId, table.recommendedId),
  })
);
