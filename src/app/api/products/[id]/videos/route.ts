import type { AuthUser } from '@/lib/auth';
// GET/POST /api/products/[id]/videos — 产品视频/360°（05 号文档 §六）
// 限制：MP4/MOV ≤50MB，360°图片 ≤20MB；真实上传 R2，凭据缺失时降级占位（收尾任务 3）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { products, productVideos, uploads } from '@/drizzle/schema';
import { ok, fail, parseBody, rateLimitPublic, logOperation, withAuth } from '@/lib/api-helpers';
import { uploadFile, isR2Configured, publicUrl } from '@/lib/r2';

export const runtime = 'nodejs';

type RouteContext = { params: { id: string } };

const VIDEO_MAX_BYTES = 50 * 1024 * 1024; // MP4/MOV ≤50MB
const PANORAMA_MAX_BYTES = 20 * 1024 * 1024; // 360° ≤20MB
const VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
const PANORAMA_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// GET：视频列表（公开；E1：Next 15 起 ctx.params 为 Promise）
export async function GET(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  const rows = await db
    .select()
    .from(productVideos)
    .where(eq(productVideos.productId, params.id))
    .orderBy(productVideos.sortOrder);
  return ok(rows);
}

// POST：上传视频/360°（multipart，需登录）
export const POST = withAuth(async (req: NextRequest, { params }: RouteContext, auth: AuthUser) => {

  const productRows = await db.select({ id: products.id }).from(products).where(eq(products.id, params.id)).limit(1);
  if (!productRows[0]) return fail('产品不存在', 404);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail('请求体格式错误（需要 multipart/form-data）', 400);
  }

  const type = String(form.get('type') || 'video'); // 'video' | '360'
  if (type !== 'video' && type !== '360') return fail('type 只能是 video 或 360', 400);

  const file = form.get('file');
  if (!(file instanceof File)) return fail('缺少 file 文件字段', 400);

  // 类型 + 大小白名单校验
  if (type === 'video') {
    if (!VIDEO_TYPES.includes(file.type)) return fail('视频仅支持 MP4/MOV', 400);
    if (file.size > VIDEO_MAX_BYTES) return fail('视频不能超过 50MB', 400);
  } else {
    if (!PANORAMA_TYPES.includes(file.type)) return fail('360° 仅支持 JPG/PNG/WebP', 400);
    if (file.size > PANORAMA_MAX_BYTES) return fail('360° 图片不能超过 20MB', 400);
  }

  // ★R7 修复：文件头魔数校验（file.type 可伪造，照 M4 模式）
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const startsWith = (sig: number[], offset = 0) => sig.every((b, i) => head[offset + i] === b);
  const asciiAt = (text: string, offset: number) => [...text].every((ch, i) => head[offset + i] === ch.charCodeAt(0));
  const magicOk =
    (VIDEO_TYPES.includes(file.type) && asciiAt('ftyp', 4)) || // MP4/MOV 均为 ISO BMFF 容器
    (file.type === 'image/jpeg' && startsWith([0xff, 0xd8, 0xff])) ||
    (file.type === 'image/png' && startsWith([0x89, 0x50, 0x4e, 0x47])) ||
    (file.type === 'image/webp' && asciiAt('RIFF', 0) && asciiAt('WEBP', 8));
  if (!magicOk) return fail('文件内容与声称类型不符（魔数校验未通过）', 400);

  const key = `products/${params.id}/${type}-${Date.now()}${type === 'video' ? '.mp4' : '.webp'}`;

  // 真实上传 R2；凭据未配置时降级占位 URL（收尾任务 3）
  let url: string;
  if (isR2Configured()) {
    try {
      const body = await file.arrayBuffer();
      url = await uploadFile(key, body, file.type);
    } catch {
      url = publicUrl(key);
    }
  } else {
    url = publicUrl(key);
  }

  const rows = await db
    .insert(productVideos)
    .values({
      productId: params.id,
      url,
      type,
      title: String(form.get('title') || '') || null,
      thumbnail: String(form.get('thumbnail') || '') || null,
      sortOrder: Number(form.get('sortOrder') || 0),
    })
    .returning();

  await db.insert(uploads).values({
    type: 'video',
    filename: key,
    originalName: file.name,
    url,
    mimeType: file.type,
    size: file.size,
    uploadedBy: auth.id,
  });

  await logOperation(auth, 'create', 'product_video', rows[0].id, type);
  return ok(rows[0]);
});
