// GET/POST /api/inquiries/[id]/messages/guest — 客户前台聊天（05 号文档 §7.5，公开）
// 凭 chatToken（= 询价 ID）访问对应询价的聊天
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { inquiries, chatMessages } from '@/drizzle/schema';
import { ok, fail, parseBody, rateLimitPublic } from '@/lib/api-helpers';

export const runtime = 'nodejs';

// GET：客户读取自己询价的聊天记录（?chatToken= 必须等于询价 ID）
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  const chatToken = req.nextUrl.searchParams.get('chatToken');
  if (!chatToken || chatToken !== params.id) return fail('聊天凭证无效', 401);

  const inquiryRows = await db.select().from(inquiries).where(eq(inquiries.id, params.id)).limit(1);
  if (!inquiryRows[0]) return fail('询价不存在', 404);

  const rows = await db
    .select({
      id: chatMessages.id,
      senderType: chatMessages.senderType,
      senderName: chatMessages.senderName,
      content: chatMessages.content,
      attachment: chatMessages.attachment,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(eq(chatMessages.inquiryId, params.id))
    .orderBy(asc(chatMessages.createdAt));

  return ok(rows);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  const parsed = await parseBody(
    z.object({
      content: z.string().min(1).max(5000),
      name: z.string().max(100).optional(),
      chatToken: z.string().min(1).optional(),
    }),
    req
  );
  if ('error' in parsed) return parsed.error;

  // token 校验：chatToken 必须与询价 ID 匹配（防止跨询价串聊）
  if (parsed.data.chatToken && parsed.data.chatToken !== params.id) {
    return fail('聊天凭证无效', 401);
  }

  const inquiryRows = await db.select().from(inquiries).where(eq(inquiries.id, params.id)).limit(1);
  if (!inquiryRows[0]) return fail('询价不存在', 404);
  if (inquiryRows[0].status === 'closed') return fail('询价已关闭，无法发送消息', 400);

  const rows = await db
    .insert(chatMessages)
    .values({
      inquiryId: params.id,
      senderType: 'customer',
      senderName: parsed.data.name ?? inquiryRows[0].name,
      content: parsed.data.content,
    })
    .returning();

  return ok({ id: rows[0].id });
}
