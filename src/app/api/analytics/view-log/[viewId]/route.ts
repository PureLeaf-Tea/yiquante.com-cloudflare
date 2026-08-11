// PATCH /api/analytics/view-log/[viewId] — 回填浏览停留时长（05 号文档 §九，公开）
// durationMs 上限 24 小时（86400000ms），防脏数据
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { productViewLogs } from '@/drizzle/schema';
import { ok, fail, parseBody, rateLimitPublic } from '@/lib/api-helpers';

export const runtime = 'nodejs';

const MAX_DURATION_MS = 24 * 60 * 60 * 1000;

export async function PATCH(req: NextRequest, { params }: { params: { viewId: string } }) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  const parsed = await parseBody(
    z.object({ durationMs: z.number().int().min(0).max(MAX_DURATION_MS) }),
    req
  );
  if ('error' in parsed) return parsed.error;

  const rows = await db
    .update(productViewLogs)
    .set({ durationMs: parsed.data.durationMs })
    .where(eq(productViewLogs.id, params.viewId))
    .returning();
  if (!rows[0]) return fail('浏览记录不存在', 404);

  return ok(null);
}
