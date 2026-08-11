// 询价系统（inquiries.ts）—— 表 13-15/33
// 询价主表 + 询价明细（产品清单）+ 在线聊天消息
import { pgTable, uuid, varchar, integer, boolean, text, timestamp, index } from 'drizzle-orm/pg-core';
import { products } from './products';
import { users } from './users';

// 询价主表（一次询价 = 一个客户会话）
export const inquiries = pgTable(
  'inquiries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // 客户信息（提交询价表单时收集）
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 30 }),
    company: varchar('company', { length: 200 }),
    // ISO 国家代码（服务端从 request.cf.country 自动提取）
    country: varchar('country', { length: 10 }),
    message: text('message'),
    // new（新询价）→ replied（已回复）→ closed（已关闭）等
    status: varchar('status', { length: 20 }).default('new').notNull(),
    // 优先级：normal / high
    priority: varchar('priority', { length: 20 }).default('normal').notNull(),
    // 指派给哪位员工跟进
    assignedTo: uuid('assigned_to').references(() => users.id),
    // 来源：website（前台表单）/ showcase（B2B 展示区）
    source: varchar('source', { length: 20 }).default('website').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index('idx_inquiries_status').on(table.status),
  })
);

// 询价明细（一次询价可包含多个产品）
export const inquiryItems = pgTable('inquiry_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  inquiryId: uuid('inquiry_id')
    .notNull()
    .references(() => inquiries.id, { onDelete: 'cascade' }),
  // ★可空 + 删除置空：产品被删后询价记录仍保留（productName 快照兜底）
  // 注：04 号文档原稿写 notNull + set null，二者逻辑冲突，此处以数据完整性优先
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  // 产品名快照（防止产品改名/删除后询价记录失去上下文）
  productName: varchar('product_name', { length: 200 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
});

// ★在线聊天消息（挂在询价下，一期 15 秒轮询，二期升级 Durable Objects 实时推送）
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    inquiryId: uuid('inquiry_id')
      .notNull()
      .references(() => inquiries.id, { onDelete: 'cascade' }),
    // "customer"（客户前台留言）| "staff"（员工后台回复）
    senderType: varchar('sender_type', { length: 20 }).notNull(),
    // 客户消息无 senderId；员工消息记录发送人
    senderId: uuid('sender_id').references(() => users.id, { onDelete: 'set null' }),
    senderName: varchar('sender_name', { length: 100 }),
    content: text('content').notNull(),
    // 图片附件（R2 URL）
    attachment: varchar('attachment', { length: 500 }),
    // 已读状态（员工消息追踪客户是否已读）；消息只追加不修改
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  // 复合索引：按询价查消息并按时间排序（聊天窗口核心查询）
  (table) => ({
    inquiryIdx: index('idx_chat_inquiry').on(table.inquiryId, table.createdAt),
  })
);
