// POST /api/upload — 通用文件上传（05 号文档 §十二，需登录）
// type: image / video / chat；白名单 + 大小校验；开发阶段返回占位 URL，上线接 R2
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { uploads } from '@/drizzle/schema';
import { ok, fail, rateLimited, requireUser, isFail } from '@/lib/api-helpers';

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
  // ★占位 URL：R2 开通后替换为 uploadToR2() 的真实地址
  const url = `${process.env.R2_PUBLIC_URL || '/files'}/${key}`;

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

  return ok({ id: rows[0].id, url });
}

