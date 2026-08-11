// GET/PUT /api/config/seo/[key] — 页面级 SEO 设置（05 号文档 §十二）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { seoSettings } from '@/drizzle/schema';
import { ok, fail, parseBody, requireUser, isFail, logOperation, rateLimitPublic } from '@/lib/api-helpers';

export const runtime = 'nodejs';

type RouteContext = { params: { key: string } };

const VALID_KEYS = ['home', 'products', 'b2b', 'about', 'certifications', 'contact', 'sample', 'privacy', 'terms'];

// GET：按页面 key 读取 SEO 设置（公开）
export async function GET(req: NextRequest, { params }: RouteContext) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  if (!VALID_KEYS.includes(params.key)) return fail('页面不存在', 404);

  const rows = await db.select().from(seoSettings).where(eq(seoSettings.pageKey, params.key)).limit(1);
  return ok(rows[0] ?? null);
}

// PUT：保存 SEO 设置（admin；按 key upsert）
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(['admin']);
  if (isFail(auth)) return auth;

  if (!VALID_KEYS.includes(params.key)) return fail('页面不存在', 404);

  const parsed = await parseBody(
    z.object({
      titleZh: z.string().max(200).optional().nullable(),
      titleEn: z.string().max(200).optional().nullable(),
      descriptionZh: z.string().max(500).optional().nullable(),
      descriptionEn: z.string().max(500).optional().nullable(),
      keywords: z.string().max(500).optional().nullable(),
      hreflangEnabled: z.boolean().optional(),
    }),
    req
  );
  if ('error' in parsed) return parsed.error;

  const existing = await db.select().from(seoSettings).where(eq(seoSettings.pageKey, params.key)).limit(1);
  let row;
  if (existing[0]) {
    row = (
      await db
        .update(seoSettings)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(seoSettings.pageKey, params.key))
        .returning()
    )[0];
  } else {
    row = (
      await db.insert(seoSettings).values({ pageKey: params.key, ...parsed.data, updatedAt: new Date() }).returning()
    )[0];
  }

  await logOperation(auth, 'update', 'seo_setting', params.key);
  return ok(row);
}
