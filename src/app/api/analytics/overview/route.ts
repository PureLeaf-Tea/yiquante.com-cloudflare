// GET /api/analytics/overview — 浏览分析总览（05 号文档 §九，需认证）
import type { NextRequest } from 'next/server';
import { sql, gte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { productViewLogs } from '@/drizzle/schema';
import { ok, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export const GET = withAuth(async (req: NextRequest) => {

  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [summary, daily, sources] = await Promise.all([
    db
      .select({
        totalViews: sql<number>`count(*)::int`,
        uniqueCountries: sql<number>`count(DISTINCT country)::int`,
        uniqueProducts: sql<number>`count(DISTINCT product_id)::int`,
        avgDuration: sql<number>`coalesce(avg(duration_ms), 0)::int`,
      })
      .from(productViewLogs)
      .where(gte(productViewLogs.timestamp, since)),
    // 每日趋势
    db
      .select({
        date: sql<string>`to_char(${productViewLogs.timestamp}, 'YYYY-MM-DD')`,
        views: sql<number>`count(*)::int`,
      })
      .from(productViewLogs)
      .where(gte(productViewLogs.timestamp, since))
      .groupBy(sql`to_char(${productViewLogs.timestamp}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${productViewLogs.timestamp}, 'YYYY-MM-DD')`),
    // 来源分布（website 前台 / showcase B2B 展示区）
    db
      .select({
        source: productViewLogs.source,
        views: sql<number>`count(*)::int`,
      })
      .from(productViewLogs)
      .where(gte(productViewLogs.timestamp, since))
      .groupBy(productViewLogs.source),
  ]);

  return ok({
    days,
    totalViews: summary[0]?.totalViews || 0,
    uniqueCountries: summary[0]?.uniqueCountries || 0,
    uniqueProducts: summary[0]?.uniqueProducts || 0,
    avgDurationMs: summary[0]?.avgDuration || 0,
    daily,
    sourceCounts: sources,
  });
});

