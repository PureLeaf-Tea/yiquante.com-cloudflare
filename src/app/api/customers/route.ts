// GET/POST /api/customers — 客户名单（订单模块第 2 期，需求文档 §5.3）
// GET：客户列表（附订单数）；POST：新建客户
import type { NextRequest } from 'next/server';
import { like, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { customers, orders } from '@/drizzle/schema';
import { ok, parseBody, logOperation, withAuth } from '@/lib/api-helpers';
import { customerSchema } from '@/lib/orders-shared';
import type { AuthUser } from '@/lib/auth';

export const runtime = 'nodejs';

// GET：客户列表（附每个客户的订单数），按创建时间倒序；?search= 姓名模糊
export const GET = withAuth(async (req: NextRequest) => {
  const search = (req.nextUrl.searchParams.get('search') || '').trim();

  const conditions = [];
  if (search) conditions.push(like(customers.name, `%${search}%`));

  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      country: customers.country,
      defaultLang: customers.defaultLang,
      note: customers.note,
      createdAt: customers.createdAt,
      // 订单数：客户被订单引用的数量（删除客户后订单保留，计数归零）
      orderCount: sql<number>`(SELECT count(*)::int FROM orders WHERE customer_id = ${customers.id})`,
    })
    .from(customers)
    .where(conditions.length > 0 ? conditions[0] : undefined)
    .orderBy(sql`${customers.createdAt} DESC`);

  return ok(rows);
});

// POST：新建客户
export const POST = withAuth(async (req: NextRequest, _ctx: { params: Record<string, string> }, auth: AuthUser) => {
  const parsed = await parseBody(customerSchema, req);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;

  const rows = await db
    .insert(customers)
    .values({
      name: body.name.trim(),
      country: body.country ?? null,
      defaultLang: body.defaultLang ?? 'en',
      note: body.note ?? null,
    })
    .returning();

  await logOperation(auth, 'create', 'customer', rows[0].id, body.name);
  return ok(rows[0]);
});
