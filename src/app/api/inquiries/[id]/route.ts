// GET /api/inquiries/[id] — 询价详情（05 号文档 §7.3，需认证）
import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { inquiries, inquiryItems } from '@/drizzle/schema';
import { ok, fail, requireUser, isFail } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if (isFail(auth)) return auth;

  const rows = await db.select().from(inquiries).where(eq(inquiries.id, params.id)).limit(1);
  if (!rows[0]) return fail('询价不存在', 404);

  const items = await db.select().from(inquiryItems).where(eq(inquiryItems.inquiryId, params.id));

  return ok({ ...rows[0], items });
}
