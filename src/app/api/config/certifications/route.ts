// GET/POST /api/config/certifications — 认证展示管理（阶段 17 新增，admin）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { certifications } from '@/drizzle/schema';
import { ok, parseBody, requireUser, isFail, logOperation } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireUser(['admin', 'editor']);
  if (isFail(auth)) return auth;
  const rows = await db.select().from(certifications);
  return ok(rows.sort((a, b) => a.sortOrder - b.sortOrder));
}

const certSchema = z.object({
  nameZh: z.string().min(1).max(100),
  nameEn: z.string().min(1).max(100),
  imageUrl: z.string().max(500).optional().nullable(),
  linkUrl: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser(['admin']);
  if (isFail(auth)) return auth;
  const parsed = await parseBody(certSchema, req);
  if ('error' in parsed) return parsed.error;
  const rows = await db.insert(certifications).values({ ...parsed.data, updatedAt: new Date() }).returning();
  await logOperation(auth, 'create', 'certification', rows[0].id, parsed.data.nameZh);
  return ok(rows[0]);
}
