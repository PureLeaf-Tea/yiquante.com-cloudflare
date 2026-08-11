// SEO 设置（seo.ts）—— 表 28/33
// 页面级 SEO 配置（产品级 SEO 字段在 products 表）
import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';

export const seoSettings = pgTable('seo_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  // 页面标识：home / products / about / contact 等，全局唯一
  pageKey: varchar('page_key', { length: 50 }).notNull().unique(),
  // 页面标题 / 描述 / 关键词（中英双语）
  titleZh: varchar('title_zh', { length: 200 }),
  titleEn: varchar('title_en', { length: 200 }),
  descriptionZh: varchar('description_zh', { length: 500 }),
  descriptionEn: varchar('description_en', { length: 500 }),
  keywords: varchar('keywords', { length: 500 }),
  // hreflang 开关：多语言页面是否输出 hreflang 标签（告诉搜索引擎各语言版本对应关系）
  hreflangEnabled: boolean('hreflang_enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
