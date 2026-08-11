// 社交媒体链接（social.ts）—— 表 25/33
import { pgTable, uuid, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const socialLinks = pgTable('social_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  // 平台标识：whatsapp / wechat / instagram / facebook / youtube / x 等
  platform: varchar('platform', { length: 30 }).notNull(),
  // 显示名称（如 "WhatsApp"、"微信"）
  labelZh: varchar('label_zh', { length: 50 }),
  labelEn: varchar('label_en', { length: 50 }),
  // 链接地址（微信号等非 URL 信息也存这里）
  url: varchar('url', { length: 500 }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
