// D1 数据库操作（db-d1.ts）
// D1：Cloudflare 原生的轻量 SQLite 数据库，在 Workers 里通过环境绑定（env.YIQUANTEA_D1）访问
//
// ⚠️ 存储分工（04 号文档 §4.1 最新裁定，覆盖 03 号文档旧描述）：
//    D1 只存"浏览统计的按天汇总只读快照"——每天由 Cron 从 Neon 汇总一次写入；
//    站点配置（site_config）和 GDPR 记录（gdpr_consents）都存 Neon，Neon 是唯一真实数据源。

// 分析日快照：一行 = 一天的浏览统计汇总
export interface AnalyticsDailySnapshot {
  date: string; // YYYY-MM-DD
  views: number; // 当日总浏览量
  visitors: number; // 当日独立访客数（按会话去重）
  topCountry: string | null; // 当日访问量最高的国家代码
  updatedAt: number; // 写入时间戳（毫秒）
}

// 写入/更新一天的汇总快照（Cron 每天凌晨执行一次）
// INSERT OR REPLACE：同一天重复汇总时覆盖旧值（SQLite 语法）
export function upsertDailySnapshot(d1: D1Database, row: AnalyticsDailySnapshot) {
  return d1
    .prepare(
      `INSERT OR REPLACE INTO analytics_daily (date, views, visitors, top_country, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(row.date, row.views, row.visitors, row.topCountry, row.updatedAt)
    .run();
}

// 读取最近 N 天的快照（后台"客户行为分析"页用——查 D1，不消耗 Neon 计算资源）
export function getDailySnapshots(d1: D1Database, days: number) {
  return d1
    .prepare('SELECT * FROM analytics_daily ORDER BY date DESC LIMIT ?')
    .bind(days)
    .all<AnalyticsDailySnapshot>();
}

// 建表语句（部署时用 `wrangler d1 execute` 执行一次即可）
export const D1_INIT_SQL = `
CREATE TABLE IF NOT EXISTS analytics_daily (
  date TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  visitors INTEGER NOT NULL DEFAULT 0,
  top_country TEXT,
  updated_at INTEGER NOT NULL
);
`;
