// B2B 展示区（showcase.ts）—— 表 3-5/33
// 独立于主分类树的 B2B 加密区：独立分类树 + 独立密码 + 24 小时访问 token
import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  text,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { products } from './products';

// ★B2B 展示区分类树（独立于主分类树）
export const showcaseCategories = pgTable(
  'showcase_categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    nameZh: varchar('name_zh', { length: 50 }).notNull(),
    nameEn: varchar('name_en', { length: 50 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    image: varchar('image', { length: 500 }),
    // ★AES-GCM 可逆加密存储（admin 二次验证后可查看明文）
    password: varchar('password', { length: 255 }).notNull(),
    descriptionZh: text('description_zh'),
    descriptionEn: text('description_en'),
    sortOrder: integer('sort_order').default(0).notNull(),
    // 停用后前台不显示该分类
    isActive: boolean('is_active').default(true).notNull(),
    // 自引用：可选子分类（两棵树结构一致，互不干扰）
    parentId: uuid('parent_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  // 索引（04 号文档 §8）
  (table) => ({
    parentIdx: index('idx_showcase_cat_parent').on(table.parentId),
    slugIdx: index('idx_showcase_cat_slug').on(table.slug),
  })
);

// ★B2B 展示区产品关联（多对多：一个产品可以属于多个展示区分类）
export const showcaseProducts = pgTable(
  'showcase_products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // 级联删除：产品或展示区分类被删时，关联记录自动清除
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    showcaseCategoryId: uuid('showcase_category_id')
      .notNull()
      .references(() => showcaseCategories.id, { onDelete: 'cascade' }),
    // 展示区默认语言（不同分类可以不同，如匈牙利客户分类默认 hu）
    showcaseLocale: varchar('showcase_locale', { length: 10 }),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    // 同一产品在同一分类下只能出现一次
    prodCatUnique: uniqueIndex('idx_showcase_prod_unique').on(table.productId, table.showcaseCategoryId),
    categoryIdx: index('idx_showcase_prod_category').on(table.showcaseCategoryId),
  })
);

// ★B2B 访问 Token（密码验证成功后签发，24 小时有效）
// 注意：前台高频验证走 KV 缓存，本表是持久化记录（供审计和 KV 重建）
export const showcaseAccessTokens = pgTable(
  'showcase_access_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    showcaseCategoryId: uuid('showcase_category_id')
      .notNull()
      .references(() => showcaseCategories.id, { onDelete: 'cascade' }),
    // crypto.randomUUID() 生成的 64 字符内 token
    token: varchar('token', { length: 64 }).notNull().unique(),
    // 客户端 IP（IPv6 最长 45 字符）
    ip: varchar('ip', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    tokenIdx: index('idx_showcase_token').on(table.token),
    expiresIdx: index('idx_showcase_token_expires').on(table.expiresAt),
  })
);
