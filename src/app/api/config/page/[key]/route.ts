// GET/PUT /api/config/page/[key] — 页面内容（05 号文档 §十二）
// key: about / privacy / terms / contact / certifications
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pageContents } from '@/drizzle/schema';
import { ok, fail, parseBody, requireUser, isFail, logOperation, rateLimitPublic } from '@/lib/api-helpers';

export const runtime = 'nodejs';

type RouteContext = { params: { key: string } };

// 允许的页面 key 白名单
const VALID_KEYS = ['about', 'privacy', 'terms', 'contact', 'certifications'];

// GET：按 key 读取页面内容（公开）
export async function GET(req: NextRequest, { params }: RouteContext) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  if (!VALID_KEYS.includes(params.key)) return fail('页面不存在', 404);

  const rows = await db.select().from(pageContents).where(eq(pageContents.pageKey, params.key)).limit(1);
  return ok(rows[0] ?? null);
}

// PUT：保存页面内容（需登录；按 key upsert）
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser();
  if (isFail(auth)) return auth;

  if (!VALID_KEYS.includes(params.key)) return fail('页面不存在', 404);

  const parsed = await parseBody(
    z.object({
      titleZh: z.string().max(200).optional().nullable(),
      titleEn: z.string().max(200).optional().nullable(),
      contentZh: z.string().max(50000).optional().nullable(),
      contentEn: z.string().max(50000).optional().nullable(),
    }),
    req
  );
  if ('error' in parsed) return parsed.error;

  const existing = await db.select().from(pageContents).where(eq(pageContents.pageKey, params.key)).limit(1);
  let row;
  if (existing[0]) {
    row = (
      await db
        .update(pageContents)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(pageContents.pageKey, params.key))
        .returning()
    )[0];
  } else {
    row = (
      await db
        .insert(pageContents)
        .values({ pageKey: params.key, ...parsed.data, updatedAt: new Date() })
        .returning()
    )[0];
  }

  await logOperation(auth, 'update', 'page_content', params.key);
  return ok(row);
}
