'use client';

// 产品展示区设置标签页（ProductShowcaseTab.tsx）
// B2B 分类多选关联 + showcaseLocale + 价格显隐（PUT /api/products）
import { useCallback, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { toastSuccess, toastError } from '@/components/ui/Toast';

interface ShowcaseCat {
  id: string;
  nameZh: string;
  nameEn: string;
}

export function ProductShowcaseTab({ productId }: { productId: string }) {
  const [cats, setCats] = useState<ShowcaseCat[]>([]);
  const [checked, setChecked] = useState<string[]>([]); // 已关联分类 id
  const [showcaseLocale, setShowcaseLocale] = useState('zh');
  const [showPrice, setShowPrice] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      // 全部展示区分类
      const catsRes = await fetch('/api/showcase/categories');
      const catsData = (await catsRes.json()) as { success?: boolean; data?: ShowcaseCat[] };
      if (catsData.success && catsData.data) setCats(catsData.data);

      // 产品当前关联 + 价格显隐
      const pRes = await fetch(`/api/products/${productId}`);
      const pData = (await pRes.json()) as {
        success?: boolean;
        data?: { showcaseCategories?: Array<{ id: string }>; showPriceInShowcase?: boolean };
      };
      if (pData.success && pData.data) {
        setChecked((pData.data.showcaseCategories || []).map((c) => c.id));
        setShowPrice(pData.data.showPriceInShowcase !== false);
      }
    } catch {
      // 加载失败保持初始状态
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleCat = (id: string) => {
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const save = async () => {
    setSaving(true);
    try {
      // 1. 价格显隐（产品字段）
      const pRes = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showPriceInShowcase: showPrice }),
      });
      const pData = (await pRes.json()) as { success?: boolean; error?: string };
      if (!pRes.ok || !pData.success) {
        toastError(pData.error || '保存失败');
        return;
      }

      // 2. 分类关联：勾选的加入、取消的移除（逐个分类调用关联端点）
      const original = new Set<string>();
      const curRes = await fetch(`/api/products/${productId}`);
      const curData = (await curRes.json()) as { success?: boolean; data?: { showcaseCategories?: Array<{ id: string }> } };
      if (curData.success && curData.data) {
        (curData.data.showcaseCategories || []).forEach((c) => original.add(c.id));
      }
      const target = new Set(checked);

      for (const catId of target) {
        if (original.has(catId)) continue;
        await fetch(`/api/showcase/categories/${catId}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, showcaseLocale }),
        });
      }
      for (const catId of original) {
        if (target.has(catId)) continue;
        await fetch(`/api/showcase/categories/${catId}/products`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: productId }),
        });
      }

      toastSuccess('展示区设置已保存');
      await load();
    } catch {
      toastError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 分类多选 */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">关联 B2B 分类</p>
        {cats.length === 0 ? (
          <p className="rounded-lg bg-gray-50 py-4 text-center text-sm text-gray-400">暂无 B2B 分类（请先在展示区管理创建）</p>
        ) : (
          <div className="space-y-2">
            {cats.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={checked.includes(c.id)}
                  onChange={() => toggleCat(c.id)}
                  className="h-4 w-4 accent-[#1a3a1a]"
                />
                <span className="text-sm text-gray-700">
                  {c.nameZh} <span className="text-xs text-gray-400">{c.nameEn}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <Select
          label="展示语言"
          options={[
            { value: 'zh', label: '中文' },
            { value: 'en', label: 'English' },
          ]}
          value={showcaseLocale}
          onChange={(e) => setShowcaseLocale(e.target.value)}
        />
        <p className="mt-1 text-xs text-gray-400">关联到 B2B 分类时使用的展示语言</p>
      </div>

      <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
        <Switch checked={showPrice} onChange={() => setShowPrice((v) => !v)} label="展示区显示价格" />
        <span className="text-xs text-gray-400">关闭后 B2B 客户看不到该产品的价格</span>
      </div>

      <Button size="sm" icon={Save} loading={saving} onClick={save}>
        保存展示区设置
      </Button>
    </div>
  );
}
