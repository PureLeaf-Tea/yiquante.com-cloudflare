'use client';

// 订单选品弹层（OrderProductPicker.tsx，订单模块第 2 期，需求文档 §5.2）
// 从商品图库点选商品/赠品：分类过滤 + 搜索 + 点击添加
// 数据源为后台产品接口（status=all），可选到 showOnStorefront=false 的订单专用商品
import { useCallback, useEffect, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/cn';

export interface PickerProduct {
  id: string;
  nameZh: string;
  nameEn: string;
  spec: string | null;
  categoryName: string | null;
  thumbnail: string | null;
}

export function OrderProductPicker({
  open,
  title,
  onClose,
  onPick,
  selectedIds,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  // 点击商品卡片时回调
  onPick: (p: PickerProduct) => void;
  // 已在清单中的商品 id（显示"已添加"标记）
  selectedIds: string[];
}) {
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; nameZh: string; parentId: string | null }>>([]);
  const [catFilter, setCatFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // 打开时拉取商品图库与分类
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      fetch('/api/products?status=all&pageSize=100').then(
        (r) => r.json() as Promise<{ success?: boolean; data?: PickerProduct[] }>
      ),
      fetch('/api/categories').then(
        (r) => r.json() as Promise<{ success?: boolean; data?: Array<{ id: string; nameZh: string; parentId: string | null }> }>
      ),
    ])
      .then(([p, c]) => {
        if (p.success && p.data) setProducts(p.data);
        if (c.success && c.data) setCategories(c.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useCallback(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (catFilter !== 'all' && p.categoryName !== catFilter) return false;
      if (q && !p.nameZh.toLowerCase().includes(q) && !p.nameEn.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, catFilter, search]);

  const shown = filtered();

  return (
    <Modal open={open} onClose={onClose} title={title} widthClassName="md:max-w-3xl">
      {/* 过滤栏：分类下拉 + 搜索 */}
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <Select
          options={[{ value: 'all', label: '全部分类' }, ...categories.map((c) => ({ value: c.nameZh, label: (c.parentId ? '　' : '') + c.nameZh }))]}
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
        />
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索商品名称"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
          />
        </div>
      </div>

      {/* 商品网格 */}
      {loading ? (
        <p className="py-10 text-center text-sm text-gray-400">加载中…</p>
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">没有匹配的商品</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {shown.map((p) => {
            const added = selectedIds.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick(p)}
                className={cn(
                  'relative rounded-lg border p-2 text-left transition-colors',
                  added ? 'border-brand-green bg-brand-green/5' : 'border-gray-200 hover:border-brand-green'
                )}
              >
                {added && (
                  <span className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-brand-green text-white">
                    <Check size={12} />
                  </span>
                )}
                <div className="aspect-square w-full overflow-hidden rounded bg-gray-100">
                  {p.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumbnail} alt={p.nameZh} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-300">无图</div>
                  )}
                </div>
                <p className="mt-1.5 truncate text-xs font-medium text-gray-800">{p.nameZh}</p>
                <p className="truncate text-[11px] text-gray-400">{p.nameEn}</p>
                <p className="truncate text-[11px] text-gray-400">{p.categoryName || '未分类'}</p>
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
