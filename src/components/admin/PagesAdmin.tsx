'use client';

// 页面内容管理（PagesAdmin.tsx）
// 五个辅助页双语标题 + 正文编辑；隐私页含 GDPR 声明提示
import { useCallback, useEffect, useState } from 'react';
import { Pencil, Save, ShieldCheck, FileText } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toastSuccess, toastError } from '@/components/ui/Toast';

interface PageContent {
  pageKey: string;
  titleZh: string;
  titleEn: string;
  contentZh: string;
  contentEn: string;
}

const PAGE_DEFS: Array<{ key: string; label: string; hint?: string }> = [
  { key: 'about', label: '关于我们' },
  { key: 'certifications', label: '认证资质' },
  { key: 'contact', label: '联系我们' },
  { key: 'privacy', label: '隐私政策', hint: '建议包含 GDPR 数据权利说明（访问/更正/删除）与 Cookie 政策' },
  { key: 'terms', label: '服务条款' },
];

export function PagesAdmin() {
  const [pages, setPages] = useState<Record<string, PageContent | null>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState({ titleZh: '', titleEn: '', contentZh: '', contentEn: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const next: Record<string, PageContent | null> = {};
    await Promise.all(
      PAGE_DEFS.map(async (def) => {
        try {
          const res = await fetch(`/api/config/page/${def.key}`);
          const data = (await res.json()) as { success?: boolean; data?: PageContent | null };
          next[def.key] = data.success ? data.data ?? null : null;
        } catch {
          next[def.key] = null;
        }
      })
    );
    setPages(next);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (key: string) => {
    const p = pages[key];
    setForm({
      titleZh: p?.titleZh || '',
      titleEn: p?.titleEn || '',
      contentZh: p?.contentZh || '',
      contentEn: p?.contentEn || '',
    });
    setEditingKey(key);
  };

  const save = async () => {
    if (!editingKey) return;
    if (!form.titleZh.trim() || !form.titleEn.trim()) {
      toastError('中英文标题为必填');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/config/page/${editingKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        toastError(data.error || '保存失败');
        return;
      }
      toastSuccess('页面内容已保存');
      setEditingKey(null);
      await load();
    } catch {
      toastError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  const editingDef = PAGE_DEFS.find((d) => d.key === editingKey);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">页面内容管理</h1>

      <div className="grid gap-3 md:grid-cols-2">
        {PAGE_DEFS.map((def) => {
          const p = pages[def.key];
          return (
            <div key={def.key} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <FileText size={15} className="text-brand-gold" aria-hidden="true" />
                  {def.label}
                </p>
                <Button size="sm" variant="outline" icon={Pencil} onClick={() => openEdit(def.key)}>
                  编辑
                </Button>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                {p ? `标题：${p.titleZh} / ${p.titleEn}` : '尚未配置内容（前台显示占位文案）'}
              </p>
              {p && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{p.contentZh}</p>}
              {def.hint && (
                <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-brand-gold/10 px-2.5 py-1.5 text-xs text-yellow-700">
                  <ShieldCheck size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {def.hint}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* 编辑弹窗 */}
      <Modal
        open={editingKey !== null}
        onClose={() => setEditingKey(null)}
        title={`编辑页面 · ${editingDef?.label || ''}`}
        widthClassName="md:max-w-2xl"
        footer={
          <Button icon={Save} loading={saving} onClick={save}>
            保存
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="标题（中文）" required value={form.titleZh} onChange={(e) => setForm((f) => ({ ...f, titleZh: e.target.value }))} placeholder="如：关于我们" />
            <Input label="标题（英文）" required value={form.titleEn} onChange={(e) => setForm((f) => ({ ...f, titleEn: e.target.value }))} placeholder="e.g. About Us" />
          </div>
          <div>
            <label htmlFor="page-content-zh" className="mb-1.5 block text-sm font-medium text-gray-700">正文（中文）</label>
            <textarea
              id="page-content-zh"
              rows={6}
              value={form.contentZh}
              onChange={(e) => setForm((f) => ({ ...f, contentZh: e.target.value }))}
              placeholder="支持多段落，空行分段"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none placeholder:text-gray-400 focus:border-brand-green"
            />
          </div>
          <div>
            <label htmlFor="page-content-en" className="mb-1.5 block text-sm font-medium text-gray-700">正文（英文）</label>
            <textarea
              id="page-content-en"
              rows={6}
              value={form.contentEn}
              onChange={(e) => setForm((f) => ({ ...f, contentEn: e.target.value }))}
              placeholder="Multiple paragraphs separated by blank lines"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none placeholder:text-gray-400 focus:border-brand-green"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
