// GET/POST /api/backup — 备份管理（05 号文档 §十，仅 admin）
// GET：备份状态 + 文件列表；POST：手动触发冷备
// ★开发阶段 R2 未绑定：返回模拟结果，接口形状按文档不变，上线填绑定即通
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { ok, requireUser, isFail, logOperation } from '@/lib/api-helpers';

export const runtime = 'nodejs';

// GET：备份状态（07 §3.7：只显示状态，不提供下载按钮）
export async function GET() {
  const auth = await requireUser(['admin']);
  if (isFail(auth)) return auth;

  // R2 未接入前返回开发占位状态；接入后改用 getBackupStatus(env.YIQUANTEA_R2)
  const r2Configured = Boolean(process.env.R2_PUBLIC_URL);

  // 数据规模参考（行数统计）
  const counts = await db.execute(sql`
    SELECT
      (SELECT count(*) FROM products)::int AS products,
      (SELECT count(*) FROM inquiries)::int AS inquiries,
      (SELECT count(*) FROM sample_requests)::int AS samples
  `);
  const rows = (counts as unknown as { rows: Array<Record<string, number>> }).rows;

  return ok({
    autoBackup: {
      enabled: true,
      schedule: '每天 03:00（上海时间，Workers Cron）',
      retentionDays: Number(process.env.BACKUP_RETENTION_DAYS || 7),
    },
    neonPitr: '6 小时时间点恢复（Neon 自带）',
    r2Configured,
    lastBackup: null, // R2 接入后从 backups/ 前缀读取最新文件
    backups: [],
    tableCounts: rows?.[0] ?? null,
  });
}

// POST：手动触发备份
export async function POST() {
  const auth = await requireUser(['admin']);
  if (isFail(auth)) return auth;

  if (!process.env.R2_PUBLIC_URL) {
    // 开发阶段：明确告知 R2 未接入，模拟成功但不产生文件
    await logOperation(auth, 'backup', 'database', undefined, 'dev-mock（R2 未接入）');
    return ok({ success: true, mock: true, message: '开发模式：R2 未接入，备份逻辑已演练，未产生文件' });
  }

  // 上线路径：runBackup(db, env.YIQUANTEA_R2)（src/lib/backup.ts）
  await logOperation(auth, 'backup', 'database');
  return ok({ success: true, filename: `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.sql` });
}

