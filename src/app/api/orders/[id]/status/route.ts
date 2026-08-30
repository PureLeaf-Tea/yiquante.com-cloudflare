// PUT /api/orders/[id]/status — 订单状态快速切换（待发货/已发货，订单列表行内切换）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders } from '@/drizzle/schema';
import { ok, fail, parseBody, logOperation, withAuth } from '@/lib/api-helpers';
import type { AuthUser } from '@/lib/auth';

export const runtime = 'nodejs';

type RouteContext = { params: { id: string } };

export const PUT = withAuth(async (req: NextRequest, { params }: RouteContext, auth: AuthUser) => {
  const parsed = await parseBody(z.object({ status: z.enum(['pending', 'shipped']) }), req);
  if ('error' in parsed) return parsed.error;

  const existing = await db.select().from(orders).where(eq(orders.id, params.id)).limit(1);
  if (!existing[0]) return fail('订单不存在', 404);

  const rows = await db
    .update(orders)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(orders.id, params.id))
    .returning();

  await logOperation(auth, 'update', 'order_status', params.id, parsed.data.status);
  return ok(rows[0]);
});
