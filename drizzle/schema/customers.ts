// 订单系统 · 客户名单（customers.ts）—— v2.0 订单模块新增表
// 后台 /admin/customers 维护；订单通过 customerId 关联（删除客户后置 null，订单保留）
import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  // 客户姓名（必填）
  name: varchar('name', { length: 200 }).notNull(),
  // 国家（自由文本，可空）
  country: varchar('country', { length: 100 }),
  // 默认语言代码（en/zh/ru/de/es/fr）：建订单选该客户时自动带出，可改
  defaultLang: varchar('default_lang', { length: 10 }).default('en').notNull(),
  // 备注（仅后台可见）
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
