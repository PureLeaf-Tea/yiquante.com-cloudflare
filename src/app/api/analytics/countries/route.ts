// GET /api/analytics/countries — 国家分布（05 号文档 §九，需认证）
import type { NextRequest } from 'next/server';
import { sql, gte, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { productViewLogs } from '@/drizzle/schema';
import { ok, requireUser, isFail } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (isFail(auth)) return auth;

  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      country: productViewLogs.country,
      views: sql<number>`count(*)::int`,
    })
    .from(productViewLogs)
    .where(gte(productViewLogs.timestamp, since))
    .groupBy(productViewLogs.country)
    .orderBy(desc(sql`count(*)`));

  return ok(rows);
}

