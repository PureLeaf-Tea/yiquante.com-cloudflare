// 客户评价（reviews.ts）—— 表 17-18/33
// 评价主表 + 评价图片；后台审核发布后展示在首页"客户评价"模块
import { pgTable, uuid, varchar, integer, text, timestamp, index } from 'drizzle-orm/pg-core';
import { products } from './products';

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // 可关联产品（首页通用评价可以不挂产品）
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    // 评价人姓名（前台展示名）
    name: varchar('name', { length: 100 }).notNull(),
    // 星级 1-5
    rating: integer('rating').default(5).notNull(),
    content: text('content').notNull(),
    // 评价语言（前台按当前语言筛选展示）
    locale: varchar('locale', { length: 10 }),
    // pending（待审核）→ published（已发布）/ rejected（已驳回）
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index('idx_reviews_status').on(table.status),
  })
);

// 评价图片（客户晒图，R2 存储）
export const reviewImages = pgTable('review_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  reviewId: uuid('review_id')
    .notNull()
    .references(() => reviews.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 500 }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
