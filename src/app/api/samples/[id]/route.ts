import type { AuthUser } from '@/lib/auth';
// GET/DELETE /api/samples/[id]（05 号文档 §八）
import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { sampleRequests } from '@/drizzle/schema';
import { ok, fail, logOperation, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

type RouteContext = { params: { id: string } };

// GET：样品详情（需认证）
export const GET = withAuth(async (_req: NextRequest, { params }: RouteContext, auth: AuthUser) => {

  const rows = await db.select().from(sampleRequests).where(eq(sampleRequests.id, params.id)).limit(1);
  if (!rows[0]) return fail('样品申请不存在', 404);
  return ok(rows[0]);
});

// DELETE：删除样品记录（仅 admin）
export const DELETE = withAuth(async (_req: NextRequest, { params }: RouteContext, auth: AuthUser) => {

  const existing = await db.select().from(sampleRequests).where(eq(sampleRequests.id, params.id)).limit(1);
  if (!existing[0]) return fail('样品申请不存在', 404);

  await db.delete(sampleRequests).where(eq(sampleRequests.id, params.id));

  await logOperation(auth, 'delete', 'sample', params.id, existing[0].name);
  return ok({ id: params.id });
}, ['admin']);
