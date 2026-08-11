// 浏览日志（analytics.ts）—— 表 32/33
// 客户行为分析的数据源；保留 90 天（Workers Cron 每天凌晨 4 点清理）
// 每天由 Cron 汇总写入 D1 只读快照，后台分析页查 D1 不消耗本表所在 Neon 的计算资源
import { pgTable, uuid, varchar, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { products } from './products';

export const productViewLogs = pgTable(
  'product_view_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // 被浏览的产品（产品删除时日志级联清除，分析数据以 D1 快照为准）
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    // 浏览时的语言环境
    locale: varchar('locale', { length: 10 }),
    // ISO 国家代码（服务端从 request.cf.country 自动提取，不需要 geoip 库）
    country: varchar('country', { length: 10 }),
    // 来源：website（前台）/ showcase（B2B 展示区）
    source: varchar('source', { length: 20 }).default('website').notNull(),
    // 来源页面（从哪个页面跳过来的）
    referer: varchar('referer', { length: 500 }),
    ip: varchar('ip', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
    // 停留时长（毫秒），客户端 sendBeacon 回传，上限 24 小时（86400000）
    durationMs: integer('duration_ms'),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
  // 索引（04 号文档 §8）：产品维度排行 + 国家维度分布，均按时间过滤
  (table) => ({
    productIdx: index('idx_views_product').on(table.productId, table.timestamp),
    countryIdx: index('idx_views_country').on(table.country, table.timestamp),
  })
);
