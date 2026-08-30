'use client';

// 订单管理主组件（OrderAdmin.tsx，订单模块第 2 期，需求文档 §4.3/§5.2）
// 卡片墙/列表双视图 + 状态筛选 + 搜索 + 行内状态切换 + 新建/编辑/删除 + 二维码
import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, QrCode, LayoutGrid, List } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { toastSuccess, toastError } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { OrderModal } from './OrderModal';
import { OrderQrModal } from './OrderQrModal';
import { type OrderListRow, LANG_LABEL, orderPageUrl } from './ordersShared';

export function OrderAdmin() {
  const [rows, setRows] = useState<OrderListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'card' | 'list'>('card');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [qrTarget, setQrTarget] = useState<OrderListRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrderListRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = (await res.json()) as { success?: boolean; data?: OrderListRow[] };
      if (data.success && data.data) setRows(data.data);
    } catch {
      // 加载失败保持旧数据
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  // 行内状态切换（待发货 ↔ 已发货）
  const toggleStatus = async (row: OrderListRow) => {
    const next = row.status === 'pending' ? 'shipped' : 'pending';
    const res = await fetch(`/api/orders/${row.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    const data = (await res.json()) as { success?: boolean; error?: string };
    if (!res.ok || !data.success) {
      toastError(data.error || '操作失败');
      return;
    }
    toastSuccess(next === 'shipped' ? '已标记为已发货' : '已标记为待发货');
    await load();
  };

  // 删除订单（二次确认后执行）
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/orders/${deleteTarget.id}`, { method: 'DELETE' });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        toastError(data.error || '删除失败');
        return;
      }
      toastSuccess('订单已删除');
      setDeleteTarget(null);
      await load();
    } catch {
      toastError('网络错误');
    } finally {
      setDeleting(false);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs',
        status === 'shipped' ? 'bg-brand-green/10 text-brand-green' : 'bg-brand-gold/20 text-yellow-700'
      )}
    >
      {status === 'shipped' ? '已发货' : '待发货'}
    </span>
  );

  const actionButtons = (row: OrderListRow) => (
    <div className="flex gap-1">
      <button
        type="button"
        aria-label="编辑订单"
        onClick={(e) => {
          e.stopPropagation();
          setEditingId(row.id);
          setModalOpen(true);
        }}
        className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-green"
      >
        <Pencil size={15} />
      </button>
      <button
        type="button"
        aria-label="查看二维码"
        onClick={(e) => {
          e.stopPropagation();
          setQrTarget(row);
        }}
        className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-green"
      >
        <QrCode size={15} />
      </button>
      <button
        type="button"
        aria-label="删除订单"
        onClick={(e) => {
          e.stopPropagation();
          setDeleteTarget(row);
        }}
        className="rounded p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">订单管理</h1>
        <div className="flex items-center gap-2">
          {/* 视图切换 */}
          <div className="flex rounded-lg border border-gray-200 p-0.5">
            <button
              type="button"
              aria-label="卡片视图"
              onClick={() => setView('card')}
              className={cn('rounded p-1.5', view === 'card' ? 'bg-brand-green text-white' : 'text-gray-500 hover:bg-gray-100')}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              aria-label="列表视图"
              onClick={() => setView('list')}
              className={cn('rounded p-1.5', view === 'list' ? 'bg-brand-green text-white' : 'text-gray-500 hover:bg-gray-100')}
            >
              <List size={16} />
            </button>
          </div>
          <Button icon={Plus} onClick={() => { setEditingId(null); setModalOpen(true); }}>
            新建订单
          </Button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-36">
          <Select
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'pending', label: '待发货' },
              { value: 'shipped', label: '已发货' },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
        <div className="relative max-w-xs flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索客户姓名 / 订单号"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
          />
        </div>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-gray-400">加载中...</p>
      ) : rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-400">暂无订单，点击右上角「新建订单」创建第一张</p>
      ) : view === 'card' ? (
        /* 卡片墙（需求文档 §4.3）：点卡片新窗口打开客户前台订单页 */
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((row) => (
            <div
              key={row.id}
              role="button"
              tabIndex={0}
              onClick={() => window.open(orderPageUrl(row.orderNo), '_blank', 'noopener')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') window.open(orderPageUrl(row.orderNo), '_blank', 'noopener');
              }}
              className="cursor-pointer rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-800">{row.customerName || '客户已删除'}</p>
                  <p className="mt-0.5 font-mono text-xs text-gray-500">{row.orderNo}</p>
                </div>
                <StatusBadge status={row.status} />
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {row.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.thumbnail} alt="首件商品" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-300">无图</div>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  <p>{row.date}</p>
                  <p className="mt-1">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5">{LANG_LABEL[row.lang] || row.lang}</span>
                    <span className="ml-2">{row.itemCount} 件</span>
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStatus(row);
                  }}
                  className="text-xs text-gray-500 hover:text-brand-green"
                >
                  标记{row.status === 'pending' ? '已发货' : '待发货'}
                </button>
                {actionButtons(row)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 列表视图 */
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
                <th className="px-4 py-3">订单号</th>
                <th className="px-4 py-3">客户</th>
                <th className="px-4 py-3">日期</th>
                <th className="px-4 py-3">语言</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.orderNo}</td>
                  <td className="px-4 py-3 text-gray-800">{row.customerName || '客户已删除'}</td>
                  <td className="px-4 py-3 text-gray-600">{row.date}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                      {LANG_LABEL[row.lang] || row.lang}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => toggleStatus(row)} title="点击切换状态">
                      <StatusBadge status={row.status} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">{actionButtons(row)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 新建/编辑弹窗 */}
      <OrderModal open={modalOpen} onClose={() => setModalOpen(false)} orderId={editingId} onSaved={load} />

      {/* 二维码弹窗 */}
      {qrTarget && (
        <OrderQrModal open onClose={() => setQrTarget(null)} orderNo={qrTarget.orderNo} customerName={qrTarget.customerName} />
      )}

      {/* 删除二次确认 */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="删除订单"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="danger" icon={Trash2} loading={deleting} onClick={confirmDelete}>确认删除</Button>
          </div>
        }
      >
        {deleteTarget && (
          <p className="text-sm text-gray-700">
            确定删除订单 <span className="font-mono">{deleteTarget.orderNo}</span>（客户：{deleteTarget.customerName || '客户已删除'}）？
            删除后客户将无法再通过链接查看该订单。
          </p>
        )}
      </Modal>
    </div>
  );
}
