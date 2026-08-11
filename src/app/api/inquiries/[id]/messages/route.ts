// GET/POST /api/inquiries/[id]/messages — 聊天消息（05 号文档 §7.5）
// GET：消息列表（需认证）；POST：员工发送消息（需认证）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { inquiries, chatMessages } from '@/drizzle/schema';
import { ok, fail, parseBody, requireUser, isFail } from '@/lib/api-helpers';

export const runtime = 'nodejs';

type RouteContext = { params: { id: string } };

async function inquiryExists(id: string) {
  const rows = await db.select({ id: inquiries.id }).from(inquiries).where(eq(inquiries.id, id)).limit(1);
  return rows.length > 0;
}

// GET：消息列表（按时间正序，聊天窗口直接渲染）
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser();
  if (isFail(auth)) return auth;

  if (!(await inquiryExists(params.id))) return fail('询价不存在', 404);

  const rows = await db
    .select({
      id: chatMessages.id,
      senderType: chatMessages.senderType,
      senderName: chatMessages.senderName,
      content: chatMessages.content,
      attachment: chatMessages.attachment,
      isRead: chatMessages.isRead,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(eq(chatMessages.inquiryId, params.id))
    .orderBy(asc(chatMessages.createdAt));

  return ok(rows);
}

// POST：员工发送消息
export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser();
  if (isFail(auth)) return auth;

  const parsed = await parseBody(
    z.object({
      content: z.string().min(1).max(5000),
      attachment: z.string().max(500).optional().nullable(),
    }),
    req
  );
  if ('error' in parsed) return parsed.error;

  const inquiryRows = await db.select().from(inquiries).where(eq(inquiries.id, params.id)).limit(1);
  if (!inquiryRows[0]) return fail('询价不存在', 404);
  // 已关闭的询价不能再发消息
  if (inquiryRows[0].status === 'closed') return fail('询价已关闭，无法发送消息', 400);

  const rows = await db
    .insert(chatMessages)
    .values({
      inquiryId: params.id,
      senderType: 'staff',
      senderId: auth.id,
      senderName: auth.name,
      content: parsed.data.content,
      attachment: parsed.data.attachment ?? null,
    })
    .returning();

  // 员工回复后询价自动流转到 replied
  if (inquiryRows[0].status === 'new') {
    await db.update(inquiries).set({ status: 'replied', updatedAt: new Date() }).where(eq(inquiries.id, params.id));
  }

  return ok({ id: rows[0].id });
}
