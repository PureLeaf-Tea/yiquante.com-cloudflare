import type { AuthUser } from '@/lib/auth';
// PATCH /api/products/[id]/status — 上架/下架切换（05 号文档 §4.6）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { products } from '@/drizzle/schema';
import { ok, fail, parseBody, logOperation, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export const PATCH = withAuth(async (req: NextRequest, { params }: { params: { id: string } }, auth: AuthUser) => {

  const parsed = await parseBody(z.object({ status: z.enum(['active', 'inactive']) }), req);
  if ('error' in parsed) return parsed.error;

  const existing = await db.select().from(products).where(eq(products.id, params.id)).limit(1);
  if (!existing[0]) return fail('产品不存在', 404);

  const rows = await db
    .update(products)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(products.id, params.id))
    .returning();

  await logOperation(auth, 'update', 'product_status', params.id, parsed.data.status);
  return ok(rows[0]);
});
