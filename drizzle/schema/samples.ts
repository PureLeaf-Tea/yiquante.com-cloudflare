// 样品申请（samples.ts）—— 表 16/33
import { pgTable, uuid, varchar, integer, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

// 样品状态流转：new（新申请）→ processing（处理中）→ shipped（已发货）
//              → delivered（已签收）→ closed（已关闭）
export const sampleRequests = pgTable(
  'sample_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // 申请人信息（含收货地址）
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 30 }),
    company: varchar('company', { length: 200 }),
    country: varchar('country', { length: 10 }),
    address: varchar('address', { length: 500 }),
    // 申请的产品（可为空：客户也可能只填 productName 文字）
    productId: uuid('product_id'),
    productName: varchar('product_name', { length: 200 }),
    quantity: integer('quantity').default(1).notNull(),
    message: text('message'),
    status: varchar('status', { length: 20 }).default('new').notNull(),
    // 物流单号（发货后由员工填写）
    trackingNo: varchar('tracking_no', { length: 100 }),
    // 审批人（admin 批准样品寄送）
    approvedBy: uuid('approved_by').references(() => users.id),
    approvedAt: timestamp('approved_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index('idx_samples_status').on(table.status),
  })
);
