'use client';

// 员工管理（StaffAdmin.tsx）
// 列表 + 新增/编辑弹窗（密码≥8位）+ 删除（输入用户名确认，最后一个 admin 后端保护）
import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Save } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { toastSuccess, toastError } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';

interface StaffRow {
  id: string;
  username: string;
  name: string;
  role: string;
  status: string;
  createdAt: string;
}

const ROLE_LABEL: Record<string, string> = {
  admin: '管理员',
  editor: '编辑',
  customer_service: '客服',
};

const ROLE_CLS: Record<string, string> = {
  admin: 'bg-brand-green/10 text-brand-green',
  editor: 'bg-blue-50 text-blue-600',
  customer_service: 'bg-brand-gold/20 text-yellow-700',
};

export function StaffAdmin() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [form, setForm] = useState({ username: '', name: '', password: '', role: 'editor' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/staff');
      const data = (await res.json()) as { success?: boolean; data?: StaffRow[] };
      if (data.success && data.data) setRows(data.data);
    } catch {
      // 加载失败保持旧数据
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ username: '', name: '', password: '', role: 'editor' });
    setModalOpen(true);
  };

  const openEdit = (row: StaffRow) => {
    setEditing(row);
    setForm({ username: row.username, name: row.name, password: '', role: row.role });
    setModalOpen(true);
  };

  const save = async () => {
    if (!editing) {
      // 新增：用户名/姓名/密码（≥8位）必填
      if (!form.username.trim() || !form.name.trim()) {
        toastError('用户名与姓名为必填');
        return;
      }
      if (form.password.length < 8) {
        toastError('密码至少 8 位');
        return;
      }
    } else if (form.password && form.password.length < 8) {
      toastError('重置密码至少 8 位（留空则不修改）');
      return;
    }

    setSaving(true);
    try {
      let res: Response;
      if (editing) {
        const body: Record<string, unknown> = { name: form.name, role: form.role };
        if (form.password) body.password = form.password;
        res = await fetch(`/api/staff/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        toastError(data.error || '保存失败');
        return;
      }
      toastSuccess(editing ? '员工已更新' : '员工已创建');
      setModalOpen(false);
      await load();
    } catch {
      toastError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: StaffRow) => {
    const answer = window.prompt(`确定删除员工「${row.name}」？请输入用户名 ${row.username} 确认：`);
    if (answer?.trim() !== row.username) {
      if (answer !== null) toastError('用户名输入不一致，已取消删除');
      return;
    }
    const res = await fetch(`/api/staff/${row.id}`, { method: 'DELETE' });
    const data = (await res.json()) as { success?: boolean; error?: string };
    if (!res.ok || !data.success) {
      toastError(data.error || '删除失败');
      return;
    }
    toastSuccess('员工已删除');
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">员工管理</h1>
        <Button icon={Plus} onClick={openCreate}>
          新增员工
        </Button>
      </div>

      {/* 桌面表格 */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-100 bg-white md:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-4 py-3">用户名</th>
              <th className="px-4 py-3">姓名</th>
              <th className="px-4 py-3">角色</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">最后登录</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-10 text-center text-gray-400">加载中...</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-b-0">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.username}</td>
                  <td className="px-4 py-3 text-gray-800">{row.name}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded px-2 py-0.5 text-xs', ROLE_CLS[row.role] || 'bg-gray-100')}>
                      {ROLE_LABEL[row.role] || row.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={row.status === 'active' ? 'text-brand-green' : 'text-gray-400'}>
                      {row.status === 'active' ? '启用' : '停用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">—</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" aria-label="编辑" onClick={() => openEdit(row)} className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-green">
                        <Pencil size={15} />
                      </button>
                      <button type="button" aria-label="删除" onClick={() => remove(row)} className="rounded p-2 text-gray-500 hover:bg-red-50 hover:text-red-600">
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

      {/* 移动端卡片 */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <p className="py-10 text-center text-sm text-gray-400">加载中...</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">{row.name}</span>
                <span className={cn('rounded px-2 py-0.5 text-xs', ROLE_CLS[row.role] || 'bg-gray-100')}>
                  {ROLE_LABEL[row.role] || row.role}
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-gray-400">{row.username}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" icon={Pencil} onClick={() => openEdit(row)}>编辑</Button>
                <Button size="sm" variant="danger" icon={Trash2} onClick={() => remove(row)}>删除</Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? '编辑员工' : '新增员工'}
        footer={
          <Button icon={Save} loading={saving} onClick={save}>
            保存
          </Button>
        }
      >
        <div className="space-y-3">
          <Input
            label="用户名（手机号）"
            required={!editing}
            placeholder="如 13800000000"
            value={form.username}
            disabled={!!editing}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          />
          <Input label="姓名" required placeholder="员工姓名" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input
            label={editing ? '新密码（留空不修改）' : '密码'}
            type="password"
            required={!editing}
            placeholder="至少 8 位"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <Select
            label="角色"
            options={[
              { value: 'admin', label: '管理员（全部权限）' },
              { value: 'editor', label: '编辑（内容管理）' },
              { value: 'customer_service', label: '客服（询价/聊天/样品）' },
            ]}
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          />
        </div>
      </Modal>
    </div>
  );
}
