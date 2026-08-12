'use client';

// 样品管理（SampleAdmin.tsx）
// 筛选（全部/新申请/处理中/已发货/已关闭）+ 详情弹窗（状态流转/物流单号/时间线）
// 表格桌面展示，移动端自动转卡片
import { useCallback, useEffect, useState } from 'react';
import { Eye, Truck, History } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { toastSuccess, toastError } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';

interface SampleRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  country: string | null;
  address: string | null;
  productName: string | null;
  quantity: number;
  message: string | null;
  status: string;
  trackingNo: string | null;
  createdAt: string;
}

interface LogRow {
  id: string;
  action: string;
  detail: string | null;
  createdAt: string;
}

const STATUS_DEFS: Array<{ value: string; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'new', label: '新申请' },
  { value: 'processing', label: '处理中' },
  { value: 'shipped', label: '已发货' },
  { value: 'closed', label: '已关闭' },
];

const STATUS_LABEL: Record<string, string> = {
  new: '新申请',
  processing: '处理中',
  shipped: '已发货',
  delivered: '已签收',
  closed: '已关闭',
};

const STATUS_CLS: Record<string, string> = {
  new: 'bg-brand-gold/20 text-yellow-700',
  processing: 'bg-blue-50 text-blue-600',
  shipped: 'bg-brand-green/10 text-brand-green',
  delivered: 'bg-green-50 text-green-600',
  closed: 'bg-gray-100 text-gray-400',
};

function timeStr(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function SampleAdmin() {
  const [rows, setRows] = useState<SampleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const [detail, setDetail] = useState<SampleRow | null>(null);
  const [timeline, setTimeline] = useState<LogRow[]>([]);
  const [newStatus, setNewStatus] = useState('');
  const [trackingNo, setTrackingNo] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: '100' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/samples?${params.toString()}`);
      const data = (await res.json()) as { success?: boolean; data?: SampleRow[] };
      if (data.success && data.data) setRows(data.data);
    } catch {
      // 加载失败保持旧数据
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (row: SampleRow) => {
    setDetail(row);
    setNewStatus(row.status);
    setTrackingNo(row.trackingNo || '');
    setTimeline([]);
    // 状态变更历史：操作留痕（targetType=sample_status）
    try {
      const res = await fetch(`/api/logs?targetType=sample_status&targetId=${row.id}&pageSize=50`);
      const data = (await res.json()) as { success?: boolean; data?: LogRow[] };
      if (data.success && data.data) setTimeline(data.data);
    } catch {
      // 时间线加载失败不阻断
    }
  };

  // 保存状态流转（发货必须带物流单号，API 侧也校验）
  const saveStatus = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/samples/${detail.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus !== detail.status ? newStatus : undefined,
          trackingNo: trackingNo || null,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        toastError(data.error || '保存失败');
        return;
      }
      toastSuccess('样品状态已更新');
      setDetail(null);
      await load();
    } catch {
      toastError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">样品管理</h1>

      {/* 顶部筛选 */}
      <div className="flex flex-wrap gap-2">
        {STATUS_DEFS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setStatusFilter(s.value)}
            className={cn(
              'rounded-btn px-4 py-2 text-sm transition-colors',
              statusFilter === s.value
                ? 'bg-brand-green text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:border-brand-gold'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* 桌面表格 */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-100 bg-white md:block">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-4 py-3">申请人</th>
              <th className="px-4 py-3">样品需求</th>
              <th className="px-4 py-3">收货地址</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">申请时间</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-10 text-center text-gray-400">加载中...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="py-10 text-center text-gray-400">暂无样品申请</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-b-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{row.name}</p>
                    <p className="text-xs text-gray-400">{row.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.productName || '未指定产品'} × {row.quantity}
                  </td>
                  <td className="max-w-52 truncate px-4 py-3 text-gray-600">{row.address || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded px-2 py-0.5 text-xs', STATUS_CLS[row.status] || 'bg-gray-100')}>
                      {STATUS_LABEL[row.status] || row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{timeStr(row.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openDetail(row)}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-btn border border-gray-200 px-3 text-xs text-gray-600 hover:border-brand-gold hover:text-brand-gold"
                    >
                      <Eye size={13} aria-hidden="true" />
                      详情
                    </button>
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
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">暂无样品申请</p>
        ) : (
          rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => openDetail(row)}
              className="block w-full rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">{row.name}</span>
                <span className={cn('rounded px-2 py-0.5 text-xs', STATUS_CLS[row.status] || 'bg-gray-100')}>
                  {STATUS_LABEL[row.status] || row.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {row.productName || '未指定产品'} × {row.quantity}
              </p>
              <p className="mt-1 text-xs text-gray-400">{timeStr(row.createdAt)}</p>
            </button>
          ))
        )}
      </div>

      {/* 详情弹窗（移动端近全屏） */}
      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title="样品申请详情"
        widthClassName="md:max-w-xl"
        footer={
          <Button icon={Truck} loading={saving} onClick={saveStatus}>
            保存
          </Button>
        }
      >
        {detail && (
          <div className="space-y-5">
            {/* 申请人信息 */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">申请人信息</h3>
              <div className="grid gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600 md:grid-cols-2">
                <p>姓名：{detail.name}</p>
                <p>邮箱：{detail.email}</p>
                <p>电话：{detail.phone || '—'}</p>
                <p>公司：{detail.company || '—'}</p>
                <p>国家：{detail.country || '—'}</p>
                <p className="md:col-span-2">收货地址：{detail.address || '—'}</p>
              </div>
            </div>

            {/* 样品需求 */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">样品需求</h3>
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                <p>产品：{detail.productName || '未指定产品'} × {detail.quantity}</p>
                {detail.message && <p className="mt-1">留言：{detail.message}</p>}
              </div>
            </div>

            {/* 状态流转 */}
            <div className="grid gap-3 md:grid-cols-2">
              <Select
                label="状态流转"
                options={[
                  { value: 'new', label: '新申请' },
                  { value: 'processing', label: '处理中' },
                  { value: 'shipped', label: '已发货' },
                  { value: 'delivered', label: '已签收' },
                  { value: 'closed', label: '已关闭' },
                ]}
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
              />
              <Input
                label="物流单号"
                placeholder="发货后填写（发货必填）"
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
              />
            </div>

            {/* 状态变更历史时间线 */}
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                <History size={14} className="text-brand-gold" aria-hidden="true" />
                状态变更历史
              </h3>
              {timeline.length === 0 ? (
                <p className="rounded-lg bg-gray-50 py-4 text-center text-xs text-gray-400">暂无变更记录</p>
              ) : (
                <ol className="relative ml-2 space-y-3 border-l border-gray-200 pl-4">
                  {timeline.map((log) => (
                    <li key={log.id} className="relative">
                      <span className="absolute -left-[21.5px] top-1 h-2.5 w-2.5 rounded-full bg-brand-gold" aria-hidden="true" />
                      <p className="text-sm text-gray-700">
                        状态更新为「{STATUS_LABEL[log.detail || ''] || log.detail || '未知'}」
                      </p>
                      <p className="text-xs text-gray-400">{timeStr(log.createdAt)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
