'use client';

// B2B 展示区管理主组件（ShowcaseAdmin.tsx，07 §3.2）
// 分类表格 + 新增/编辑弹窗 + 密码管理（改密码/看明文二次验证）+ 产品关联管理
import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, KeyRound, Grid3X3, Eye, EyeOff, Link2, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { toastSuccess, toastError } from '@/components/ui/Toast';

interface ShowcaseCat {
  id: string;
  nameZh: string;
  nameEn: string;
  slug: string;
  isActive: boolean;
  productCount?: number;
}

interface ShowcaseProductItem {
  productId: string;
  nameZh: string;
  showcaseLocale: string;
  sortOrder: number;
}

export function ShowcaseAdmin() {
  const [cats, setCats] = useState<ShowcaseCat[]>([]);
  const [loading, setLoading] = useState(true);

  // 新增/编辑弹窗
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ShowcaseCat | null>(null);
  const [editForm, setEditForm] = useState({ nameZh: '', nameEn: '', slug: '', descriptionZh: '', descriptionEn: '', password: '' });
  const [saving, setSaving] = useState(false);

  // 密码弹窗
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdCat, setPwdCat] = useState<ShowcaseCat | null>(null);
  const [newPwd, setNewPwd] = useState('');
  const [adminPwd, setAdminPwd] = useState('');
  const [plainPwd, setPlainPwd] = useState<string | null>(null);
  const [pwdBusy, setPwdBusy] = useState(false);

  // 产品管理弹窗
  const [prodOpen, setProdOpen] = useState(false);
  const [prodCat, setProdCat] = useState<ShowcaseCat | null>(null);
  const [linked, setLinked] = useState<ShowcaseProductItem[]>([]);
  const [allProducts, setAllProducts] = useState<Array<{ id: string; nameZh: string }>>([]);
  const [addProductId, setAddProductId] = useState('');
  const [addLocale, setAddLocale] = useState('zh');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/showcase/categories');
      const data = (await res.json()) as { success?: boolean; data?: ShowcaseCat[] };
      if (data.success && data.data) setCats(data.data);
    } catch {
      // 网络错误保持旧数据
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ---------- 新增 / 编辑 ----------
  const openCreate = () => {
    setEditing(null);
    setEditForm({ nameZh: '', nameEn: '', slug: '', descriptionZh: '', descriptionEn: '', password: '' });
    setEditOpen(true);
  };
  const openEdit = (cat: ShowcaseCat) => {
    setEditing(cat);
    setEditForm({ nameZh: cat.nameZh, nameEn: cat.nameEn, slug: cat.slug, descriptionZh: '', descriptionEn: '', password: '' });
    setEditOpen(true);
  };
  const setE = (key: keyof typeof editForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditForm((f) => ({ ...f, [key]: e.target.value }));

  const saveEdit = async () => {
    if (!editForm.nameZh.trim() || !editForm.nameEn.trim()) {
      toastError('分类名称（中/英）为必填');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const body: Record<string, unknown> = {
          nameZh: editForm.nameZh,
          nameEn: editForm.nameEn,
          descriptionZh: editForm.descriptionZh || undefined,
          descriptionEn: editForm.descriptionEn || undefined,
        };
        if (editForm.password.trim()) body.newPassword = editForm.password.trim();
        const res = await fetch(`/api/showcase/categories/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || !data.success) {
          toastError(data.error || '保存失败');
          return;
        }
        toastSuccess('分类已更新');
      } else {
        if (!editForm.slug.trim() || !editForm.password.trim()) {
          toastError('新建分类需填写 slug 与初始密码');
          setSaving(false);
          return;
        }
        const res = await fetch('/api/showcase/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm),
        });
        const data = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || !data.success) {
          toastError(data.error || '创建失败');
          return;
        }
        toastSuccess('分类已创建');
      }
      setEditOpen(false);
      await load();
    } catch {
      toastError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  // ---------- 删除 ----------
  const deleteCat = async (cat: ShowcaseCat) => {
    if (!window.confirm(`确定删除分类「${cat.nameZh}」？关联的产品关系会一并删除。`)) return;
    const res = await fetch(`/api/showcase/categories/${cat.id}`, { method: 'DELETE' });
    const data = (await res.json()) as { success?: boolean; error?: string };
    if (!res.ok || !data.success) {
      toastError(data.error || '删除失败');
      return;
    }
    toastSuccess('分类已删除');
    await load();
  };

  // ---------- 密码管理 ----------
  const openPwd = (cat: ShowcaseCat) => {
    setPwdCat(cat);
    setNewPwd('');
    setAdminPwd('');
    setPlainPwd(null);
    setPwdOpen(true);
  };
  const changePwd = async () => {
    if (!pwdCat || !newPwd.trim()) return;
    setPwdBusy(true);
    try {
      const res = await fetch(`/api/showcase/categories/${pwdCat.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPwd.trim() }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        toastError(data.error || '修改失败');
        return;
      }
      toastSuccess('密码已修改');
      setNewPwd('');
      setPlainPwd(null);
    } catch {
      toastError('网络错误');
    } finally {
      setPwdBusy(false);
    }
  };
  const viewPlain = async () => {
    if (!pwdCat || !adminPwd.trim()) return;
    setPwdBusy(true);
    try {
      const res = await fetch(
        `/api/showcase/categories/${pwdCat.id}/password?adminPassword=${encodeURIComponent(adminPwd.trim())}`
      );
      const data = (await res.json()) as { success?: boolean; error?: string; data?: { password: string } };
      if (!res.ok || !data.success || !data.data) {
        toastError(data.error || '验证失败');
        return;
      }
      setPlainPwd(data.data.password);
    } catch {
      toastError('网络错误');
    } finally {
      setPwdBusy(false);
    }
  };

  // ---------- 产品管理 ----------
  const openProducts = async (cat: ShowcaseCat) => {
    setProdCat(cat);
    setLinked([]);
    setAddProductId('');
    setProdOpen(true);
    try {
      const [relRes, prodsRes] = await Promise.all([
        fetch(`/api/showcase/categories/${cat.id}/products`),
        fetch('/api/products?pageSize=100'),
      ]);
      const relData = (await relRes.json()) as { success?: boolean; data?: ShowcaseProductItem[] };
      const prodsData = (await prodsRes.json()) as { success?: boolean; data?: Array<{ id: string; nameZh: string }> };
      if (relData.success && relData.data) setLinked(relData.data);
      if (prodsData.success && prodsData.data) setAllProducts(prodsData.data);
    } catch {
      // 加载失败保持空列表
    }
  };

  const addProduct = async () => {
    if (!prodCat || !addProductId) return;
    const res = await fetch(`/api/showcase/categories/${prodCat.id}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: addProductId, showcaseLocale: addLocale }),
    });
    const data = (await res.json()) as { success?: boolean; error?: string };
    if (!res.ok || !data.success) {
      toastError(data.error || '添加失败');
      return;
    }
    toastSuccess('产品已关联');
    setAddProductId('');
    await openProducts(prodCat);
  };

  const removeProduct = async (productId: string) => {
    if (!prodCat) return;
    const res = await fetch(`/api/showcase/categories/${prodCat.id}/products`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    });
    const data = (await res.json()) as { success?: boolean; error?: string };
    if (!res.ok || !data.success) {
      toastError(data.error || '移除失败');
      return;
    }
    toastSuccess('已移除');
    await openProducts(prodCat);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-800">B2B 展示区管理</h1>
        <Button icon={Plus} onClick={openCreate}>
          新增分类
        </Button>
      </div>

      {/* 分类表格 */}
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
                      <button type="button" aria-label="产品管理" title="产品管理" onClick={() => openProducts(cat)} className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-green">
                        <Link2 size={15} />
                      </button>
                      <button type="button" aria-label="密码管理" title="密码管理" onClick={() => openPwd(cat)} className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-green">
                        <KeyRound size={15} />
                      </button>
                      <button type="button" aria-label="编辑" onClick={() => openEdit(cat)} className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-green">
                        <Pencil size={15} />
                      </button>
                      <button type="button" aria-label="删除" onClick={() => deleteCat(cat)} className="rounded p-2 text-gray-500 hover:bg-red-50 hover:text-red-600">
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

      {/* 新增/编辑弹窗 */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={editing ? '编辑分类' : '新增 B2B 分类'}
        footer={
          <Button loading={saving} onClick={saveEdit}>
            {editing ? '保存修改' : '创建分类'}
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="名称（中文）" required placeholder="如：自包装成品礼盒" value={editForm.nameZh} onChange={setE('nameZh')} />
          <Input label="名称（英文）" required placeholder="e.g. Self-Packaged Gift Boxes" value={editForm.nameEn} onChange={setE('nameEn')} />
          {!editing && (
            <div>
              <Input label="Slug" required placeholder="如：self-packaged-gift-boxes" value={editForm.slug} onChange={setE('slug')} />
              <p className="mt-1 text-xs text-gray-400">URL 标识，创建后不可修改</p>
            </div>
          )}
          <Input
            label={editing ? '新密码（留空不修改）' : '初始密码'}
            type="password"
            required={!editing}
            placeholder={editing ? '留空保持不变' : '设置初始访问密码'}
            value={editForm.password}
            onChange={setE('password')}
          />
          <Input label="描述（中文）" placeholder="选填" value={editForm.descriptionZh} onChange={setE('descriptionZh')} />
          <Input label="描述（英文）" placeholder="选填" value={editForm.descriptionEn} onChange={setE('descriptionEn')} />
        </div>
      </Modal>

      {/* 密码管理弹窗 */}
      <Modal open={pwdOpen} onClose={() => setPwdOpen(false)} title={`密码管理 · ${pwdCat?.nameZh || ''}`}>
        <div className="space-y-5">
          {/* 修改密码 */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">修改密码</p>
            <div className="flex gap-2">
              <Input type="password" placeholder="输入新密码" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
              <Button size="sm" variant="outline" loading={pwdBusy} onClick={changePwd}>
                修改
              </Button>
            </div>
          </div>
          {/* 查看明文（二次验证） */}
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-700">查看当前密码（需管理员密码二次验证）</p>
            <div className="flex gap-2">
              <Input type="password" placeholder="输入您的登录密码" value={adminPwd} onChange={(e) => setAdminPwd(e.target.value)} />
              <Button size="sm" variant="outline" icon={plainPwd ? EyeOff : Eye} loading={pwdBusy} onClick={viewPlain}>
                {plainPwd ? '隐藏' : '查看'}
              </Button>
            </div>
            {plainPwd && (
              <p className="rounded-lg bg-brand-gold/10 px-3 py-2 font-mono text-sm text-brand-green">{plainPwd}</p>
            )}
          </div>
        </div>
      </Modal>

      {/* 产品管理弹窗 */}
      <Modal open={prodOpen} onClose={() => setProdOpen(false)} title={`产品管理 · ${prodCat?.nameZh || ''}`} widthClassName="md:max-w-xl">
        <div className="space-y-4">
          {/* 添加产品 */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-52 flex-1">
              <Select
                label="选择产品"
                placeholder="选择要添加的产品"
                options={allProducts.map((p) => ({ value: p.id, label: p.nameZh }))}
                value={addProductId}
                onChange={(e) => setAddProductId(e.target.value)}
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
                onChange={(e) => setAddLocale(e.target.value)}
              />
            </div>
            <Button size="sm" icon={Plus} onClick={addProduct}>
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
                    onClick={() => removeProduct(item.productId)}
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
    </div>
  );
}
