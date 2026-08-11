// PATCH /api/inquiries/[id]/status — 更新询价状态（05 号文档 §7.4，需认证）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { inquiries } from '@/drizzle/schema';
import { ok, fail, parseBody, requireUser, isFail, logOperation } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if (isFail(auth)) return auth;

  const parsed = await parseBody(
    z.object({
      status: z.enum(['new', 'replied', 'closed']).optional(),
      priority: z.enum(['normal', 'high']).optional(),
      assignedTo: z.string().uuid().optional().nullable(),
    }),
    req
  );
  if ('error' in parsed) return parsed.error;

  const existing = await db.select().from(inquiries).where(eq(inquiries.id, params.id)).limit(1);
  if (!existing[0]) return fail('询价不存在', 404);

  const rows = await db
    .update(inquiries)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(inquiries.id, params.id))
    .returning();

  await logOperation(auth, 'update', 'inquiry_status', params.id);
  return ok(rows[0]);
}
