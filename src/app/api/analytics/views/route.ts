// GET /api/analytics/views — 产品浏览排行（05 号文档 §九，需认证）
import type { NextRequest } from 'next/server';
import { eq, sql, gte, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { productViewLogs, products } from '@/drizzle/schema';
import { ok, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export const GET = withAuth(async (req: NextRequest) => {

  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 30));
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('limit')) || 20));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      productId: productViewLogs.productId,
      nameZh: products.nameZh,
      nameEn: products.nameEn,
      views: sql<number>`count(*)::int`,
      avgDurationMs: sql<number>`coalesce(avg(${productViewLogs.durationMs}), 0)::int`,
      countries: sql<number>`count(DISTINCT ${productViewLogs.country})::int`,
    })
    .from(productViewLogs)
    .leftJoin(products, eq(productViewLogs.productId, products.id))
    .where(gte(productViewLogs.timestamp, since))
    .groupBy(productViewLogs.productId, products.nameZh, products.nameEn)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  return ok(rows);
});

