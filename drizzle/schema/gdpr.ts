// GDPR 同意记录（gdpr.ts）—— 表 33/33
// 欧盟访客 Cookie 同意弹窗的选择记录（04 号文档：GDPR 记录存 Neon，D1 只存分析快照）
import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const gdprConsents = pgTable('gdpr_consents', {
  id: uuid('id').defaultRandom().primaryKey(),
  // 会话标识（前端生成的匿名 ID，不采集个人信息）
  sessionId: varchar('session_id', { length: 64 }).notNull(),
  ip: varchar('ip', { length: 45 }),
  // 同意时的国家代码（证明弹窗触发的合规依据）
  country: varchar('country', { length: 10 }),
  // 同意的 Cookie 类型（JSON 数组字符串，如 ["necessary","analytics"]）
  consent: text('consent').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
