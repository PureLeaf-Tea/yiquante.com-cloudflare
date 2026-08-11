// 文件上传记录（uploads.ts）—— 表 31/33
// 所有上传到 R2 的文件留档（审计 + 防孤儿文件）
import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const uploads = pgTable('uploads', {
  id: uuid('id').defaultRandom().primaryKey(),
  // 上传类型：image（产品图）/ video（产品视频）/ chat（聊天附件）/ backup（数据库备份）
  type: varchar('type', { length: 20 }).notNull(),
  // R2 中的存储路径（如 products/abc123.jpg）
  filename: varchar('filename', { length: 255 }).notNull(),
  // 用户上传时的原始文件名
  originalName: varchar('original_name', { length: 255 }),
  // 公开访问 URL（R2 公开域名拼接）
  url: varchar('url', { length: 500 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }),
  // 文件大小（字节）
  size: integer('size').default(0).notNull(),
  // 上传人（员工删除时置空，记录保留）
  uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
