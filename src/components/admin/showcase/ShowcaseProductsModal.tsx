'use client';

// B2B 展示区产品管理弹窗（R2 拆分自 ShowcaseAdmin.tsx：关联产品增删，纯展示 + 回调）
import { Plus, Grid3X3, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { ShowcaseCat } from './ShowcaseCategoryTable';

export interface ShowcaseProductItem {
  productId: string;
  nameZh: string;
  showcaseLocale: string;
  sortOrder: number;
}

export function ShowcaseProductsModal({
  open,
  cat,
  linked,
  allProducts,
  addProductId,
  addLocale,
  onAddProductId,
  onAddLocale,
  onAdd,
  onRemove,
  onClose,
}: {
  open: boolean;
  cat: ShowcaseCat | null;
  linked: ShowcaseProductItem[];
  allProducts: Array<{ id: string; nameZh: string }>;
  addProductId: string;
  addLocale: string;
  onAddProductId: (v: string) => void;
  onAddLocale: (v: string) => void;
  onAdd: () => void;
  onRemove: (productId: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={`产品管理 · ${cat?.nameZh || ''}`} widthClassName="md:max-w-xl">
      <div className="space-y-4">
        {/* 添加产品 */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-52 flex-1">
            <Select
              label="选择产品"
              placeholder="选择要添加的产品"
              options={allProducts.map((p) => ({ value: p.id, label: p.nameZh }))}
              value={addProductId}
              onChange={(e) => onAddProductId(e.target.value)}
            />
          </div>
          <div className="w-32">
            <Select
              label="展示语言"
              options={[
                { value: 'zh', label: '中文' },
                { value: 'en', label: 'English' },
              ]}
              value={addLocale}
              onChange={(e) => onAddLocale(e.target.value)}
            />
          </div>
          <Button size="sm" icon={Plus} onClick={onAdd}>
            添加
          </Button>
        </div>

        {/* 已关联列表 */}
        {linked.length === 0 ? (
          <p className="flex items-center justify-center gap-2 rounded-lg bg-gray-50 py-8 text-sm text-gray-400">
            <Grid3X3 size={16} aria-hidden="true" />
            该分类暂无产品
          </p>
        ) : (
          <ul className="space-y-2">
            {[...linked].sort((a, b) => a.sortOrder - b.sortOrder).map((item) => (
              <li key={item.productId} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                <span className="flex-1 truncate text-sm text-gray-700">{item.nameZh}</span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{item.showcaseLocale.toUpperCase()}</span>
                <button
                  type="button"
                  aria-label="移除"
                  onClick={() => onRemove(item.productId)}
                  className="rounded p-1.5 text-gray-400 hover:text-red-600"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
