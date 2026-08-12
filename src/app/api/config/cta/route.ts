// GET/POST /api/config/cta — CTA 按钮管理（阶段 17 新增，admin）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { ctaButtons } from '@/drizzle/schema';
import { ok, parseBody, requireUser, isFail, logOperation } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireUser(['admin', 'editor']);
  if (isFail(auth)) return auth;
  const rows = await db.select().from(ctaButtons);
  return ok(rows.sort((a, b) => a.sortOrder - b.sortOrder));
}

const ctaSchema = z.object({
  textZh: z.string().min(1).max(100),
  textEn: z.string().min(1).max(100),
  linkUrl: z.string().min(1).max(500),
  variant: z.enum(['light', 'outline']).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser(['admin']);
  if (isFail(auth)) return auth;
  const parsed = await parseBody(ctaSchema, req);
  if ('error' in parsed) return parsed.error;
  const rows = await db.insert(ctaButtons).values({ ...parsed.data, updatedAt: new Date() }).returning();
  await logOperation(auth, 'create', 'cta_button', rows[0].id, parsed.data.textZh);
  return ok(rows[0]);
}
