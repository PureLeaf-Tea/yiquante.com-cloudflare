'use client';

// 客户名单管理（CustomerAdmin.tsx，订单模块第 2 期，需求文档 §5.3）
// 列表 + 搜索 + 新增/编辑弹窗 + 删除二次确认（被订单引用时提示订单保留）
import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Save, Search } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { toastSuccess, toastError } from '@/components/ui/Toast';

interface CustomerRow {
  id: string;
  name: string;
  country: string | null;
  defaultLang: string;
  note: string | null;
  createdAt: string;
  orderCount: number;
}

const LANG_OPTIONS = [
  { value: 'zh', label: '中文（zh）' },
  { value: 'en', label: 'English（en）' },
  { value: 'ru', label: 'Русский（ru）' },
  { value: 'de', label: 'Deutsch（de）' },
  { value: 'es', label: 'Español（es）' },
  { value: 'fr', label: 'Français（fr）' },
];

const LANG_LABEL: Record<string, string> = { zh: '中文', en: 'EN', ru: 'RU', de: 'DE', es: 'ES', fr: 'FR' };

const EMPTY_FORM = { name: '', country: '', defaultLang: 'en', note: '' };

export function CustomerAdmin() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomerRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = (await res.json()) as { success?: boolean; data?: CustomerRow[] };
      if (data.success && data.data) setRows(data.data);
    } catch {
      // 加载失败保持旧数据
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (row: CustomerRow) => {
    setEditing(row);
    setForm({ name: row.name, country: row.country || '', defaultLang: row.defaultLang, note: row.note || '' });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toastError('姓名为必填');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        country: form.country.trim() || null,
        defaultLang: form.defaultLang,
        note: form.note.trim() || null,
      };
      const res = await fetch(editing ? `/api/customers/${editing.id}` : '/api/customers', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        toastError(data.error || '保存失败');
        return;
      }
      toastSuccess(editing ? '客户已更新' : '客户已创建');
      setModalOpen(false);
      await load();
    } catch {
      toastError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${deleteTarget.id}`, { method: 'DELETE' });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        toastError(data.error || '删除失败');
        return;
      }
      toastSuccess('客户已删除（历史订单保留）');
      setDeleteTarget(null);
      await load();
    } catch {
      toastError('网络错误');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">客户名单</h1>
        <Button icon={Plus} onClick={openCreate}>
          新增客户
        </Button>
      </div>

      {/* 搜索 */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="按姓名搜索"
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
        />
      </div>

      {/* 列表 */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-4 py-3">姓名</th>
              <th className="px-4 py-3">国家</th>
              <th className="px-4 py-3">默认语言</th>
              <th className="px-4 py-3">订单数</th>
              <th className="px-4 py-3">备注</th>
              <th className="px-4 py-3">创建时间</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-10 text-center text-gray-400">加载中...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-gray-400">暂无客户，点击右上角「新增客户」</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                  <td className="px-4 py-3 text-gray-600">{row.country || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-brand-green/10 px-2 py-0.5 text-xs text-brand-green">
                      {LANG_LABEL[row.defaultLang] || row.defaultLang}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.orderCount}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-xs text-gray-500" title={row.note || ''}>
                    {row.note || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(row.createdAt).toLocaleDateString('zh-CN')}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" aria-label="编辑" onClick={() => openEdit(row)} className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-green">
                        <Pencil size={15} />
                      </button>
                      <button type="button" aria-label="删除" onClick={() => setDeleteTarget(row)} className="rounded p-2 text-gray-500 hover:bg-red-50 hover:text-red-600">
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

      {/* 新增/编辑弹窗 */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? '编辑客户' : '新增客户'}
        footer={
          <Button icon={Save} loading={saving} onClick={save}>
            保存
          </Button>
        }
      >
        <div className="space-y-3">
          <Input label="姓名" required placeholder="客户姓名" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="国家" placeholder="选填，如 Colombia" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
          <Select
            label="默认语言"
            helpText="创建订单选择该客户时自动带出，可再修改"
            options={LANG_OPTIONS}
            value={form.defaultLang}
            onChange={(e) => setForm((f) => ({ ...f, defaultLang: e.target.value }))}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">备注</label>
            <textarea
              rows={3}
              placeholder="选填，仅后台可见"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none placeholder:text-gray-400 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
            />
          </div>
        </div>
      </Modal>

      {/* 删除二次确认（需求文档 §5.3：被订单引用时提示） */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="删除客户"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="danger" icon={Trash2} loading={deleting} onClick={confirmDelete}>确认删除</Button>
          </div>
        }
      >
        {deleteTarget && (
          <div className="space-y-2 text-sm text-gray-700">
            <p>确定删除客户「{deleteTarget.name}」？</p>
            {deleteTarget.orderCount > 0 && (
              <p className="rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
                该客户有 {deleteTarget.orderCount} 张订单。删除后订单保留，订单页客户位置显示「客户已删除」。
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
