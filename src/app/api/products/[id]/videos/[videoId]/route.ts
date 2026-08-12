// PUT/DELETE /api/products/[id]/videos/[videoId]（05 号文档 §六）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { productVideos } from '@/drizzle/schema';
import { ok, fail, parseBody, requireUser, isFail, logOperation } from '@/lib/api-helpers';
import { removeFile, keyFromUrl } from '@/lib/r2';

export const runtime = 'nodejs';

type RouteContext = { params: { id: string; videoId: string } };

// PUT：编辑视频信息（标题/排序/缩略图）
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser();
  if (isFail(auth)) return auth;

  const parsed = await parseBody(
    z.object({
      title: z.string().max(200).optional().nullable(),
      thumbnail: z.string().max(500).optional().nullable(),
      sortOrder: z.number().int().optional(),
    }),
    req
  );
  if ('error' in parsed) return parsed.error;

  const rows = await db
    .update(productVideos)
    .set(parsed.data)
    .where(and(eq(productVideos.id, params.videoId), eq(productVideos.productId, params.id)))
    .returning();
  if (!rows[0]) return fail('视频不存在', 404);

  await logOperation(auth, 'update', 'product_video', params.videoId);
  return ok(rows[0]);
}

// DELETE：删除视频（同步删 R2 文件，收尾任务 3）
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser();
  if (isFail(auth)) return auth;

  const existing = await db
    .select()
    .from(productVideos)
    .where(and(eq(productVideos.id, params.videoId), eq(productVideos.productId, params.id)))
    .limit(1);
  if (!existing[0]) return fail('视频不存在', 404);

  await db.delete(productVideos).where(eq(productVideos.id, params.videoId));
  // 同步删 R2 对象（非 R2 URL 自动跳过，删除失败不阻断）
  const r2Key = keyFromUrl(existing[0].url);
  if (r2Key) {
    try {
      await removeFile(r2Key);
    } catch {
      // 忽略 R2 删除失败
    }
  }

  await logOperation(auth, 'delete', 'product_video', params.videoId);
  return ok({ id: params.videoId });
}
