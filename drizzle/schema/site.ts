// 网站设置（site.ts）—— 表 27/33
// 单例表：全表只有一条记录，id 固定为 'main'
import { pgTable, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';

export const siteConfig = pgTable('site_config', {
  // ★注意：本表 id 不用 uuid，固定值 'main'（04 号文档：单例表 id="main"）
  id: varchar('id', { length: 10 }).primaryKey().default('main'),
  // 品牌信息
  brandNameZh: varchar('brand_name_zh', { length: 100 }),
  brandNameEn: varchar('brand_name_en', { length: 100 }),
  sloganZh: varchar('slogan_zh', { length: 200 }),
  sloganEn: varchar('slogan_en', { length: 200 }),
  // 品牌色（后台"网站设置"可调，前台 CSS 变量消费）
  brandColorPrimary: varchar('brand_color_primary', { length: 20 }),
  brandColorSecondary: varchar('brand_color_secondary', { length: 20 }),
  // 联系信息（页脚 + 联系我们页展示）
  contactEmail: varchar('contact_email', { length: 100 }),
  contactPhone: varchar('contact_phone', { length: 30 }),
  whatsapp: varchar('whatsapp', { length: 30 }),
  wechat: varchar('wechat', { length: 50 }),
  addressZh: varchar('address_zh', { length: 200 }),
  addressEn: varchar('address_en', { length: 200 }),
  // 功能开关：GDPR Cookie 弹窗 / hCaptcha 人机验证
  gdprEnabled: boolean('gdpr_enabled').default(true).notNull(),
  hcaptchaEnabled: boolean('hcaptcha_enabled').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
