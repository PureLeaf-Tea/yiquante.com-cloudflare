// GET/PUT /api/config/site — 网站设置（05 号文档 §十二）
// site_config 是单例表（id='main'）；GET 公开（前台渲染需要），PUT 仅 admin
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { siteConfig } from '@/drizzle/schema';
import { ok, parseBody, requireUser, isFail, logOperation, rateLimitPublic } from '@/lib/api-helpers';

export const runtime = 'nodejs';

async function getSiteRow() {
  const rows = await db.select().from(siteConfig).where(eq(siteConfig.id, 'main')).limit(1);
  return rows[0];
}

// GET：读取网站设置
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  const row = await getSiteRow();
  return ok(row ?? null);
}

const updateSchema = z.object({
  brandNameZh: z.string().max(100).optional().nullable(),
  brandNameEn: z.string().max(100).optional().nullable(),
  sloganZh: z.string().max(200).optional().nullable(),
  sloganEn: z.string().max(200).optional().nullable(),
  brandColorPrimary: z.string().max(20).optional().nullable(),
  brandColorSecondary: z.string().max(20).optional().nullable(),
  logoUrl: z.string().max(500).optional().nullable(),
  fontFamily: z.string().max(50).optional().nullable(),
  multiLanguageEnabled: z.boolean().optional(),
  contactEmail: z.string().max(100).optional().nullable(),
  contactPhone: z.string().max(30).optional().nullable(),
  whatsapp: z.string().max(30).optional().nullable(),
  wechat: z.string().max(50).optional().nullable(),
  addressZh: z.string().max(200).optional().nullable(),
  addressEn: z.string().max(200).optional().nullable(),
  gdprEnabled: z.boolean().optional(),
  hcaptchaEnabled: z.boolean().optional(),
});

// PUT：更新网站设置（admin）
export async function PUT(req: NextRequest) {
  const auth = await requireUser(['admin']);
  if (isFail(auth)) return auth;

  const parsed = await parseBody(updateSchema, req);
  if ('error' in parsed) return parsed.error;

  const existing = await getSiteRow();
  let row;
  if (existing) {
    row = (
      await db.update(siteConfig).set({ ...parsed.data, updatedAt: new Date() }).where(eq(siteConfig.id, 'main')).returning()
    )[0];
  } else {
    // 单例不存在时初始化
    row = (await db.insert(siteConfig).values({ id: 'main', ...parsed.data, updatedAt: new Date() }).returning())[0];
  }

  await logOperation(auth, 'update', 'site_config', 'main');
  return ok(row);
}

