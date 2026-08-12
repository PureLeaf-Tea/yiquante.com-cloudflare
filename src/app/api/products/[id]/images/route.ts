// 产品图片管理端点（/api/products/[id]/images，阶段 14 新增）
// POST：multipart 追加产品图（登记 uploads + product_images）；DELETE：按 imageId 删除
// 复用 05 号文档的上传安全规范：仅 JPG/PNG/WebP，单张 ≤10MB
import { type NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { products, productImages, uploads } from '@/drizzle/schema';
import { ok, fail, requireUser, isFail, logOperation } from '@/lib/api-helpers';
import { uploadFile, removeFile, isR2Configured, publicUrl, keyFromUrl } from '@/lib/r2';

export const runtime = 'nodejs';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;

// POST：追加图片
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(['admin', 'sales']);
  if (isFail(auth)) return auth;

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
}

// DELETE：删除单张图片
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(['admin']);
  if (isFail(auth)) return auth;

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
}
