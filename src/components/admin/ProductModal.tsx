'use client';

// 产品新增/编辑弹窗（ProductModal.tsx，07 §3.3 五标签页）
// 基本信息 / 图片 / 视频 / 布局 / 展示区设置；新建时先保存基本信息再开放其余标签页
import { useCallback, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { toastSuccess, toastError } from '@/components/ui/Toast';
import { ProductImagesTab } from './ProductImagesTab';
import { ProductVideosTab } from './ProductVideosTab';
import { ProductLayoutTab } from './ProductLayoutTab';
import { ProductShowcaseTab } from './ProductShowcaseTab';

interface CategoryOption {
  id: string;
  nameZh: string;
  parentId: string | null;
}

const TABS = [
  { key: 'basic', label: '基本信息' },
  { key: 'images', label: '图片' },
  { key: 'videos', label: '视频' },
  { key: 'layout', label: '布局' },
  { key: 'showcase', label: '展示区' },
];

export function ProductModal({
  open,
  onClose,
  productId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  productId: string | null; // null = 新建
  onSaved: () => void;
}) {
  const [tab, setTab] = useState('basic');
  const [currentId, setCurrentId] = useState<string | null>(productId);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nameZh: '',
    nameEn: '',
    categoryId: '',
    priceCNY: '0',
    priceUSD: '0',
    spec: '',
    sku: '',
    status: 'active',
  });

  // 打开时重置
  useEffect(() => {
    if (!open) return;
    setTab('basic');
    setCurrentId(productId);
    setForm({ nameZh: '', nameEn: '', categoryId: '', priceCNY: '0', priceUSD: '0', spec: '', sku: '', status: 'active' });

    // 分类选项
    fetch('/api/categories')
      .then((r) => r.json() as Promise<{ success?: boolean; data?: CategoryOption[] }>)
      .then((d) => {
        if (d.success && d.data) setCategories(d.data);
      })
      .catch(() => {});

    // 编辑：回填表单
    if (productId) {
      fetch(`/api/products/${productId}`)
        .then((r) => r.json() as Promise<{ success?: boolean; data?: Record<string, unknown> }>)
        .then((d) => {
          if (!d.success || !d.data) return;
          const p = d.data;
          setForm({
            nameZh: String(p.nameZh || ''),
            nameEn: String(p.nameEn || ''),
            categoryId: String(p.categoryId || ''),
            priceCNY: String(p.priceCNY || '0'),
            priceUSD: String(p.priceUSD || '0'),
            spec: String(p.spec || ''),
            sku: String(p.sku || ''),
            status: String(p.status || 'active'),
          });
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId]);

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const saveBasic = async () => {
    if (!form.nameZh.trim() || !form.nameEn.trim() || !form.categoryId) {
      toastError('名称（中/英）与分类为必填');
      return;
    }
    setSaving(true);
    try {
      if (currentId) {
        // 编辑：JSON PUT
        const res = await fetch(`/api/products/${currentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || !data.success) {
          toastError(data.error || '保存失败');
          return;
        }
        toastSuccess('产品已更新');
        onSaved();
      } else {
        // 新建：multipart POST（与 05 §4.3 一致）
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => {
          if (k !== 'status') fd.append(k, v);
        });
        const res = await fetch('/api/products', { method: 'POST', body: fd });
        const data = (await res.json()) as { success?: boolean; error?: string; data?: { id: string } };
        if (!res.ok || !data.success || !data.data) {
          toastError(data.error || '创建失败');
          return;
        }
        toastSuccess('产品已创建');
        setCurrentId(data.data.id); // 切换到编辑模式，开放其余标签页
        onSaved();
      }
    } catch {
      toastError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  const isNew = currentId === null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? '新增产品' : '编辑产品'}
      widthClassName="md:max-w-2xl"
      footer={
        tab === 'basic' ? (
          <Button icon={Save} loading={saving} onClick={saveBasic}>
            {isNew ? '创建产品' : '保存修改'}
          </Button>
        ) : undefined
      }
    >
      {/* 标签页导航 */}
      <div className="mb-5 flex flex-wrap gap-1 border-b border-gray-100 pb-2">
        {TABS.map((t) => {
          const disabled = isNew && t.key !== 'basic';
          return (
            <button
              key={t.key}
              type="button"
              disabled={disabled}
              onClick={() => setTab(t.key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm transition-colors',
                tab === t.key
                  ? 'bg-brand-green text-white'
                  : disabled
                    ? 'cursor-not-allowed text-gray-300'
                    : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {isNew && tab === 'basic' && (
        <p className="mb-4 rounded-lg bg-brand-gold/10 px-3 py-2 text-xs text-gray-500">
          新建产品请先保存基本信息，之后即可设置图片、视频、布局与展示区。
        </p>
      )}

      {/* 基本信息表单 */}
      {tab === 'basic' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="名称（中文）" required placeholder="如：金骏眉·特级" value={form.nameZh} onChange={set('nameZh')} />
          <Input label="名称（英文）" required placeholder="e.g. Jin Jun Mei · Special Grade" value={form.nameEn} onChange={set('nameEn')} />
          <Select
            label="所属分类"
            required
            placeholder="选择分类"
            options={categories.map((c) => ({ value: c.id, label: c.parentId ? '　' + c.nameZh : c.nameZh }))}
            value={form.categoryId}
            onChange={set('categoryId')}
          />
          <Input label="SKU" placeholder="选填" value={form.sku} onChange={set('sku')} />
          <Input label="价格（人民币）" type="number" min={0} value={form.priceCNY} onChange={set('priceCNY')} />
          <Input label="价格（美元）" type="number" min={0} value={form.priceUSD} onChange={set('priceUSD')} />
          <Input label="规格" placeholder="如：250g/罐" value={form.spec} onChange={set('spec')} />
          {!isNew && (
            <Select
              label="状态"
              options={[
                { value: 'active', label: '上架' },
                { value: 'inactive', label: '下架' },
              ]}
              value={form.status}
              onChange={set('status')}
            />
          )}
        </div>
      )}

      {/* 其余标签页（需已保存的产品 ID） */}
      {tab === 'images' && currentId && <ProductImagesTab productId={currentId} />}
      {tab === 'videos' && currentId && <ProductVideosTab productId={currentId} />}
      {tab === 'layout' && currentId && <ProductLayoutTab productId={currentId} />}
      {tab === 'showcase' && currentId && <ProductShowcaseTab productId={currentId} />}
    </Modal>
  );
}
