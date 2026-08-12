'use client';

// 备份管理（BackupAdmin.tsx）
// 自动备份状态 + 手动备份触发 + 备份记录；★不提供下载按钮（仅状态展示）
import { useCallback, useEffect, useState } from 'react';
import { Database, Clock, HardDrive, CalendarClock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toastSuccess, toastError } from '@/components/ui/Toast';

interface BackupStatus {
  autoBackup: { enabled: boolean; schedule: string; retentionDays: number };
  neonPitr: string;
  r2Configured: boolean;
  lastBackup: { filename: string; size: number; createdAt: string } | null;
  backups: Array<{ filename: string; size: number; createdAt: string }>;
  tableCounts: { products: number; inquiries: number; samples: number } | null;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function BackupAdmin() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [backingUp, setBackingUp] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/backup');
      const data = (await res.json()) as { success?: boolean; data?: BackupStatus };
      if (data.success && data.data) setStatus(data.data);
    } catch {
      // 加载失败保持空态
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 手动备份（开发阶段 R2 未接入时返回 mock 成功）
  const manualBackup = async () => {
    setBackingUp(true);
    try {
      const res = await fetch('/api/backup', { method: 'POST' });
      const data = (await res.json()) as { success?: boolean; error?: string; data?: { mock?: boolean; message?: string; filename?: string } };
      if (!res.ok || !data.success) {
        toastError(data.error || '备份失败');
        return;
      }
      toastSuccess(data.data?.message || `备份完成：${data.data?.filename || ''}`);
      await load();
    } catch {
      toastError('网络错误');
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-800">备份管理</h1>
        <Button icon={RefreshCw} loading={backingUp} onClick={manualBackup}>
          立即备份
        </Button>
      </div>

      {/* 状态卡片 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Clock size={15} className="text-brand-gold" aria-hidden="true" />
            上次备份
          </p>
          {status?.lastBackup ? (
            <div className="text-sm text-gray-600">
              <p>{new Date(status.lastBackup.createdAt).toLocaleString('zh-CN')}</p>
              <p className="mt-1 text-xs text-gray-400">
                {status.lastBackup.filename} · {formatSize(status.lastBackup.size)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              {status ? '暂无备份记录' + (status.r2Configured ? '' : '（R2 未接入，开发模式）') : '加载中...'}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <CalendarClock size={15} className="text-brand-gold" aria-hidden="true" />
            自动备份计划
          </p>
          <p className="text-sm text-gray-600">{status?.autoBackup.schedule || '—'}</p>
          <p className="mt-1 text-xs text-gray-400">
            保留 {status?.autoBackup.retentionDays ?? '—'} 天 · {status?.autoBackup.enabled ? '已启用' : '未启用'}
          </p>
          <p className="mt-1 text-xs text-gray-400">{status?.neonPitr}</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <HardDrive size={15} className="text-brand-gold" aria-hidden="true" />
            数据规模
          </p>
          {status?.tableCounts ? (
            <div className="space-y-1 text-sm text-gray-600">
              <p>产品：{status.tableCounts.products} 条</p>
              <p>询价：{status.tableCounts.inquiries} 条</p>
              <p>样品：{status.tableCounts.samples} 条</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">加载中...</p>
          )}
        </div>
      </div>

      {/* 备份记录 */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Database size={15} className="text-brand-gold" aria-hidden="true" />
          备份记录
        </h2>
        {!status || status.backups.length === 0 ? (
          <p className="rounded-lg bg-gray-50 py-8 text-center text-sm text-gray-400">
            暂无备份文件。开发阶段 R2 未接入，手动备份为演练模式；上线接入 R2 后自动生成备份文件。
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="py-2">文件名</th>
                <th className="py-2">大小</th>
                <th className="py-2">时间</th>
              </tr>
            </thead>
            <tbody>
              {status.backups.map((b) => (
                <tr key={b.filename} className="border-b border-gray-50 last:border-b-0">
                  <td className="py-2.5 font-mono text-xs text-gray-700">{b.filename}</td>
                  <td className="py-2.5 text-gray-600">{formatSize(b.size)}</td>
                  <td className="py-2.5 text-gray-400">{new Date(b.createdAt).toLocaleString('zh-CN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
