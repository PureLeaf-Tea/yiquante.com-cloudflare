// POST /api/showcase/verify-token — 校验 B2B token（05 号文档 §3.9）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { showcaseCategories, showcaseAccessTokens } from '@/drizzle/schema';
import { ok, fail, parseBody, rateLimitPublic } from '@/lib/api-helpers';
import { verifyShowcaseToken } from '@/lib/b2b';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  const parsed = await parseBody(
    z.object({ categorySlug: z.string().min(1), token: z.string().min(1) }),
    req
  );
  if ('error' in parsed) return parsed.error;
  const { categorySlug, token } = parsed.data;

  const rows = await db.select().from(showcaseCategories).where(eq(showcaseCategories.slug, categorySlug)).limit(1);
  const category = rows[0];
  if (!category) return fail('Token无效或已过期', 401);

  const valid = await verifyShowcaseToken(category.id, token);
  if (!valid) return fail('Token无效或已过期', 401);

  // 取过期时间返回给前端（显示剩余时长用）
  const tokenRows = await db
    .select({ expiresAt: showcaseAccessTokens.expiresAt })
    .from(showcaseAccessTokens)
    .where(eq(showcaseAccessTokens.token, token))
    .limit(1);

  return ok({ valid: true, expiresAt: tokenRows[0]?.expiresAt.toISOString() ?? null });
}

