// GET/PUT/DELETE /api/customers/[id] — 客户详情/编辑/删除（订单模块第 2 期）
// 删除客户：外键 onDelete set null → 订单 customerId 置空，订单保留（需求文档 §5.3）
import type { NextRequest } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { customers, orders } from '@/drizzle/schema';
import { ok, fail, parseBody, logOperation, withAuth } from '@/lib/api-helpers';
import { customerSchema } from '@/lib/orders-shared';
import type { AuthUser } from '@/lib/auth';

export const runtime = 'nodejs';

type RouteContext = { params: { id: string } };

// GET：客户详情（附订单数）
export const GET = withAuth(async (_req: NextRequest, { params }: RouteContext) => {
  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      country: customers.country,
      defaultLang: customers.defaultLang,
      note: customers.note,
      createdAt: customers.createdAt,
      orderCount: sql<number>`(SELECT count(*)::int FROM orders WHERE customer_id = ${customers.id})`,
    })
    .from(customers)
    .where(eq(customers.id, params.id))
    .limit(1);
  if (!rows[0]) return fail('客户不存在', 404);
  return ok(rows[0]);
});

// PUT：编辑客户
export const PUT = withAuth(async (req: NextRequest, { params }: RouteContext, auth: AuthUser) => {
  const parsed = await parseBody(customerSchema.partial(), req);
  if ('error' in parsed) return parsed.error;

  const existing = await db.select().from(customers).where(eq(customers.id, params.id)).limit(1);
  if (!existing[0]) return fail('客户不存在', 404);

  const body = parsed.data;
  const rows = await db
    .update(customers)
    .set({
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.country !== undefined ? { country: body.country } : {}),
      ...(body.defaultLang !== undefined ? { defaultLang: body.defaultLang } : {}),
      ...(body.note !== undefined ? { note: body.note } : {}),
    })
    .where(eq(customers.id, params.id))
    .returning();

  await logOperation(auth, 'update', 'customer', params.id, rows[0].name);
  return ok(rows[0]);
});

// DELETE：删除客户（订单保留，customerId 置空）
export const DELETE = withAuth(async (_req: NextRequest, { params }: RouteContext, auth: AuthUser) => {
  const existing = await db.select().from(customers).where(eq(customers.id, params.id)).limit(1);
  if (!existing[0]) return fail('客户不存在', 404);

  await db.delete(customers).where(eq(customers.id, params.id));

  await logOperation(auth, 'delete', 'customer', params.id, existing[0].name);
  return ok({ id: params.id });
});
