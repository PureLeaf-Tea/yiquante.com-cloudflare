// GET /api/backup/[filename] — 下载备份文件（05 号文档 §十，仅 admin）
// ★文件名白名单校验防目录穿越（../ 一律拒绝）；从 R2 读取真实文件（收尾任务 3）
import type { NextRequest } from 'next/server';
import { fail, withAuth } from '@/lib/api-helpers';
import { readFile, isR2Configured } from '@/lib/r2';

export const runtime = 'nodejs';

export const GET = withAuth(async (_req: NextRequest, { params }: { params: { filename: string } }) => {

  const filename = params.filename;
  // 白名单：只允许 backup-*.json 格式，拒绝任何路径分隔符与穿越字符
  if (!/^backup-[A-Za-z0-9-]+\.json$/.test(filename) || filename.includes('..') || filename.includes('/')) {
    return fail('非法文件名', 400);
  }

  if (!isR2Configured()) {
    return fail('备份存储（R2）凭据未配置，暂无可下载文件', 404);
  }

  const body = await readFile(`backups/${filename}`);
  if (!body) return fail('备份文件不存在', 404);

  return new Response(Buffer.from(body), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}, ['admin']);
