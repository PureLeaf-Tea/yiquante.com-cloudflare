// PATCH /api/samples/[id]/status — 样品状态流转 + 物流单号（05 号文档 §八）
// 流转：new → processing → shipped（填单号）→ delivered → closed
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { sampleRequests } from '@/drizzle/schema';
import { ok, fail, parseBody, requireUser, isFail, logOperation } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if (isFail(auth)) return auth;

  const parsed = await parseBody(
    z.object({
      status: z.enum(['new', 'processing', 'shipped', 'delivered', 'closed']).optional(),
      trackingNo: z.string().max(100).optional().nullable(),
    }),
    req
  );
  if ('error' in parsed) return parsed.error;

  const existing = await db.select().from(sampleRequests).where(eq(sampleRequests.id, params.id)).limit(1);
  if (!existing[0]) return fail('样品申请不存在', 404);

  // 发货状态必须带物流单号
  if (parsed.data.status === 'shipped' && !parsed.data.trackingNo && !existing[0].trackingNo) {
    return fail('发货状态必须填写物流单号', 400);
  }

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.status) update.status = parsed.data.status;
  if (parsed.data.trackingNo !== undefined) update.trackingNo = parsed.data.trackingNo;
  // 批准流转记录批准人
  if (parsed.data.status && parsed.data.status !== 'new' && !existing[0].approvedBy) {
    update.approvedBy = auth.id;
    update.approvedAt = new Date();
  }

  const rows = await db.update(sampleRequests).set(update).where(eq(sampleRequests.id, params.id)).returning();

  await logOperation(auth, 'update', 'sample_status', params.id, parsed.data.status);
  return ok(rows[0]);
}
