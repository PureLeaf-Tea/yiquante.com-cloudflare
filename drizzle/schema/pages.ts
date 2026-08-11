// 页面内容（pages.ts）—— 表 26/33
// "关于我们 / 隐私政策 / 服务条款 / 联系我们 / 认证资质"等静态页的文字内容
import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const pageContents = pgTable('page_contents', {
  id: uuid('id').defaultRandom().primaryKey(),
  // 页面标识：about / privacy / terms / contact / certifications，全局唯一
  pageKey: varchar('page_key', { length: 50 }).notNull().unique(),
  titleZh: varchar('title_zh', { length: 200 }),
  titleEn: varchar('title_en', { length: 200 }),
  // 富文本内容（中英双语；隐私政策页包含 GDPR 数据权利说明）
  contentZh: text('content_zh'),
  contentEn: text('content_en'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
