'use client';

// B2B 展示区管理主组件（ShowcaseAdmin.tsx，07 §3.2）
// R2 拆分：表格与三个弹窗提取为 showcase/ 子组件（纯展示 + 回调上提，状态/逻辑保留在本组件）；
// 三个弹窗为按需区块，用 next/dynamic 做代码分割（首屏只渲染表格）
import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toastSuccess, toastError } from '@/components/ui/Toast';
import { ShowcaseCategoryTable, type ShowcaseCat } from './showcase/ShowcaseCategoryTable';
import type { ShowcaseEditForm } from './showcase/ShowcaseEditModal';
import type { ShowcaseProductItem } from './showcase/ShowcaseProductsModal';

const ShowcaseEditModal = dynamic(
  () => import('./showcase/ShowcaseEditModal').then((m) => m.ShowcaseEditModal),
  { ssr: false }
);
const ShowcasePasswordModal = dynamic(
  () => import('./showcase/ShowcasePasswordModal').then((m) => m.ShowcasePasswordModal),
  { ssr: false }
);
const ShowcaseProductsModal = dynamic(
  () => import('./showcase/ShowcaseProductsModal').then((m) => m.ShowcaseProductsModal),
  { ssr: false }
);

export function ShowcaseAdmin() {
  const [cats, setCats] = useState<ShowcaseCat[]>([]);
  const [loading, setLoading] = useState(true);

  // 新增/编辑弹窗
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ShowcaseCat | null>(null);
  const [editForm, setEditForm] = useState<ShowcaseEditForm>({ nameZh: '', nameEn: '', slug: '', descriptionZh: '', descriptionEn: '', password: '' });
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

      <ShowcaseCategoryTable
        cats={cats}
        loading={loading}
        onProducts={openProducts}
        onPwd={openPwd}
        onEdit={openEdit}
        onDelete={deleteCat}
      />

      <ShowcaseEditModal
        open={editOpen}
        editing={editing}
        form={editForm}
        saving={saving}
        onField={(key, value) => setEditForm((f) => ({ ...f, [key]: value }))}
        onSave={saveEdit}
        onClose={() => setEditOpen(false)}
      />

      <ShowcasePasswordModal
        open={pwdOpen}
        cat={pwdCat}
        newPwd={newPwd}
        adminPwd={adminPwd}
        plainPwd={plainPwd}
        busy={pwdBusy}
        onNewPwd={setNewPwd}
        onAdminPwd={setAdminPwd}
        onChangePwd={changePwd}
        onViewPlain={viewPlain}
        onClose={() => setPwdOpen(false)}
      />

      <ShowcaseProductsModal
        open={prodOpen}
        cat={prodCat}
        linked={linked}
        allProducts={allProducts}
        addProductId={addProductId}
        addLocale={addLocale}
        onAddProductId={setAddProductId}
        onAddLocale={setAddLocale}
        onAdd={addProduct}
        onRemove={removeProduct}
        onClose={() => setProdOpen(false)}
      />
    </div>
  );
}
