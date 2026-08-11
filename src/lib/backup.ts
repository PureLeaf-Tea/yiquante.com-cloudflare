// 数据库备份（backup.ts）
// ★和老版的区别：老版用 pg_dump + node-cron 备份到本地磁盘；
// 新版用 Neon 自带的 PITR（时间点恢复，6 小时窗口）做即时恢复，
// 再用 Workers Cron + Drizzle 导出核心 SQL 存到 R2 做冷备兜底（保留 7 天）。
import { sql } from 'drizzle-orm';
import type { DB } from './db';

// 冷备范围：核心业务表（Neon PITR 可以恢复所有表，这里导出 SQL 是额外的异地兜底）
const BACKUP_TABLES = ['users', 'categories', 'products', 'inquiries', 'sample_requests', 'reviews'] as const;

// ★执行一次冷备：逐表查询 → 拼 INSERT 语句 → 存 R2 → 清理过期备份
export async function runBackup(
  db: DB,
  r2: R2Bucket
): Promise<{
  success: boolean;
  filename?: string;
  error?: string;
}> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sql`;

    let sqlContent = `-- YiQuanTea Database Backup\n-- Date: ${new Date().toISOString()}\n\n`;

    // 逐表导出：用参数化的原生 SQL 查询（表名来自白名单常量，无注入风险）
    for (const table of BACKUP_TABLES) {
      // sql.raw：把字符串标记为原生 SQL（表名来自上面的白名单常量，无注入风险）
      // Neon HTTP 驱动的 execute 返回 QueryResult 对象，行数据在 .rows 里
      const result = (await db.execute(sql.raw(`SELECT * FROM "${table}"`))) as unknown as {
        rows?: Record<string, unknown>[];
      };
      const rows = result.rows ?? [];
      sqlContent += `-- Table: ${table} (${rows.length} rows)\n`;
      for (const row of rows) {
        const columns = Object.keys(row);
        const values = columns.map((c) => {
          const v = row[c];
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'number' || typeof v === 'boolean') return String(v);
          // 字符串统一用单引号包裹，内部单引号转义（防 SQL 语法破坏）
          return `'${String(v).replace(/'/g, "''")}'`;
        });
        sqlContent += `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});\n`;
      }
      sqlContent += '\n';
    }

    // 存到 R2
    await r2.put(`backups/${filename}`, sqlContent, {
      httpMetadata: { contentType: 'text/plain' },
    });

    // 清理过期备份（超过 BACKUP_RETENTION_DAYS 天的）
    const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10);
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const objects = await r2.list({ prefix: 'backups/' });
    const expired = objects.objects.filter((obj) => obj.uploaded.getTime() < cutoff).map((obj) => obj.key);
    if (expired.length > 0) {
      await r2.delete(expired);
    }

    return { success: true, filename };
  } catch (error) {
    console.error('[BACKUP ERROR]', error);
    return { success: false, error: String(error) };
  }
}

// 备份状态（后台"备份管理"页调用，列出 R2 中的备份文件）
export async function getBackupStatus(r2: R2Bucket) {
  try {
    const objects = await r2.list({ prefix: 'backups/' });
    const backups = objects.objects
      .map((obj) => ({
        filename: obj.key.replace('backups/', ''),
        size: obj.size,
        uploadedAt: obj.uploaded,
      }))
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

    return { success: true, backups };
  } catch {
    return { success: false, backups: [] };
  }
}
