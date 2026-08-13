import type { AuthUser } from '@/lib/auth';
// 产品图片管理端点（/api/products/[id]/images，阶段 14 新增）
// POST：multipart 追加产品图（登记 uploads + product_images）；DELETE：按 imageId 删除
// 复用 05 号文档的上传安全规范：仅 JPG/PNG/WebP，单张 ≤10MB
import { type NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { products, productImages, uploads } from '@/drizzle/schema';
import { ok, fail, logOperation, withAuth } from '@/lib/api-helpers';
import { uploadFile, removeFile, isR2Configured, publicUrl, keyFromUrl } from '@/lib/r2';

export const runtime = 'nodejs';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;

// POST：追加图片
export const POST = withAuth(async (req: NextRequest, { params }: { params: { id: string } }, auth: AuthUser) => {
  // M2 修复：'sales' 不在 userRoleEnum（admin/editor/customer_service）中恒不命中，改为 editor（与「编辑可管理内容」设计一致）

  const productRows = await db.select().from(products).where(eq(products.id, params.id)).limit(1);
  if (!productRows[0]) return fail('产品不存在', 404);
  const product = productRows[0];

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail('请求体格式错误（需要 multipart/form-data）', 400);
  }
  const file = form.get('image');
  if (!(file instanceof File)) return fail('缺少 image 文件字段', 400);
  if (!IMAGE_TYPES.includes(file.type)) return fail('图片格式不支持（仅 JPG/PNG/WebP）', 400);
  if (file.size > IMAGE_MAX_BYTES) return fail('图片超过 10MB', 400);

  // ★R7 修复：文件头魔数校验（file.type 可伪造，以实际字节头为准，照 M4 模式）
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const startsWith = (sig: number[], offset = 0) => sig.every((b, i) => head[offset + i] === b);
  const asciiAt = (text: string, offset: number) => [...text].every((ch, i) => head[offset + i] === ch.charCodeAt(0));
  const magicOk =
    (file.type === 'image/jpeg' && startsWith([0xff, 0xd8, 0xff])) ||
    (file.type === 'image/png' && startsWith([0x89, 0x50, 0x4e, 0x47])) ||
    (file.type === 'image/webp' && asciiAt('RIFF', 0) && asciiAt('WEBP', 8));
  if (!magicOk) return fail('文件内容与声称类型不符（魔数校验未通过）', 400);

  // 排序：追加到末尾
  const existing = await db.select().from(productImages).where(eq(productImages.productId, product.id));
  const order = existing.length;

  const key = `products/${product.id}/${Date.now()}-${order}.webp`;

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
    .insert(productImages)
    .values({ productId: product.id, url, alt: product.nameZh, sortOrder: order })
    .returning();
  await db.insert(uploads).values({
    type: 'image',
    filename: key,
    originalName: file.name,
    url,
    mimeType: file.type,
    size: file.size,
    uploadedBy: auth.id,
  });

  await logOperation(auth, 'update', 'product', product.id, `添加图片 ${file.name}`);
  return ok({ id: rows[0].id, url });
}, ['admin', 'editor']);

// DELETE：删除单张图片
export const DELETE = withAuth(async (req: NextRequest, { params }: { params: { id: string } }, auth: AuthUser) => {

  const { searchParams } = new URL(req.url);
  const imageId = searchParams.get('imageId');
  if (!imageId) return fail('缺少 imageId 参数', 400);

  const rows = await db
    .select()
    .from(productImages)
    .where(and(eq(productImages.id, imageId), eq(productImages.productId, params.id)))
    .limit(1);
  if (!rows[0]) return fail('图片不存在', 404);

  await db.delete(productImages).where(eq(productImages.id, imageId));
  // 同步删 R2 对象（非 R2 URL 自动跳过）
  const r2Key = keyFromUrl(rows[0].url);
  if (r2Key) {
    try {
      await removeFile(r2Key);
    } catch {
      // R2 删除失败不阻断数据库删除
    }
  }
  await logOperation(auth, 'delete', 'product', params.id, `删除图片 ${rows[0].url}`);
  return ok({ deleted: true });
}, ['admin']);
