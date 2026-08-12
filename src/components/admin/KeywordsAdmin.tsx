'use client';

// 搜索关键词管理（KeywordsAdmin.tsx）
// 列表（关键词 → 目标路径）+ 增删改
import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Save } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toastSuccess, toastError } from '@/components/ui/Toast';

interface KeywordRow {
  id: string;
  keyword: string;
  targetPath: string;
  sortOrder: number;
  isActive: boolean;
}

// 按目标路径分组展示
const PATH_LABEL: Record<string, string> = {
  '/admin/dashboard': '仪表盘',
  '/admin/products': '产品管理',
  '/admin/showcase': '展示区管理',
  '/admin/inquiries': '询价管理',
  '/admin/samples': '样品管理',
  '/admin/reviews': '评论管理',
  '/admin/homepage': '首页编辑',
  '/admin/navigation': '导航编辑',
  '/admin/social': '社交媒体',
  '/admin/pages': '页面内容',
  '/admin/staff': '员工管理',
  '/admin/analytics': '行为分析',
  '/admin/backup': '备份管理',
  '/admin/logs': '操作日志',
  '/admin/settings': '网站设置',
  '/admin/seo': 'SEO 设置',
  '/admin/guide': '操作指南',
};

export function KeywordsAdmin() {
  const [rows, setRows] = useState<KeywordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<KeywordRow | null>(null);
  const [form, setForm] = useState({ keyword: '', targetPath: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/search-keywords?pageSize=100');
      const data = (await res.json()) as { success?: boolean; data?: KeywordRow[] };
      if (data.success && data.data) setRows(data.data);
    } catch {
      // 加载失败保持旧数据
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ keyword: '', targetPath: '/admin/' });
    setModalOpen(true);
  };

  const openEdit = (row: KeywordRow) => {
    setEditing(row);
    setForm({ keyword: row.keyword, targetPath: row.targetPath });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.keyword.trim() || !form.targetPath.trim()) {
      toastError('关键词与目标路径为必填');
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/search-keywords/${editing.id}` : '/api/search-keywords';
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: form.keyword.trim(), targetPath: form.targetPath.trim() }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        toastError(data.error || '保存失败');
        return;
      }
      toastSuccess(editing ? '关键词已更新' : '关键词已创建');
      setModalOpen(false);
      await load();
    } catch {
      toastError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: KeywordRow) => {
    const answer = window.prompt(`确定删除关键词「${row.keyword}」？请输入关键词确认：`);
    if (answer?.trim() !== row.keyword) {
      if (answer !== null) toastError('输入不一致，已取消删除');
      return;
    }
    const res = await fetch(`/api/search-keywords/${row.id}`, { method: 'DELETE' });
    const data = (await res.json()) as { success?: boolean; error?: string };
    if (!res.ok || !data.success) {
      toastError(data.error || '删除失败');
      return;
    }
    toastSuccess('关键词已删除');
    await load();
  };

  // 按目标路径分组
  const grouped = new Map<string, KeywordRow[]>();
  for (const r of rows) {
    if (!grouped.has(r.targetPath)) grouped.set(r.targetPath, []);
    grouped.get(r.targetPath)!.push(r);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">搜索关键词管理</h1>
        <Button icon={Plus} onClick={openCreate}>
          新增关键词
        </Button>
      </div>
      <p className="text-xs text-gray-400">后台右上角搜索框输入关键词即跳转对应管理页；共 {rows.length} 个关键词。</p>

      {loading ? (
        <p className="rounded-xl bg-gray-50 py-10 text-center text-sm text-gray-400">加载中...</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {[...grouped.entries()].map(([path, kws]) => (
            <div key={path} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="mb-2 text-sm font-semibold text-brand-green">
                {PATH_LABEL[path] || path}
                <span className="ml-2 font-mono text-xs font-normal text-gray-400">{path}</span>
              </p>
              <ul className="space-y-1.5">
                {kws.map((kw) => (
                  <li key={kw.id} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5">
                    <span className="flex-1 text-sm text-gray-700">{kw.keyword}</span>
                    <button type="button" aria-label={`编辑 ${kw.keyword}`} onClick={() => openEdit(kw)} className="rounded p-1 text-gray-400 hover:text-brand-green">
                      <Pencil size={13} />
                    </button>
                    <button type="button" aria-label={`删除 ${kw.keyword}`} onClick={() => remove(kw)} className="rounded p-1 text-gray-400 hover:text-red-600">
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* 新增/编辑弹窗 */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? '编辑关键词' : '新增关键词'}
        footer={
          <Button icon={Save} loading={saving} onClick={save}>
            保存
          </Button>
        }
      >
        <div className="space-y-3">
          <Input label="关键词" required placeholder="如：备份、数据库备份" value={form.keyword} onChange={(e) => setForm((f) => ({ ...f, keyword: e.target.value }))} />
          <Input label="目标路径" required placeholder="/admin/backup" value={form.targetPath} onChange={(e) => setForm((f) => ({ ...f, targetPath: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
