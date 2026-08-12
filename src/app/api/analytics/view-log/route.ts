// GET/POST /api/analytics/view-log — 浏览日志（05 号文档 §九）
// POST 公开：客户端 sendBeacon 记录浏览；国家代码取自 cf-ipcountry 头（线上为 request.cf.country）
// GET 需认证：浏览明细列表（分析页热度矩阵聚合用）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { desc, sql, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { productViewLogs, products } from '@/drizzle/schema';
import { getClientIp } from '@/lib/rate-limit';
import { ok, fail, parseBody, rateLimitPublic, requireUser, isFail, getPagination } from '@/lib/api-helpers';

export const runtime = 'nodejs';

// GET：浏览明细列表（倒序分页，可带 productId 过滤）
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (isFail(auth)) return auth;

  const { page, pageSize, offset } = getPagination(req);
  const productId = req.nextUrl.searchParams.get('productId');
  const where = productId ? eq(productViewLogs.productId, productId) : undefined;

  const rows = await db
    .select({
      id: productViewLogs.id,
      productId: productViewLogs.productId,
      nameZh: products.nameZh,
      locale: productViewLogs.locale,
      country: productViewLogs.country,
      source: productViewLogs.source,
      durationMs: productViewLogs.durationMs,
      timestamp: productViewLogs.timestamp,
    })
    .from(productViewLogs)
    .leftJoin(products, eq(productViewLogs.productId, products.id))
    .where(where)
    .orderBy(desc(productViewLogs.timestamp))
    .limit(pageSize)
    .offset(offset);

  const countRows = await db.select({ count: sql<number>`count(*)::int` }).from(productViewLogs).where(where);

  return ok(rows, { total: countRows[0]?.count || 0, page, pageSize });
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  const parsed = await parseBody(
    z.object({
      productId: z.string().uuid(),
      locale: z.string().max(10).optional(),
      source: z.enum(['website', 'showcase']).optional(),
      referer: z.string().max(500).optional(),
    }),
    req
  );
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;

  const rows = await db
    .insert(productViewLogs)
    .values({
      productId: body.productId,
      locale: body.locale ?? null,
      // ★Cloudflare 自带 IP 地理信息：开发环境用 cf-ipcountry 头模拟，线上自动有值
      country: req.headers.get('cf-ipcountry') ?? null,
      source: body.source ?? 'website',
      referer: body.referer ?? null,
      ip: getClientIp(req),
      userAgent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
    })
    .returning();

  return ok({ viewId: rows[0].id });
}

