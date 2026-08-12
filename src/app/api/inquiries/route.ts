// POST/GET /api/inquiries（05 号文档 §7.1/§7.2）
// POST：提交询价（公开 + hCaptcha + 限流 3 次/5 分钟）
// GET：询价列表（需认证，带筛选分页）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, desc, sql, and, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { inquiries, inquiryItems, chatMessages } from '@/drizzle/schema';
import { getClientIp } from '@/lib/rate-limit';
import { validateCaptcha } from '@/lib/captcha';
import { ok, fail, parseBody, rateLimited, requireUser, isFail, getPagination } from '@/lib/api-helpers';

export const runtime = 'nodejs';

const submitSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(100),
  phone: z.string().max(30).optional(),
  company: z.string().max(200).optional(),
  country: z.string().max(10).optional(),
  message: z.string().max(5000).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid().optional().nullable(),
        productName: z.string().min(1).max(200),
        quantity: z.number().int().min(1).optional(),
      })
    )
    .optional(),
  hcaptchaToken: z.string().optional(),
});

// POST：客户提交询价
export async function POST(req: NextRequest) {
  // 限流：3 次/5 分钟/IP（05 号文档限流表）
  const limited = await rateLimited(req, 'inquiry', 3, 5 * 60);
  if (limited) return limited;

  const parsed = await parseBody(submitSchema, req);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;

  // 人机验证（开发阶段自动跳过）
  if (!(await validateCaptcha(body.hcaptchaToken))) return fail('人机验证失败', 400);

  // 国家代码：请求体优先，其次 Cloudflare 自带 IP 地理信息
  const country = body.country || req.headers.get('cf-ipcountry') || null;

  const rows = await db
    .insert(inquiries)
    .values({
      name: body.name,
      email: body.email,
      phone: body.phone ?? null,
      company: body.company ?? null,
      country,
      message: body.message ?? null,
      source: 'website',
      updatedAt: new Date(),
    })
    .returning();
  const inquiry = rows[0];

  // 询价明细（产品快照）
  for (const item of body.items || []) {
    await db.insert(inquiryItems).values({
      inquiryId: inquiry.id,
      productId: item.productId ?? null,
      productName: item.productName,
      quantity: item.quantity ?? 1,
    });
  }

  // chatToken：客户后续聊天的身份凭证（开发阶段直接用询价 ID，上线可换签名 token）
  const chatToken = inquiry.id;

  return ok({ id: inquiry.id, chatToken });
}

// GET：询价列表（需认证）
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (isFail(auth)) return auth;

  const { page, pageSize, offset } = getPagination(req);
  const status = req.nextUrl.searchParams.get('status');

  const where = status ? eq(inquiries.status, status) : undefined;
  const rows = await db
    .select({
      id: inquiries.id,
      name: inquiries.name,
      email: inquiries.email,
      company: inquiries.company,
      country: inquiries.country,
      status: inquiries.status,
      priority: inquiries.priority,
      assignedTo: inquiries.assignedTo,
      source: inquiries.source,
      createdAt: inquiries.createdAt,
    })
    .from(inquiries)
    .where(where)
    .orderBy(desc(inquiries.createdAt))
    .limit(pageSize)
    .offset(offset);

  const countRows = await db.select({ count: sql<number>`count(*)::int` }).from(inquiries).where(where);

  // ★关联字段改为 JS 端聚合（drizzle 关联标量子查询不可靠，阶段 9/16 两次验证）
  const ids = rows.map((r) => r.id);
  let unreadMap = new Map<string, number>();
  let itemNamesMap = new Map<string, string[]>();
  if (ids.length > 0) {
    const [unreadRows, itemRows] = await Promise.all([
      db
        .select({ inquiryId: chatMessages.inquiryId, n: sql<number>`count(*)::int` })
        .from(chatMessages)
        .where(and(inArray(chatMessages.inquiryId, ids), eq(chatMessages.senderType, 'customer'), eq(chatMessages.isRead, false)))
        .groupBy(chatMessages.inquiryId),
      db
        .select({ inquiryId: inquiryItems.inquiryId, productName: inquiryItems.productName })
        .from(inquiryItems)
        .where(inArray(inquiryItems.inquiryId, ids)),
    ]);
    unreadMap = new Map(unreadRows.map((u) => [u.inquiryId, u.n]));
    for (const it of itemRows) {
      if (!itemNamesMap.has(it.inquiryId)) itemNamesMap.set(it.inquiryId, []);
      if (it.productName) itemNamesMap.get(it.inquiryId)!.push(it.productName);
    }
  }

  const enriched = rows.map((r) => ({
    ...r,
    unreadMessages: unreadMap.get(r.id) || 0,
    itemNames: itemNamesMap.get(r.id) ?? null,
  }));

  return ok(enriched, { total: countRows[0]?.count || 0, page, pageSize });
}

