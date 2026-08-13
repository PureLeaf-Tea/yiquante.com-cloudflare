// POST/GET /api/samples（05 号文档 §八）
// POST：提交样品申请（公开 + hCaptcha + 限流 3 次/5 分钟）
// GET：样品列表（需认证，状态筛选 + 分页）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { sampleRequests } from '@/drizzle/schema';
import { validateCaptcha } from '@/lib/captcha';
import { ok, fail, parseBody, rateLimited, getPagination, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

const submitSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(100),
  phone: z.string().max(30).optional(),
  company: z.string().max(200).optional(),
  country: z.string().max(10).optional(),
  address: z.string().min(1).max(500),
  productId: z.string().uuid().optional().nullable(),
  productName: z.string().max(200).optional(),
  quantity: z.number().int().min(1).max(100).optional(),
  message: z.string().max(5000).optional(),
  hcaptchaToken: z.string().optional(),
});

// POST：客户提交样品申请
export async function POST(req: NextRequest) {
  const limited = await rateLimited(req, 'sample', 3, 5 * 60);
  if (limited) return limited;

  const parsed = await parseBody(submitSchema, req);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;

  if (!(await validateCaptcha(body.hcaptchaToken))) return fail('人机验证失败', 400);

  const country = body.country || req.headers.get('cf-ipcountry') || null;

  const rows = await db
    .insert(sampleRequests)
    .values({
      name: body.name,
      email: body.email,
      phone: body.phone ?? null,
      company: body.company ?? null,
      country,
      address: body.address,
      productId: body.productId ?? null,
      productName: body.productName ?? null,
      quantity: body.quantity ?? 1,
      message: body.message ?? null,
      updatedAt: new Date(),
    })
    .returning();

  return ok({ id: rows[0].id, status: 'new' });
}

// GET：样品列表（需认证）
export const GET = withAuth(async (req: NextRequest) => {

  const { page, pageSize, offset } = getPagination(req);
  const status = req.nextUrl.searchParams.get('status');

  const where = status ? eq(sampleRequests.status, status) : undefined;
  const rows = await db
    .select()
    .from(sampleRequests)
    .where(where)
    .orderBy(desc(sampleRequests.createdAt))
    .limit(pageSize)
    .offset(offset);

  const countRows = await db.select({ count: sql<number>`count(*)::int` }).from(sampleRequests).where(where);

  return ok(rows, { total: countRows[0]?.count || 0, page, pageSize });
});

