// 用户与认证（users.ts）—— 表 1/33
// pgEnum：PostgreSQL 枚举类型，限定字段只能取几个固定值
import { pgTable, uuid, varchar, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';

// 后台三种角色：管理员（全部权限）/ 编辑（内容管理）/ 客服（询价+样品）
export const userRoleEnum = pgEnum('user_role', ['admin', 'editor', 'customer_service']);
// 账号状态：启用 / 禁用
export const userStatusEnum = pgEnum('user_status', ['active', 'disabled']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  // 登录账号（手机号），最长 20 位，全局唯一
  username: varchar('username', { length: 20 }).notNull().unique(),
  // 密码哈希（Web Crypto API SHA-256，不可逆），128 位足够存 64 位十六进制哈希
  password: varchar('password', { length: 128 }).notNull(),
  // 显示名称（后台右上角"欢迎, xxx"）
  name: varchar('name', { length: 50 }).notNull(),
  role: userRoleEnum('role').default('editor').notNull(),
  status: userStatusEnum('status').default('active').notNull(),
  // 连续登录失败次数（达到 5 次锁定 15 分钟）
  loginAttempts: integer('login_attempts').default(0).notNull(),
  // 锁定截止时间（为空表示未锁定）
  lockedUntil: timestamp('locked_until'),
  lastLoginAt: timestamp('last_login_at'),
  // 最后活跃时间（用于 1 小时无操作自动退出的判断）
  lastActivityAt: timestamp('last_activity_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
