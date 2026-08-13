import type { AuthUser } from '@/lib/auth';
// GET/POST /api/config/hero — Hero 轮播图管理（阶段 17 新增，admin）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { heroImages } from '@/drizzle/schema';
import { ok, fail, parseBody, logOperation, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export const GET = withAuth(async (req: NextRequest) => {
  // N1：?device=desktop|mobile 过滤对应端列表；不传返回全部（含 device 字段）
  const device = req.nextUrl.searchParams.get('device');
  if (device && device !== 'desktop' && device !== 'mobile') {
    return fail('device 只能是 desktop 或 mobile', 400);
  }
  const rows = await db.select().from(heroImages);
  const filtered = device ? rows.filter((r) => r.device === device) : rows;
  return ok(filtered.sort((a, b) => a.sortOrder - b.sortOrder));
}, ['admin', 'editor']);

const heroSchema = z.object({
  imageUrl: z.string().min(1).max(500),
  // N1：归属端，缺省 desktop；非法值由 zod 返 400
  device: z.enum(['desktop', 'mobile']).optional(),
  titleZh: z.string().max(200).optional().nullable(),
  titleEn: z.string().max(200).optional().nullable(),
  subtitleZh: z.string().max(300).optional().nullable(),
  subtitleEn: z.string().max(300).optional().nullable(),
  linkUrl: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const POST = withAuth(async (req: NextRequest, _ctx: { params: Record<string, string> }, auth: AuthUser) => {
  const parsed = await parseBody(heroSchema, req);
  if ('error' in parsed) return parsed.error;

  const rows = await db
    .insert(heroImages)
    .values({ ...parsed.data, device: parsed.data.device ?? 'desktop', updatedAt: new Date() })
    .returning();
  await logOperation(auth, 'create', 'hero_image', rows[0].id, parsed.data.titleZh || '');
  return ok(rows[0]);
}, ['admin']);
