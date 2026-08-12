'use client';

// 导航编辑（NavigationAdmin.tsx）
// 树形列表（二级缩进）+ 新增/编辑弹窗 + dnd-kit 拖拽排序 + 移动端预览开关
import { useCallback, useEffect, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Pencil, Trash2, GripVertical, Save, Smartphone, Monitor, ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { toastSuccess, toastError } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';

interface NavItem {
  id: string;
  parentId: string | null;
  labelZh: string;
  labelEn: string;
  href: string;
  openInNewTab: boolean;
  sortOrder: number;
  isActive: boolean;
}

function SortableRow({
  item,
  depth,
  onEdit,
  onDelete,
  onToggle,
}: {
  item: NavItem;
  depth: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, paddingLeft: `${12 + depth * 24}px` }}
      className={cn('flex items-center gap-2 rounded-lg border border-gray-100 bg-white py-2.5 pr-3', !item.isActive && 'opacity-50')}
    >
      <span className="cursor-grab text-gray-300 hover:text-gray-500" {...attributes} {...listeners}>
        <GripVertical size={15} aria-hidden="true" />
      </span>
      <span className="flex-1 truncate text-sm text-gray-700">
        {item.labelZh}
        <span className="ml-2 text-xs text-gray-400">{item.labelEn}</span>
      </span>
      <span className="hidden max-w-40 truncate font-mono text-xs text-gray-400 md:inline">{item.href}</span>
      {item.openInNewTab && <ExternalLink size={12} className="text-gray-300" aria-hidden="true" />}
      <Switch checked={item.isActive} onChange={onToggle} label={item.isActive ? '显示' : '隐藏'} />
      <button type="button" aria-label="编辑" onClick={onEdit} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-brand-green">
        <Pencil size={14} />
      </button>
      <button type="button" aria-label="删除" onClick={onDelete} className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export function NavigationAdmin() {
  const [items, setItems] = useState<NavItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);

  // 弹窗表单
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NavItem | null>(null);
  const [form, setForm] = useState({ labelZh: '', labelEn: '', href: '', parentId: '', openInNewTab: false, isActive: true });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/config/navigation');
      const data = (await res.json()) as { success?: boolean; data?: NavItem[] };
      if (data.success && data.data) setItems(data.data);
    } catch {
      // 加载失败保持空
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 树形拍平：一级 → 各自的二级
  const roots = items.filter((i) => !i.parentId);
  const childrenOf = (id: string) => items.filter((i) => i.parentId === id);

  // 整表保存（保留 id 维持 parentId 引用）
  const saveAll = useCallback(async (next: NavItem[], silent = false) => {
    setSaving(true);
    try {
      const res = await fetch('/api/config/navigation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: next.map((i, idx) => ({ ...i, sortOrder: idx })) }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        toastError(data.error || '保存失败');
        return;
      }
      if (!silent) toastSuccess('导航已保存');
      await load();
    } catch {
      toastError('网络错误');
    } finally {
      setSaving(false);
    }
  }, [load]);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const next = arrayMove(prev, prev.findIndex((i) => i.id === active.id), prev.findIndex((i) => i.id === over.id));
      saveAll(next, true);
      return next;
    });
  };

  const openCreate = (parentId: string | null) => {
    setEditing(null);
    setForm({ labelZh: '', labelEn: '', href: '', parentId: parentId || '', openInNewTab: false, isActive: true });
    setModalOpen(true);
  };

  const openEdit = (item: NavItem) => {
    setEditing(item);
    setForm({
      labelZh: item.labelZh,
      labelEn: item.labelEn,
      href: item.href,
      parentId: item.parentId || '',
      openInNewTab: item.openInNewTab,
      isActive: item.isActive,
    });
    setModalOpen(true);
  };

  const save = () => {
    if (!form.labelZh.trim() || !form.labelEn.trim() || !form.href.trim()) {
      toastError('名称（中/英）与链接为必填');
      return;
    }
    const base = {
      labelZh: form.labelZh.trim(),
      labelEn: form.labelEn.trim(),
      href: form.href.trim(),
      parentId: form.parentId || null,
      openInNewTab: form.openInNewTab,
      isActive: form.isActive,
    };
    if (editing) {
      setItems((prev) => {
        const next = prev.map((i) => (i.id === editing.id ? { ...i, ...base } : i));
        saveAll(next);
        return next;
      });
    } else {
      setItems((prev) => {
        const next = [...prev, { id: crypto.randomUUID(), sortOrder: prev.length, ...base }];
        saveAll(next);
        return next;
      });
    }
    setModalOpen(false);
  };

  const remove = (item: NavItem) => {
    const hasChildren = items.some((i) => i.parentId === item.id);
    const msg = hasChildren
      ? `「${item.labelZh}」包含二级菜单，删除将一并移除子项。输入名称确认：`
      : `确定删除「${item.labelZh}」？输入名称确认：`;
    const answer = window.prompt(msg);
    if (answer?.trim() !== item.labelZh) {
      if (answer !== null) toastError('名称输入不一致，已取消删除');
      return;
    }
    const next = items.filter((i) => i.id !== item.id && i.parentId !== item.id);
    setItems(next);
    saveAll(next);
  };

  const toggleActive = (item: NavItem) => {
    const next = items.map((i) => (i.id === item.id ? { ...i, isActive: !i.isActive } : i));
    setItems(next);
    saveAll(next, true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-800">导航编辑</h1>
        <div className="flex items-center gap-3">
          {/* 移动端预览开关 */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1">
            <button
              type="button"
              onClick={() => setMobilePreview(false)}
              className={cn('inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs', !mobilePreview ? 'bg-brand-green text-white' : 'text-gray-500')}
            >
              <Monitor size={13} aria-hidden="true" />
              桌面
            </button>
            <button
              type="button"
              onClick={() => setMobilePreview(true)}
              className={cn('inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs', mobilePreview ? 'bg-brand-green text-white' : 'text-gray-500')}
            >
              <Smartphone size={13} aria-hidden="true" />
              移动端
            </button>
          </div>
          <Button icon={Plus} onClick={() => openCreate(null)}>
            新增菜单
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 编辑区 */}
        <div className={cn('space-y-2', mobilePreview ? 'lg:col-span-1' : 'lg:col-span-3')}>
          {items.length === 0 ? (
            <p className="rounded-xl bg-gray-50 py-10 text-center text-sm text-gray-400">暂无导航项</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {roots.map((root) => (
                    <div key={root.id} className="space-y-2">
                      <SortableRow item={root} depth={0} onEdit={() => openEdit(root)} onDelete={() => remove(root)} onToggle={() => toggleActive(root)} />
                      {childrenOf(root.id).map((child) => (
                        <SortableRow key={child.id} item={child} depth={1} onEdit={() => openEdit(child)} onDelete={() => remove(child)} onToggle={() => toggleActive(child)} />
                      ))}
                      <button
                        type="button"
                        onClick={() => openCreate(root.id)}
                        className="ml-9 inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 hover:text-brand-green"
                      >
                        <Plus size={12} aria-hidden="true" />
                        添加二级菜单
                      </button>
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          {saving && <p className="text-xs text-gray-400">保存中...</p>}
        </div>

        {/* 移动端预览 */}
        {mobilePreview && (
          <div className="lg:col-span-2">
            <div className="mx-auto w-[375px] max-w-full rounded-2xl border-4 border-gray-800 bg-white p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between bg-brand-green px-3 py-2 text-white">
                <span className="font-serif text-sm">YiQuanTea</span>
                <span className="text-xs">☰ 菜单</span>
              </div>
              <div className="space-y-1">
                {roots.filter((r) => r.isActive).map((r) => (
                  <div key={r.id}>
                    <p className="rounded px-3 py-2 text-sm text-gray-700">{r.labelZh}</p>
                    {childrenOf(r.id).filter((c) => c.isActive).map((c) => (
                      <p key={c.id} className="rounded py-1.5 pl-8 pr-3 text-xs text-gray-500">
                        └ {c.labelZh}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? '编辑菜单项' : '新增菜单项'}
        footer={
          <Button icon={Save} onClick={save}>
            保存
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="名称（中文）" required placeholder="如：产品" value={form.labelZh} onChange={(e) => setForm((f) => ({ ...f, labelZh: e.target.value }))} />
            <Input label="名称（英文）" required placeholder="e.g. Products" value={form.labelEn} onChange={(e) => setForm((f) => ({ ...f, labelEn: e.target.value }))} />
          </div>
          <Input label="链接" required placeholder="站内路径 /products 或完整 URL" value={form.href} onChange={(e) => setForm((f) => ({ ...f, href: e.target.value }))} />
          <Select
            label="父级菜单"
            placeholder="无（一级菜单）"
            options={roots
              .filter((r) => r.id !== editing?.id)
              .map((r) => ({ value: r.id, label: r.labelZh }))}
            value={form.parentId}
            onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
          />
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={form.openInNewTab} onChange={() => setForm((f) => ({ ...f, openInNewTab: !f.openInNewTab }))} label="新标签页打开" />
              <span className="text-sm text-gray-600">新标签页打开（外链）</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onChange={() => setForm((f) => ({ ...f, isActive: !f.isActive }))} label="显示" />
              <span className="text-sm text-gray-600">显示</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
