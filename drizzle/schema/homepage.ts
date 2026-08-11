// 首页配置（homepage.ts）—— 表 19-23/33
// 首页编辑模块的数据源：主配置 + Hero 轮播图 + 卖点 + 认证 + CTA 按钮
import { pgTable, uuid, varchar, integer, boolean, text, timestamp } from 'drizzle-orm/pg-core';

// 首页主配置（单例：只有一条记录，种子数据创建）
// 存放首页全局设置（区块显隐、标题文案等），JSON 格式方便后续扩展不改表结构
export const homepageConfig = pgTable('homepage_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  configJson: text('config_json').default('{}').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Hero 轮播图（3-5 张，自动切换 5 秒）
export const heroImages = pgTable('hero_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  homepageConfigId: uuid('homepage_config_id').references(() => homepageConfig.id, {
    onDelete: 'cascade',
  }),
  imageUrl: varchar('image_url', { length: 500 }).notNull(),
  // 叠加在图上的标题 + 副标题（中英双语）
  titleZh: varchar('title_zh', { length: 200 }),
  titleEn: varchar('title_en', { length: 200 }),
  subtitleZh: varchar('subtitle_zh', { length: 300 }),
  subtitleEn: varchar('subtitle_en', { length: 300 }),
  // 点击轮播图跳转的链接（可为空）
  linkUrl: varchar('link_url', { length: 500 }),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 卖点展示（"为什么选择我们"区块，图标 + 标题 + 描述）
export const sellingPoints = pgTable('selling_points', {
  id: uuid('id').defaultRandom().primaryKey(),
  homepageConfigId: uuid('homepage_config_id').references(() => homepageConfig.id, {
    onDelete: 'cascade',
  }),
  // lucide-react 图标名（如 Leaf、ShieldCheck、Globe），前台按名字渲染组件
  icon: varchar('icon', { length: 50 }),
  titleZh: varchar('title_zh', { length: 100 }).notNull(),
  titleEn: varchar('title_en', { length: 100 }).notNull(),
  descriptionZh: varchar('description_zh', { length: 500 }),
  descriptionEn: varchar('description_en', { length: 500 }),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 认证资质展示（有机认证、ISO 等证书图片）
export const certifications = pgTable('certifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  homepageConfigId: uuid('homepage_config_id').references(() => homepageConfig.id, {
    onDelete: 'cascade',
  }),
  nameZh: varchar('name_zh', { length: 100 }).notNull(),
  nameEn: varchar('name_en', { length: 100 }).notNull(),
  imageUrl: varchar('image_url', { length: 500 }),
  // 点击证书跳转的链接（可为空）
  linkUrl: varchar('link_url', { length: 500 }),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// CTA 行动按钮（"立即询价""申请样品"等）
export const ctaButtons = pgTable('cta_buttons', {
  id: uuid('id').defaultRandom().primaryKey(),
  homepageConfigId: uuid('homepage_config_id').references(() => homepageConfig.id, {
    onDelete: 'cascade',
  }),
  textZh: varchar('text_zh', { length: 100 }).notNull(),
  textEn: varchar('text_en', { length: 100 }).notNull(),
  linkUrl: varchar('link_url', { length: 500 }).notNull(),
  // 按钮样式变体：primary（深绿实心）/ outline（暖金描边）/ light（白色描边）
  variant: varchar('variant', { length: 20 }).default('primary').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
