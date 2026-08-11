// 操作日志（logs.ts）—— 表 30/33
// 记录所有增删改操作 + 登录/登出 + 配置修改 + B2B 密码变更
// 规则：只追加、不修改、不删除；保留最近 1000 条（写入时自动清理旧记录）
import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const operationLogs = pgTable(
  'operation_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // 操作人（员工被删除时置空，日志本身保留）
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    // 用户名快照（员工删除后仍能看到是谁操作的）
    username: varchar('username', { length: 20 }),
    // 操作类型：create / update / delete / login / logout / backup 等
    action: varchar('action', { length: 50 }).notNull(),
    // 操作对象类型：product / category / showcase_category / user / inquiry 等
    targetType: varchar('target_type', { length: 50 }),
    // 操作对象 ID（用 varchar 兼容 uuid 和其他键）
    targetId: varchar('target_id', { length: 50 }),
    // 变更详情（JSON 字符串，记录变更前后的关键字段）
    detail: text('detail'),
    ip: varchar('ip', { length: 45 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  // 索引（04 号文档 §8）：按操作人查 + 按时间倒序查
  (table) => ({
    userIdx: index('idx_logs_user').on(table.userId),
    createdIdx: index('idx_logs_created').on(table.createdAt),
  })
);
