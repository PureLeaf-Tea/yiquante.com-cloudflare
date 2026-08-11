// PATCH /api/inquiries/[id]/messages/read — 标记消息已读（05 号文档 §7.5，需认证）
import type { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { chatMessages } from '@/drizzle/schema';
import { ok, requireUser, isFail } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if (isFail(auth)) return auth;

  // 员工打开聊天窗口：把客户发的消息全部标记已读
  await db
    .update(chatMessages)
    .set({ isRead: true })
    .where(and(eq(chatMessages.inquiryId, params.id), eq(chatMessages.senderType, 'customer'), eq(chatMessages.isRead, false)));

  return ok(null);
}
