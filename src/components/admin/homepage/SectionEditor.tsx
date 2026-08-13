'use client';

// 单区块列表编辑器（R2 拆分自 HomepageAdmin.tsx：列表 + 编辑弹窗 + 排序/显隐/上传）
import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Upload, Save, ArrowUp, ArrowDown } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { toastSuccess, toastError } from '@/components/ui/Toast';
import type { Row, SectionDef } from './homepageSections';

export function SectionEditor({ def }: { def: SectionDef }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(def.endpoint);
      const data = (await res.json()) as { success?: boolean; data?: Row[] };
      if (data.success && data.data) setRows(data.data);
    } catch {
      // 加载失败保持空
    }
  }, [def.endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    const init: Record<string, string> = {};
    def.fields.forEach((f) => {
      init[f.name] = f.type === 'select' && f.options ? f.options[0].value : '';
    });
    setForm(init);
    setModalOpen(true);
  };

  const openEdit = (row: Row) => {
    setEditing(row);
    const init: Record<string, string> = {};
    def.fields.forEach((f) => {
      init[f.name] = row[f.name] == null ? '' : String(row[f.name]);
    });
    setForm(init);
    setModalOpen(true);
  };

  // 图片上传（/api/upload → R2/占位 URL）
  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !def.imageField) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = (await res.json()) as { success?: boolean; error?: string; data?: { url: string } };
      if (!res.ok || !data.success || !data.data) {
        toastError(data.error || '上传失败');
        return;
      }
      setForm((f) => ({ ...f, [def.imageField as string]: data.data!.url }));
      toastSuccess('图片已上传');
    } catch {
      toastError('网络错误');
    }
  };

  const save = async () => {
    // 必填校验
    for (const f of def.fields) {
      if (f.required && !form[f.name]?.trim()) {
        toastError(`请填写「${f.label}」`);
        return;
      }
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { ...form };
      // 空链接字段转 null
      ['linkUrl'].forEach((k) => {
        if (k in body && !String(body[k]).trim()) body[k] = null;
      });
      const url = editing ? `${def.endpoint}/${editing.id}` : def.endpoint;
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        toastError(data.error || '保存失败');
        return;
      }
      toastSuccess(editing ? '已更新' : '已创建');
      setModalOpen(false);
      await load();
    } catch {
      toastError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Row) => {
    const name = def.summary(row);
    if (!window.confirm(`确定删除「${name || '该项'}」？此操作不可撤销。`)) return;
    const res = await fetch(`${def.endpoint}/${row.id}`, { method: 'DELETE' });
    const data = (await res.json()) as { success?: boolean; error?: string };
    if (!res.ok || !data.success) {
      toastError(data.error || '删除失败');
      return;
    }
    toastSuccess('已删除');
    await load();
  };

  // 排序：交换 sortOrder 后逐项 PUT
  const move = async (index: number, dir: -1 | 1) => {
    const next = [...rows];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
    // 落库：按新顺序更新 sortOrder
    for (let i = 0; i < next.length; i++) {
      if (next[i].sortOrder !== i) {
        await fetch(`${def.endpoint}/${next[i].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: i }),
        });
      }
    }
    await load();
  };

  const toggleActive = async (row: Row) => {
    await fetch(`${def.endpoint}/${row.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !row.isActive }),
    });
    await load();
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">{def.title}</h2>
        <Button size="sm" icon={Plus} onClick={openCreate}>
          新增
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg bg-gray-50 py-6 text-center text-sm text-gray-400">暂无数据</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, i) => (
            <li key={row.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
              <div className="flex flex-col gap-0.5">
                <button type="button" aria-label="上移" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-0.5 text-gray-400 hover:text-brand-green disabled:opacity-30">
                  <ArrowUp size={13} />
                </button>
                <button type="button" aria-label="下移" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="rounded p-0.5 text-gray-400 hover:text-brand-green disabled:opacity-30">
                  <ArrowDown size={13} />
                </button>
              </div>
              {def.imageField && row[def.imageField] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={String(row[def.imageField])} alt="" className="h-10 w-14 shrink-0 rounded object-cover" />
              ) : null}
              <span className="flex-1 truncate text-sm text-gray-700">{def.summary(row) || '（未命名）'}</span>
              <Switch checked={row.isActive} onChange={() => toggleActive(row)} label={row.isActive ? '显示中' : '已隐藏'} />
              <button type="button" aria-label="编辑" onClick={() => openEdit(row)} className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-green">
                <Pencil size={14} />
              </button>
              <button type="button" aria-label="删除" onClick={() => remove(row)} className="rounded p-2 text-gray-500 hover:bg-red-50 hover:text-red-600">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 编辑弹窗 */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${editing ? '编辑' : '新增'} · ${def.title}`}
        widthClassName="md:max-w-lg"
        footer={
          <Button icon={Save} loading={saving} onClick={save}>
            保存
          </Button>
        }
      >
        <div className="space-y-3">
          {def.imageField && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700">图片</p>
              <div className="flex items-center gap-3">
                {form[def.imageField] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form[def.imageField]} alt="预览" className="h-14 w-20 rounded object-cover" />
                ) : (
                  <div className="flex h-14 w-20 items-center justify-center rounded bg-gray-100 text-xs text-gray-400">无图</div>
                )}
                <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-btn border border-dashed border-gray-300 px-4 text-sm text-gray-500 hover:border-brand-gold hover:text-brand-gold">
                  <Upload size={14} aria-hidden="true" />
                  上传图片
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadImage} />
                </label>
              </div>
            </div>
          )}
          {def.fields.map((f) =>
            f.type === 'select' ? (
              <Select key={f.name} label={f.label} options={f.options || []} value={form[f.name] || ''} onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))} />
            ) : (
              <Input key={f.name} label={f.label} required={f.required} placeholder={`请输入${f.label.replace(/（.*）/, '')}`} value={form[f.name] || ''} onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))} />
            )
          )}
        </div>
      </Modal>
    </div>
  );
}
