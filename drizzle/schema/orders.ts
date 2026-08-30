// 订单系统 · 订单与明细（orders.ts）—— v2.0 订单模块新增表
// 员工后台创建订单 → 前台 /o/[orderNo] 公开展示（语言/主题由订单字段决定）
import { pgTable, uuid, varchar, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { customers } from './customers';
import { products } from './products';

// 订单主表
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  // 订单号（如 YQ-20260828-JC01），自动生成或手动输入；前台路由 /o/[orderNo] 依此访问
  // unique 约束自带索引，无需另建
  orderNo: varchar('order_no', { length: 50 }).notNull().unique(),
  // 客户（可空：客户被删除时置 null，订单保留，前台显示"客户已删除"）
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  // 订单日期（存 'YYYY-MM-DD' 字符串，避免 date 类型的时区偏移）
  date: varchar('date', { length: 10 }).notNull(),
  // pending 待发货 / shipped 已发货
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  // 订单页显示语言（/o/ 路由不走 [locale]，按此字段渲染，缺失回退 en→zh）
  lang: varchar('lang', { length: 10 }).default('en').notNull(),
  // 主题：brand（主站品牌色，默认）/ classic（深咖暖色）
  theme: varchar('theme', { length: 20 }).default('brand').notNull(),
  // 祝福语：外文 + 中文两行
  blessingForeign: text('blessing_foreign'),
  blessingCn: text('blessing_cn'),
  // 后台备注（不展示给客户）
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 订单明细（购买商品 item / 赠品 gift 同表，type 区分）
export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  // 所属订单（订单删除级联清理明细）
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  // 商品（可空：商品被删除时置 null，订单页显示"商品已下架"占位，保留历史订单完整性）
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  // item（购买商品）/ gift（赠品）
  type: varchar('type', { length: 10 }).default('item').notNull(),
  // 数量（≥1）
  qty: integer('qty').default(1).notNull(),
  // 排序
  sort: integer('sort_order').default(0).notNull(),
});
