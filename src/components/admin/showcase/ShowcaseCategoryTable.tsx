'use client';

// B2B 展示区分类表格（R2 拆分自 ShowcaseAdmin.tsx，纯展示 + 回调上提）
import { Pencil, Trash2, KeyRound, Link2 } from 'lucide-react';

export interface ShowcaseCat {
  id: string;
  nameZh: string;
  nameEn: string;
  slug: string;
  isActive: boolean;
  productCount?: number;
}

export function ShowcaseCategoryTable({
  cats,
  loading,
  onProducts,
  onPwd,
  onEdit,
  onDelete,
}: {
  cats: ShowcaseCat[];
  loading: boolean;
  onProducts: (cat: ShowcaseCat) => void;
  onPwd: (cat: ShowcaseCat) => void;
  onEdit: (cat: ShowcaseCat) => void;
  onDelete: (cat: ShowcaseCat) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
            <th className="px-4 py-3">分类名称</th>
            <th className="px-4 py-3">Slug</th>
            <th className="px-4 py-3">产品数</th>
            <th className="px-4 py-3">状态</th>
            <th className="px-4 py-3 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5} className="py-10 text-center text-gray-400">加载中...</td></tr>
          ) : cats.length === 0 ? (
            <tr><td colSpan={5} className="py-10 text-center text-gray-400">暂无分类</td></tr>
          ) : (
            cats.map((cat) => (
              <tr key={cat.id} className="border-b border-gray-50 last:border-b-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{cat.nameZh}</p>
                  <p className="text-xs text-gray-400">{cat.nameEn}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{cat.slug}</td>
                <td className="px-4 py-3 text-gray-600">{cat.productCount ?? 0}</td>
                <td className="px-4 py-3">
                  <span className={cat.isActive ? 'rounded bg-brand-green/10 px-2 py-0.5 text-xs text-brand-green' : 'rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-400'}>
                    {cat.isActive ? '启用' : '停用'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button type="button" aria-label="产品管理" title="产品管理" onClick={() => onProducts(cat)} className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-green">
                      <Link2 size={15} />
                    </button>
                    <button type="button" aria-label="密码管理" title="密码管理" onClick={() => onPwd(cat)} className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-green">
                      <KeyRound size={15} />
                    </button>
                    <button type="button" aria-label="编辑" onClick={() => onEdit(cat)} className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-green">
                      <Pencil size={15} />
                    </button>
                    <button type="button" aria-label="删除" onClick={() => onDelete(cat)} className="rounded p-2 text-gray-500 hover:bg-red-50 hover:text-red-600">
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
  );
}
