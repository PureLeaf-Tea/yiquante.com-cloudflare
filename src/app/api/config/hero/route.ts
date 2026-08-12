// GET/POST /api/config/hero — Hero 轮播图管理（阶段 17 新增，admin）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { heroImages } from '@/drizzle/schema';
import { ok, fail, parseBody, requireUser, isFail, logOperation } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireUser(['admin', 'editor']);
  if (isFail(auth)) return auth;
  const rows = await db.select().from(heroImages);
  return ok(rows.sort((a, b) => a.sortOrder - b.sortOrder));
}

const heroSchema = z.object({
  imageUrl: z.string().min(1).max(500),
  titleZh: z.string().max(200).optional().nullable(),
  titleEn: z.string().max(200).optional().nullable(),
  subtitleZh: z.string().max(300).optional().nullable(),
  subtitleEn: z.string().max(300).optional().nullable(),
  linkUrl: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser(['admin']);
  if (isFail(auth)) return auth;
  const parsed = await parseBody(heroSchema, req);
  if ('error' in parsed) return parsed.error;

  const rows = await db
    .insert(heroImages)
    .values({ ...parsed.data, updatedAt: new Date() })
    .returning();
  await logOperation(auth, 'create', 'hero_image', rows[0].id, parsed.data.titleZh || '');
  return ok(rows[0]);
}
