// 后台全局搜索关键词（search.ts）—— 表 29/33
// 后台右上角搜索框：输入关键词直接跳转对应管理页面
// 例：输入 "B2B" / "展示区" / "密码" → 跳转展示区管理
import { pgTable, uuid, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const searchKeywords = pgTable('search_keywords', {
  id: uuid('id').defaultRandom().primaryKey(),
  // 关键词（如 "备份"），全局唯一
  keyword: varchar('keyword', { length: 100 }).notNull().unique(),
  // 跳转目标路径（后台路径，如 /admin/backup）
  targetPath: varchar('target_path', { length: 200 }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
