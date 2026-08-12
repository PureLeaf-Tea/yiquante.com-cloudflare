'use client';

// 操作日志（LogsAdmin.tsx）★只读
// 时间倒序 + targetType/targetId 过滤 + 分页
import { useCallback, useEffect, useState } from 'react';
import { Search, Lock } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import { cn } from '@/lib/cn';

interface LogRow {
  id: string;
  username: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  detail: string | null;
  createdAt: string;
}

const PAGE_SIZE = 25;

const ACTION_CLS: Record<string, string> = {
  create: 'bg-brand-green/10 text-brand-green',
  update: 'bg-blue-50 text-blue-600',
  delete: 'bg-red-50 text-red-500',
  login: 'bg-gray-100 text-gray-500',
  logout: 'bg-gray-100 text-gray-500',
  backup: 'bg-brand-gold/20 text-yellow-700',
};

export function LogsAdmin() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [targetType, setTargetType] = useState('');
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (targetType.trim()) params.set('targetType', targetType.trim());
      if (targetId.trim()) params.set('targetId', targetId.trim());
      const res = await fetch(`/api/logs?${params.toString()}`);
      const data = (await res.json()) as { success?: boolean; data?: LogRow[]; total?: number };
      if (data.success && data.data) {
        setRows(data.data);
        setTotal(data.total || 0);
      }
    } catch {
      // 加载失败保持旧数据
    } finally {
      setLoading(false);
    }
  }, [page, targetType, targetId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-800">
          操作日志
          <span className="flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-400">
            <Lock size={11} aria-hidden="true" />
            只读
          </span>
        </h1>
        <div className="flex gap-2">
          <input
            type="text"
            value={targetType}
            onChange={(e) => {
              setTargetType(e.target.value);
              setPage(1);
            }}
            placeholder="按类型过滤，如 product"
            aria-label="按操作类型过滤"
            className="min-h-10 w-44 rounded-btn border border-gray-300 bg-white px-3 text-sm outline-none focus:border-brand-green"
          />
          <input
            type="text"
            value={targetId}
            onChange={(e) => {
              setTargetId(e.target.value);
              setPage(1);
            }}
            placeholder="按目标 ID 过滤"
            aria-label="按目标 ID 过滤"
            className="min-h-10 w-52 rounded-btn border border-gray-300 bg-white px-3 text-sm outline-none focus:border-brand-green"
          />
        </div>
      </div>

      {/* 桌面表格 */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-100 bg-white md:block">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-4 py-3">时间</th>
              <th className="px-4 py-3">操作人</th>
              <th className="px-4 py-3">操作</th>
              <th className="px-4 py-3">对象类型</th>
              <th className="px-4 py-3">目标</th>
              <th className="px-4 py-3">摘要</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-10 text-center text-gray-400">加载中...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="py-10 text-center text-gray-400">暂无日志</td></tr>
            ) : (
              rows.map((log) => (
                <tr key={log.id} className="border-b border-gray-50 last:border-b-0">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-400">
                    {new Date(log.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{log.username || '系统'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded px-2 py-0.5 text-xs', ACTION_CLS[log.action] || 'bg-gray-100 text-gray-500')}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{log.targetType || '—'}</td>
                  <td className="max-w-40 truncate px-4 py-3 font-mono text-xs text-gray-400">{log.targetId || '—'}</td>
                  <td className="max-w-48 truncate px-4 py-3 text-xs text-gray-500">{log.detail || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 移动端卡片 */}
      <div className="space-y-2 md:hidden">
        {loading ? (
          <p className="py-10 text-center text-sm text-gray-400">加载中...</p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">暂无日志</p>
        ) : (
          rows.map((log) => (
            <div key={log.id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className={cn('rounded px-2 py-0.5 text-xs', ACTION_CLS[log.action] || 'bg-gray-100 text-gray-500')}>
                  {log.action}
                </span>
                <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString('zh-CN')}</span>
              </div>
              <p className="mt-2 text-xs text-gray-600">
                {log.username || '系统'} · {log.targetType || '—'} {log.detail ? `· ${log.detail}` : ''}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-center">
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
      <p className="flex items-center gap-1 text-xs text-gray-400">
        <Search size={12} aria-hidden="true" />
        日志只追加不删除，保留最近 1000 条；共 {total} 条
      </p>
    </div>
  );
}
