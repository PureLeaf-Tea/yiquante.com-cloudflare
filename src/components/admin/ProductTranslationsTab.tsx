'use client';

// 产品翻译编辑标签页（ProductTranslationsTab.tsx，订单模块第 1 期）
// 六语言的 整体介绍 / 冲泡指南 / 产地 / 工艺；产地与工艺可留空（留空则详情页对应模块自动隐藏）
import { useCallback, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { toastSuccess, toastError } from '@/components/ui/Toast';

const LOCALES = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
];

interface TranslationRow {
  locale: string;
  description: string;
  brewingGuide: string;
  origin: string;
  process: string;
}

const EMPTY_ROW: Omit<TranslationRow, 'locale'> = { description: '', brewingGuide: '', origin: '', process: '' };

// 多语言文本域（样式与 Input 组件保持一致）
function TextArea({
  label,
  helpText,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  helpText?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={
          'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition-colors ' +
          'placeholder:text-gray-400 focus:border-brand-green focus:ring-1 focus:ring-brand-green'
        }
      />
      {helpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
    </div>
  );
}

export function ProductTranslationsTab({ productId }: { productId: string }) {
  // 全部语言行缓存（按 locale 索引）
  const [rowMap, setRowMap] = useState<Record<string, TranslationRow>>({});
  const [locale, setLocale] = useState('zh');
  const [form, setForm] = useState<Omit<TranslationRow, 'locale'>>(EMPTY_ROW);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 按语言从缓存回填表单
  const applyLocale = useCallback((map: Record<string, TranslationRow>, loc: string) => {
    const row = map[loc];
    setForm(row ? { description: row.description, brewingGuide: row.brewingGuide, origin: row.origin, process: row.process } : EMPTY_ROW);
  }, []);

  // 打开时拉取全部语言翻译
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/products/${productId}/translations`)
      .then((r) => r.json() as Promise<{ success?: boolean; data?: TranslationRow[] }>)
      .then((d) => {
        if (cancelled) return;
        if (d.success && d.data) {
          const map: Record<string, TranslationRow> = {};
          d.data.forEach((t) => {
            map[t.locale] = t;
          });
          setRowMap(map);
          applyLocale(map, locale);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const switchLocale = (loc: string) => {
    setLocale(loc);
    applyLocale(rowMap, loc);
  };

  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${productId}/translations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, ...form }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        toastError(data.error || '保存失败');
        return;
      }
      setRowMap((m) => ({ ...m, [locale]: { locale, ...form } }));
      toastSuccess(`「${LOCALES.find((l) => l.value === locale)?.label}」翻译已保存`);
    } catch {
      toastError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="py-8 text-center text-sm text-gray-400">加载中…</p>;

  return (
    <div className="space-y-4">
      <Select
        label="语言"
        options={LOCALES}
        value={locale}
        onChange={(e) => switchLocale(e.target.value)}
      />
      <TextArea label="整体介绍" value={form.description} onChange={set('description')} rows={5} />
      <TextArea label="冲泡指南" value={form.brewingGuide} onChange={set('brewingGuide')} rows={4} />
      <TextArea
        label="产地"
        helpText="可留空；留空则前台详情页不显示「产地」模块"
        value={form.origin}
        onChange={set('origin')}
        rows={3}
      />
      <TextArea
        label="工艺"
        helpText="可留空；留空则前台详情页不显示「工艺」模块"
        value={form.process}
        onChange={set('process')}
        rows={3}
      />
      <div className="flex justify-end">
        <Button icon={Save} loading={saving} onClick={save}>
          保存本语言
        </Button>
      </div>
    </div>
  );
}
