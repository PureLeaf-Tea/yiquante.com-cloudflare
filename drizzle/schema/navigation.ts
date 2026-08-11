// 前台导航菜单（navigation.ts）—— 表 24/33
import { pgTable, uuid, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const navigationItems = pgTable('navigation_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  // 菜单文字（中英双语，其余语言显示英文）
  labelZh: varchar('label_zh', { length: 50 }).notNull(),
  labelEn: varchar('label_en', { length: 50 }).notNull(),
  // 跳转路径（站内路径如 /products，或完整 URL）
  href: varchar('href', { length: 200 }).notNull(),
  // 是否新标签页打开（外链用）
  openInNewTab: boolean('open_in_new_tab').default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
