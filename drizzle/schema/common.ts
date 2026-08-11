// 公共基础字段（common.ts）
// Drizzle ORM：用 TypeScript 描述数据库表结构的工具（代替 Prisma）
// pgTable：定义 PostgreSQL 表；uuid：通用唯一标识符类型（128 位随机 ID）
import { uuid, timestamp } from 'drizzle-orm/pg-core';

// 公共字段：每张表都需要 id + createdAt + updatedAt
// 注意：个别表（如操作日志、聊天消息）只有 createdAt，需自行单独定义
export const baseFields = {
  id: uuid('id').defaultRandom().primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
};
