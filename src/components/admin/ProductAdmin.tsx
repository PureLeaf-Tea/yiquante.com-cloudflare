'use client';

// 后台产品管理主组件（ProductAdmin.tsx）
// 产品表格 + 搜索 + 状态筛选 + 分页 + 上下架 + 删除（输入名称确认）+ 新增/编辑弹窗
import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Pagination } from '@/components/ui/Pagination';
import { toastSuccess, toastError } from '@/components/ui/Toast';
import { ProductModal } from './ProductModal';

interface ProductRow {
  id: string;
  sku: string | null;
  nameZh: string;
  nameEn: string;
  slug: string;
  priceCNY: string;
  priceUSD: string;
  spec: string | null;
  status: string;
  categoryName: string | null;
  thumbnail: string | null;
}

const PAGE_SIZE = 25;

export function ProductAdmin() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 删除确认（08 §1.3：输入名称确认）
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [deleteName, setDeleteName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/products?${params.toString()}`);
      const data = (await res.json()) as { success?: boolean; data?: ProductRow[]; total?: number };
      if (data.success && data.data) {
        setRows(data.data);
        setTotal(data.total || 0);
      }
    } catch {
      // 网络错误保持旧数据
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async (row: ProductRow) => {
    const next = row.status === 'active' ? 'inactive' : 'active';
    const res = await fetch(`/api/products/${row.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    const data = (await res.json()) as { success?: boolean; error?: string };
    if (!res.ok || !data.success) {
      toastError(data.error || '操作失败');
      return;
    }
    toastSuccess(next === 'active' ? '已上架' : '已下架');
    await load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteName.trim() !== deleteTarget.nameZh) {
      toastError('产品名称输入不一致，无法删除');
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${deleteTarget.id}`, { method: 'DELETE' });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        toastError(data.error || '删除失败');
        return;
      }
      toastSuccess('产品已删除');
      setDeleteTarget(null);
      setDeleteName('');
      await load();
    } catch {
      toastError('网络错误');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-800">产品管理</h1>
        <Button icon={Plus} onClick={() => { setEditingId(null); setModalOpen(true); }}>
          新增产品
        </Button>
      </div>

      {/* 搜索 + 状态筛选 */}
      <div className="flex flex-wrap gap-3">
        <div className="relative w-64">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="搜索产品名称..."
            className="min-h-10 w-full rounded-btn border border-gray-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-green"
          />
        </div>
        <Select
          options={[
            { value: 'all', label: '全部状态' },
            { value: 'active', label: '上架' },
            { value: 'inactive', label: '下架' },
          ]}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        />
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-4 py-3">产品</th>
              <th className="px-4 py-3">分类</th>
              <th className="px-4 py-3">价格</th>
              <th className="px-4 py-3">规格</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-400">加载中...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-400">暂无产品</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {row.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.thumbnail} alt={row.nameZh} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-100" />
                      )}
                      <div>
                        <p className="font-medium text-gray-800">{row.nameZh}</p>
                        <p className="text-xs text-gray-400">{row.nameEn}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.categoryName || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">¥{row.priceCNY} / ${row.priceUSD}</td>
                  <td className="px-4 py-3 text-gray-600">{row.spec || '—'}</td>
                  <td className="px-4 py-3">
                    <Switch checked={row.status === 'active'} onChange={() => toggleStatus(row)} label={row.status === 'active' ? '上架' : '下架'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        aria-label="编辑"
                        onClick={() => { setEditingId(row.id); setModalOpen(true); }}
                        className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-green"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label="删除"
                        onClick={() => { setDeleteTarget(row); setDeleteName(''); }}
                        className="rounded p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center">
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      {/* 新增/编辑弹窗 */}
      <ProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        productId={editingId}
        onSaved={load}
      />

      {/* 删除确认弹窗（输入名称） */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="删除产品"
        footer={
          <Button variant="danger" loading={deleting} onClick={confirmDelete}>
            确认删除
          </Button>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            此操作不可撤销。请输入产品名称 <span className="font-bold text-red-600">{deleteTarget?.nameZh}</span> 以确认删除。
          </p>
          <Input
            label="产品名称确认"
            placeholder={deleteTarget?.nameZh || ''}
            value={deleteName}
            onChange={(e) => setDeleteName(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
