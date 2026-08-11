// GET/POST /api/products/[id]/videos — 产品视频/360°（05 号文档 §六）
// 限制：MP4/MOV ≤50MB，360°图片 ≤20MB（开发阶段存占位 URL，上线接 R2）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { products, productVideos, uploads } from '@/drizzle/schema';
import { ok, fail, parseBody, rateLimitPublic, requireUser, isFail, logOperation } from '@/lib/api-helpers';

export const runtime = 'nodejs';

type RouteContext = { params: { id: string } };

const VIDEO_MAX_BYTES = 50 * 1024 * 1024; // MP4/MOV ≤50MB
const PANORAMA_MAX_BYTES = 20 * 1024 * 1024; // 360° ≤20MB
const VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
const PANORAMA_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// GET：视频列表（公开）
export async function GET(req: NextRequest, { params }: RouteContext) {
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
export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser();
  if (isFail(auth)) return auth;

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

  const key = `products/${params.id}/${type}-${Date.now()}${type === 'video' ? '.mp4' : '.webp'}`;
  // ★占位 URL：R2 开通后替换为 uploadToR2() 真实地址
  const url = `${process.env.R2_PUBLIC_URL || '/files'}/${key}`;

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
}
