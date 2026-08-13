import type { AuthUser } from '@/lib/auth';
// PUT/DELETE /api/reviews/[id]（05 号文档 §十二，需认证）
// PUT：审核（发布/驳回）或编辑；DELETE：删除（admin）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { reviews } from '@/drizzle/schema';
import { ok, fail, parseBody, logOperation, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

type RouteContext = { params: { id: string } };

export const PUT = withAuth(async (req: NextRequest, { params }: RouteContext, auth: AuthUser) => {

  const parsed = await parseBody(
    z.object({
      status: z.enum(['pending', 'published', 'rejected']).optional(),
      content: z.string().min(1).max(2000).optional(),
      rating: z.number().int().min(1).max(5).optional(),
    }),
    req
  );
  if ('error' in parsed) return parsed.error;

  const existing = await db.select().from(reviews).where(eq(reviews.id, params.id)).limit(1);
  if (!existing[0]) return fail('评价不存在', 404);

  const rows = await db
    .update(reviews)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(reviews.id, params.id))
    .returning();

  await logOperation(auth, 'update', 'review', params.id, parsed.data.status);
  return ok(rows[0]);
});

export const DELETE = withAuth(async (_req: NextRequest, { params }: RouteContext, auth: AuthUser) => {

  const existing = await db.select().from(reviews).where(eq(reviews.id, params.id)).limit(1);
  if (!existing[0]) return fail('评价不存在', 404);

  await db.delete(reviews).where(eq(reviews.id, params.id));

  await logOperation(auth, 'delete', 'review', params.id);
  return ok({ id: params.id });
}, ['admin']);
