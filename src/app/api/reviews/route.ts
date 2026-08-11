// GET/POST /api/reviews — 客户评价（05 号文档 §十二）
// GET：已发布评价（前台首页用，公开）/ 全部评价（带 status=all 需认证）
// POST：提交评价（需登录，后台代录；前台评价入口阶段 17 接）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { reviews } from '@/drizzle/schema';
import { ok, fail, parseBody, rateLimitPublic, requireUser, isFail, logOperation, getPagination } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  const { page, pageSize, offset } = getPagination(req);
  const status = req.nextUrl.searchParams.get('status');

  if (status && status !== 'published') {
    // 查看非已发布评价需要登录（后台审核用）
    const auth = await requireUser();
    if (isFail(auth)) return auth;
  }

  const where = status ? eq(reviews.status, status) : eq(reviews.status, 'published');
  const rows = await db
    .select()
    .from(reviews)
    .where(where)
    .orderBy(desc(reviews.createdAt))
    .limit(pageSize)
    .offset(offset);

  const countRows = await db.select({ count: sql<number>`count(*)::int` }).from(reviews).where(where);
  return ok(rows, { total: countRows[0]?.count || 0, page, pageSize });
}

const createSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(100),
  rating: z.number().int().min(1).max(5),
  content: z.string().min(1).max(2000),
  locale: z.string().max(10).optional(),
  status: z.enum(['pending', 'published', 'rejected']).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (isFail(auth)) return auth;

  const parsed = await parseBody(createSchema, req);
  if ('error' in parsed) return parsed.error;

  const rows = await db
    .insert(reviews)
    .values({
      productId: parsed.data.productId ?? null,
      name: parsed.data.name,
      rating: parsed.data.rating,
      content: parsed.data.content,
      locale: parsed.data.locale ?? null,
      status: parsed.data.status ?? 'pending',
      updatedAt: new Date(),
    })
    .returning();

  await logOperation(auth, 'create', 'review', rows[0].id);
  return ok(rows[0]);
}

