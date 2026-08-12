// POST /api/upload — 通用文件上传（05 号文档 §十二，需登录）
// type: image / video / chat；白名单 + 大小校验；真实上传 R2（收尾任务 3），凭据缺失时降级占位
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { uploads } from '@/drizzle/schema';
import { ok, fail, rateLimited, requireUser, isFail } from '@/lib/api-helpers';
import { uploadFile, isR2Configured, publicUrl } from '@/lib/r2';

export const runtime = 'nodejs';

// 各类型的白名单与上限
const RULES: Record<string, { types: string[]; maxBytes: number }> = {
  image: { types: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 10 * 1024 * 1024 },
  video: { types: ['video/mp4', 'video/quicktime'], maxBytes: 50 * 1024 * 1024 },
  chat: { types: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 5 * 1024 * 1024 },
};

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (isFail(auth)) return auth;

  // 限流：10 次/分钟/IP（05 号文档限流表）
  const limited = await rateLimited(req, 'upload', 10, 60);
  if (limited) return limited;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail('请求体格式错误（需要 multipart/form-data）', 400);
  }

  const type = String(form.get('type') || 'image');
  const rule = RULES[type];
  if (!rule) return fail('type 只能是 image / video / chat', 400);

  const file = form.get('file');
  if (!(file instanceof File)) return fail('缺少 file 文件字段', 400);

  if (!rule.types.includes(file.type)) return fail('文件格式不支持', 400);
  if (file.size > rule.maxBytes) return fail('文件超过大小限制', 400);

  const ext = file.type.split('/')[1] || 'bin';
  const key = `${type}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  // 真实上传 R2；凭据未配置时降级占位 URL（保持向后兼容）
  let url: string;
  let uploadedToR2 = false;
  if (isR2Configured()) {
    try {
      const body = await file.arrayBuffer();
      url = await uploadFile(key, body, file.type);
      uploadedToR2 = true;
    } catch {
      url = publicUrl(key);
    }
  } else {
    url = publicUrl(key);
  }

  const rows = await db
    .insert(uploads)
    .values({
      type,
      filename: key,
      originalName: file.name,
      url,
      mimeType: file.type,
      size: file.size,
      uploadedBy: auth.id,
    })
    .returning();

  return ok({ id: rows[0].id, url, uploadedToR2 });
}

