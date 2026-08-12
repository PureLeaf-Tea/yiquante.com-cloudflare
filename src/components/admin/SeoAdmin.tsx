'use client';

// SEO 设置（SeoAdmin.tsx）
// 页面清单 + 编辑弹窗（双语 Title/Description/Keywords + hreflang 开关）
import { useCallback, useEffect, useState } from 'react';
import { Pencil, Save, Languages } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { toastSuccess, toastError } from '@/components/ui/Toast';

interface SeoRow {
  pageKey: string;
  titleZh: string | null;
  titleEn: string | null;
  descriptionZh: string | null;
  descriptionEn: string | null;
  keywords: string | null;
  hreflangEnabled: boolean;
}

const PAGE_KEYS: Array<{ key: string; label: string }> = [
  { key: 'home', label: '首页' },
  { key: 'products', label: '产品列表' },
  { key: 'product-detail', label: '产品详情' },
  { key: 'b2b', label: 'B2B 展示区' },
  { key: 'sample', label: '样品申请' },
  { key: 'about', label: '关于我们' },
  { key: 'certifications', label: '认证资质' },
  { key: 'contact', label: '联系我们' },
  { key: 'privacy', label: '隐私政策' },
  { key: 'terms', label: '服务条款' },
];

export function SeoAdmin() {
  const [rows, setRows] = useState<Record<string, SeoRow | null>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState({
    titleZh: '',
    titleEn: '',
    descriptionZh: '',
    descriptionEn: '',
    keywords: '',
    hreflangEnabled: true,
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const next: Record<string, SeoRow | null> = {};
    await Promise.all(
      PAGE_KEYS.map(async (p) => {
        try {
          const res = await fetch(`/api/config/seo/${p.key}`);
          const data = (await res.json()) as { success?: boolean; data?: SeoRow | null };
          next[p.key] = data.success ? data.data ?? null : null;
        } catch {
          next[p.key] = null;
        }
      })
    );
    setRows(next);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (key: string) => {
    const r = rows[key];
    setForm({
      titleZh: r?.titleZh || '',
      titleEn: r?.titleEn || '',
      descriptionZh: r?.descriptionZh || '',
      descriptionEn: r?.descriptionEn || '',
      keywords: r?.keywords || '',
      hreflangEnabled: r?.hreflangEnabled !== false,
    });
    setEditingKey(key);
  };

  const save = async () => {
    if (!editingKey) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/config/seo/${editingKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleZh: form.titleZh || null,
          titleEn: form.titleEn || null,
          descriptionZh: form.descriptionZh || null,
          descriptionEn: form.descriptionEn || null,
          keywords: form.keywords || null,
          hreflangEnabled: form.hreflangEnabled,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        toastError(data.error || '保存失败');
        return;
      }
      toastSuccess('SEO 配置已保存');
      setEditingKey(null);
      await load();
    } catch {
      toastError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  const editingDef = PAGE_KEYS.find((p) => p.key === editingKey);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">SEO 设置</h1>

      <div className="grid gap-3 md:grid-cols-2">
        {PAGE_KEYS.map((p) => {
          const r = rows[p.key];
          return (
            <div key={p.key} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-700">{p.label}</p>
                <p className="mt-1 truncate text-xs text-gray-400">
                  {r?.titleZh || r?.titleEn ? `Title：${r?.titleZh || r?.titleEn}` : '尚未配置（使用默认 SEO）'}
                </p>
                {r && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                    <Languages size={11} aria-hidden="true" />
                    hreflang：{r.hreflangEnabled !== false ? '已启用' : '已关闭'}
                  </p>
                )}
              </div>
              <Button size="sm" variant="outline" icon={Pencil} onClick={() => openEdit(p.key)}>
                编辑
              </Button>
            </div>
          );
        })}
      </div>

      {/* 编辑弹窗 */}
      <Modal
        open={editingKey !== null}
        onClose={() => setEditingKey(null)}
        title={`SEO 配置 · ${editingDef?.label || ''}`}
        widthClassName="md:max-w-2xl"
        footer={
          <Button icon={Save} loading={saving} onClick={save}>
            保存
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Title（中文）" placeholder="页面标题，建议 ≤60 字" value={form.titleZh} onChange={(e) => setForm((f) => ({ ...f, titleZh: e.target.value }))} />
            <Input label="Title（英文）" placeholder="Page title, ≤60 chars" value={form.titleEn} onChange={(e) => setForm((f) => ({ ...f, titleEn: e.target.value }))} />
          </div>
          <div>
            <label htmlFor="seo-desc-zh" className="mb-1.5 block text-sm font-medium text-gray-700">Description（中文）</label>
            <textarea
              id="seo-desc-zh"
              rows={2}
              value={form.descriptionZh}
              onChange={(e) => setForm((f) => ({ ...f, descriptionZh: e.target.value }))}
              placeholder="页面描述，建议 ≤150 字"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none placeholder:text-gray-400 focus:border-brand-green"
            />
          </div>
          <div>
            <label htmlFor="seo-desc-en" className="mb-1.5 block text-sm font-medium text-gray-700">Description（英文）</label>
            <textarea
              id="seo-desc-en"
              rows={2}
              value={form.descriptionEn}
              onChange={(e) => setForm((f) => ({ ...f, descriptionEn: e.target.value }))}
              placeholder="Page description, ≤150 chars"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none placeholder:text-gray-400 focus:border-brand-green"
            />
          </div>
          <Input label="Keywords（逗号分隔）" placeholder="如：金骏眉,红茶,批发" value={form.keywords} onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))} />
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3">
            <Switch checked={form.hreflangEnabled} onChange={() => setForm((f) => ({ ...f, hreflangEnabled: !f.hreflangEnabled }))} label="hreflang 开关" />
            <span className="text-sm text-gray-600">hreflang 多语言标签（告诉搜索引擎各语言版本对应关系）</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
