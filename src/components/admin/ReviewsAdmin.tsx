'use client';

// 评论管理（ReviewsAdmin.tsx）
// 列表（状态筛选 + 客户端关键词搜索）+ 行内审核 + 批量操作 + 详情弹窗
import { useCallback, useEffect, useState } from 'react';
import { Check, X, Eye, Search } from 'lucide-react';
import { Star } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { toastSuccess, toastError } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';

interface ReviewRow {
  id: string;
  name: string;
  rating: number;
  content: string;
  locale: string | null;
  status: string;
  productId: string | null;
  createdAt: string;
}

const STATUS_DEFS = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待审核' },
  { value: 'published', label: '已发布' },
  { value: 'rejected', label: '已拒绝' },
];

const STATUS_LABEL: Record<string, string> = {
  pending: '待审核',
  published: '已发布',
  rejected: '已拒绝',
};

const STATUS_CLS: Record<string, string> = {
  pending: 'bg-brand-gold/20 text-yellow-700',
  published: 'bg-brand-green/10 text-brand-green',
  rejected: 'bg-red-50 text-red-500',
};

export function ReviewsAdmin() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<ReviewRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: '100' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/reviews?${params.toString()}`);
      const data = (await res.json()) as { success?: boolean; data?: ReviewRow[] };
      if (data.success && data.data) setRows(data.data);
    } catch {
      // 加载失败保持旧数据
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // 客户端关键词过滤（客户名 / 正文）
  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const kw = search.trim().toLowerCase();
    return r.name.toLowerCase().includes(kw) || r.content.toLowerCase().includes(kw);
  });

  const review = async (id: string, status: 'published' | 'rejected') => {
    const res = await fetch(`/api/reviews/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = (await res.json()) as { success?: boolean; error?: string };
    if (!res.ok || !data.success) {
      toastError(data.error || '操作失败');
      return false;
    }
    return true;
  };

  const reviewOne = async (id: string, status: 'published' | 'rejected') => {
    if (await review(id, status)) {
      toastSuccess(status === 'published' ? '已通过' : '已拒绝');
      setSelected((s) => s.filter((x) => x !== id));
      await load();
    }
  };

  // 批量审核：客户端串行 PUT（无批量端点，量小可接受）
  const batchReview = async (status: 'published' | 'rejected') => {
    if (selected.length === 0) return;
    setBusy(true);
    let okCount = 0;
    for (const id of selected) {
      if (await review(id, status)) okCount++;
    }
    setBusy(false);
    toastSuccess(`批量操作完成：${okCount}/${selected.length}`);
    setSelected([]);
    await load();
  };

  const toggleSelect = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">评论管理</h1>

      {/* 筛选 + 搜索 */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_DEFS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => {
              setStatusFilter(s.value);
              setSelected([]);
            }}
            className={cn(
              'rounded-btn px-4 py-2 text-sm transition-colors',
              statusFilter === s.value
                ? 'bg-brand-green text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:border-brand-gold'
            )}
          >
            {s.label}
          </button>
        ))}
        <div className="relative ml-auto w-56">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索客户名/内容..."
            aria-label="搜索评论"
            className="min-h-10 w-full rounded-btn border border-gray-300 bg-white pl-8 pr-3 text-sm outline-none focus:border-brand-green"
          />
        </div>
      </div>

      {/* 批量操作条 */}
      {selected.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-brand-green/5 px-4 py-2 text-sm">
          <span className="text-gray-600">已选 {selected.length} 条</span>
          <Button size="sm" icon={Check} loading={busy} onClick={() => batchReview('published')}>
            批量通过
          </Button>
          <Button size="sm" variant="danger" icon={X} loading={busy} onClick={() => batchReview('rejected')}>
            批量拒绝
          </Button>
        </div>
      )}

      {/* 桌面表格 */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-100 bg-white md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="全选"
                  checked={filtered.length > 0 && selected.length === filtered.length}
                  onChange={(e) => setSelected(e.target.checked ? filtered.map((r) => r.id) : [])}
                  className="h-4 w-4 accent-[#1a3a1a]"
                />
              </th>
              <th className="px-4 py-3">客户</th>
              <th className="px-4 py-3">评分</th>
              <th className="px-4 py-3">评价内容</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">提交时间</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-10 text-center text-gray-400">加载中...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-gray-400">暂无评论</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-b-0">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`选择 ${r.name} 的评论`}
                      checked={selected.includes(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      className="h-4 w-4 accent-[#1a3a1a]"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {r.name}
                    {r.locale && <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400">{r.locale.toUpperCase()}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={13} className={i < r.rating ? 'fill-brand-gold text-brand-gold' : 'text-gray-200'} aria-hidden="true" />
                      ))}
                    </span>
                  </td>
                  <td className="max-w-64 truncate px-4 py-3 text-gray-600">{r.content}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded px-2 py-0.5 text-xs', STATUS_CLS[r.status])}>{STATUS_LABEL[r.status] || r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(r.createdAt).toLocaleString('zh-CN')}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {r.status !== 'published' && (
                        <button type="button" title="通过" aria-label="通过" onClick={() => reviewOne(r.id, 'published')} className="rounded p-2 text-gray-500 hover:bg-brand-green/10 hover:text-brand-green">
                          <Check size={15} />
                        </button>
                      )}
                      {r.status !== 'rejected' && (
                        <button type="button" title="拒绝" aria-label="拒绝" onClick={() => reviewOne(r.id, 'rejected')} className="rounded p-2 text-gray-500 hover:bg-red-50 hover:text-red-600">
                          <X size={15} />
                        </button>
                      )}
                      <button type="button" title="详情" aria-label="详情" onClick={() => setDetail(r)} className="rounded p-2 text-gray-500 hover:bg-gray-100">
                        <Eye size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 移动端卡片 */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <p className="py-10 text-center text-sm text-gray-400">加载中...</p>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">暂无评论</p>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">{r.name}</span>
                <span className={cn('rounded px-2 py-0.5 text-xs', STATUS_CLS[r.status])}>{STATUS_LABEL[r.status] || r.status}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-gray-600">{r.content}</p>
              <div className="mt-3 flex gap-2">
                {r.status !== 'published' && (
                  <Button size="sm" icon={Check} onClick={() => reviewOne(r.id, 'published')}>通过</Button>
                )}
                {r.status !== 'rejected' && (
                  <Button size="sm" variant="danger" icon={X} onClick={() => reviewOne(r.id, 'rejected')}>拒绝</Button>
                )}
                <Button size="sm" variant="outline" icon={Eye} onClick={() => setDetail(r)}>详情</Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 详情弹窗 */}
      <Modal open={detail !== null} onClose={() => setDetail(null)} title="评论详情" widthClassName="md:max-w-lg">
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-800">{detail.name}</p>
              <span className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={15} className={i < detail.rating ? 'fill-brand-gold text-brand-gold' : 'text-gray-200'} aria-hidden="true" />
                ))}
              </span>
            </div>
            <p className="rounded-lg bg-gray-50 p-3 leading-relaxed text-gray-700">{detail.content}</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
              <p>状态：{STATUS_LABEL[detail.status] || detail.status}</p>
              <p>语言：{detail.locale?.toUpperCase() || '—'}</p>
              <p>关联产品：{detail.productId ? '已关联' : '通用评价'}</p>
              <p>提交时间:{new Date(detail.createdAt).toLocaleString('zh-CN')}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
