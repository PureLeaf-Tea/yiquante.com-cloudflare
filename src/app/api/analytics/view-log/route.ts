// POST /api/analytics/view-log — 记录一次产品浏览（05 号文档 §九，公开）
// 客户端 sendBeacon 调用；国家代码取自 Cloudflare 的 cf-ipcountry 头（线上为 request.cf.country）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { productViewLogs } from '@/drizzle/schema';
import { getClientIp } from '@/lib/rate-limit';
import { ok, fail, parseBody, rateLimitPublic } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  const parsed = await parseBody(
    z.object({
      productId: z.string().uuid(),
      locale: z.string().max(10).optional(),
      source: z.enum(['website', 'showcase']).optional(),
      referer: z.string().max(500).optional(),
    }),
    req
  );
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;

  const rows = await db
    .insert(productViewLogs)
    .values({
      productId: body.productId,
      locale: body.locale ?? null,
      // ★Cloudflare 自带 IP 地理信息：开发环境用 cf-ipcountry 头模拟，线上自动有值
      country: req.headers.get('cf-ipcountry') ?? null,
      source: body.source ?? 'website',
      referer: body.referer ?? null,
      ip: getClientIp(req),
      userAgent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
    })
    .returning();

  return ok({ viewId: rows[0].id });
}

