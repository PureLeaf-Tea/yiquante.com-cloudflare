// GET /api/backup/[filename] — 下载备份文件（05 号文档 §十，仅 admin）
// ★文件名白名单校验防目录穿越（../ 一律拒绝）
import type { NextRequest } from 'next/server';
import { fail, requireUser, isFail } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { filename: string } }) {
  const auth = await requireUser(['admin']);
  if (isFail(auth)) return auth;

  const filename = params.filename;
  // 白名单：只允许 backup-*.sql 格式，拒绝任何路径分隔符与穿越字符
  if (!/^backup-[A-Za-z0-9-]+\.sql$/.test(filename) || filename.includes('..') || filename.includes('/')) {
    return fail('非法文件名', 400);
  }

  // R2 未接入的开发阶段：明确返回未就绪
  if (!process.env.R2_PUBLIC_URL) {
    return fail('备份存储（R2）尚未接入，暂无可下载文件', 404);
  }

  // 上线路径：getFromR2(`backups/${filename}`, env.YIQUANTEA_R2) 后返回文件流
  return fail('备份存储（R2）尚未接入', 404);
}
