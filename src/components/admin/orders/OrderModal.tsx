'use client';

// 订单新建/编辑弹窗（OrderModal.tsx，订单模块第 2 期，需求文档 §5.2）
// 选客户自动带默认语言；图库点选商品/赠品填数量；订单号留空自动生成；祝福语预填默认文案
import { useEffect, useState } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { toastSuccess, toastError } from '@/components/ui/Toast';
import { OrderProductPicker, type PickerProduct } from './OrderProductPicker';
import {
  type OrderItemForm,
  type CustomerOption,
  LANG_OPTIONS,
  DEFAULT_BLESSING_CN,
  DEFAULT_BLESSING_FOREIGN,
} from './ordersShared';

// 今天（本地时区）的 YYYY-MM-DD
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function emptyForm() {
  return {
    customerId: '',
    orderNo: '',
    date: todayStr(),
    status: 'pending',
    lang: 'en',
    theme: 'brand',
    blessingForeign: DEFAULT_BLESSING_FOREIGN,
    blessingCn: DEFAULT_BLESSING_CN,
    note: '',
  };
}

export function OrderModal({
  open,
  onClose,
  orderId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string | null; // null = 新建
  onSaved: () => void;
}) {
  const [form, setForm] = useState(emptyForm());
  const [items, setItems] = useState<OrderItemForm[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  // 选品弹层：'item' | 'gift' | null
  const [pickerType, setPickerType] = useState<'item' | 'gift' | null>(null);
  // 编辑时遇到的已删除商品件数（提示用）
  const [droppedItems, setDroppedItems] = useState(0);

  const isNew = orderId === null;

  // 打开时加载客户列表 + 编辑回填
  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setItems([]);
    setDroppedItems(0);

    fetch('/api/customers')
      .then((r) => r.json() as Promise<{ success?: boolean; data?: CustomerOption[] }>)
      .then((d) => {
        if (d.success && d.data) setCustomers(d.data);
      })
      .catch(() => {});

    if (orderId) {
      setLoading(true);
      fetch(`/api/orders/${orderId}`)
        .then((r) => r.json() as Promise<{ success?: boolean; data?: Record<string, unknown> }>)
        .then((d) => {
          if (!d.success || !d.data) return;
          const o = d.data;
          setForm({
            customerId: String(o.customerId || ''),
            orderNo: String(o.orderNo || ''),
            date: String(o.date || todayStr()),
            status: String(o.status || 'pending'),
            lang: String(o.lang || 'en'),
            theme: String(o.theme || 'brand'),
            blessingForeign: String(o.blessingForeign || ''),
            blessingCn: String(o.blessingCn || ''),
            note: String(o.note || ''),
          });
          // 明细：商品已删除的行（productId 为 null）无法再保存，剔除并提示
          const rawItems = (o.items || []) as Array<Record<string, unknown>>;
          const kept: OrderItemForm[] = [];
          let dropped = 0;
          for (const it of rawItems) {
            if (!it.productId) {
              dropped++;
              continue;
            }
            kept.push({
              productId: String(it.productId),
              type: it.type === 'gift' ? 'gift' : 'item',
              qty: Number(it.qty) || 1,
              nameZh: String(it.nameZh || '商品已下架'),
              nameEn: String(it.nameEn || ''),
              spec: it.spec ? String(it.spec) : null,
              thumbnail: it.thumbnail ? String(it.thumbnail) : null,
            });
          }
          setItems(kept);
          setDroppedItems(dropped);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId]);

  const set = (key: keyof ReturnType<typeof emptyForm>) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // 选客户：自动带出默认语言（可改）
  const onCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setForm((f) => {
      const next = { ...f, customerId: id };
      const c = customers.find((x) => x.id === id);
      if (c) next.lang = c.defaultLang;
      return next;
    });
  };

  // 选品回调：已存在则跳过
  const onPick = (type: 'item' | 'gift') => (p: PickerProduct) => {
    setItems((list) => {
      if (list.some((it) => it.productId === p.id && it.type === type)) return list;
      return [
        ...list,
        { productId: p.id, type, qty: 1, nameZh: p.nameZh, nameEn: p.nameEn, spec: p.spec, thumbnail: p.thumbnail },
      ];
    });
  };

  const setQty = (productId: string, type: 'item' | 'gift', qty: number) => {
    setItems((list) => list.map((it) => (it.productId === productId && it.type === type ? { ...it, qty: Math.max(1, Math.min(999, qty || 1)) } : it)));
  };

  const removeItem = (productId: string, type: 'item' | 'gift') => {
    setItems((list) => list.filter((it) => !(it.productId === productId && it.type === type)));
  };

  const save = async () => {
    if (items.length === 0) {
      toastError('请至少添加一件商品或赠品');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      toastError('日期格式须为 YYYY-MM-DD');
      return;
    }
    setSaving(true);
    try {
      const body = {
        customerId: form.customerId || null,
        orderNo: form.orderNo.trim() || null,
        date: form.date,
        status: form.status,
        lang: form.lang,
        theme: form.theme,
        blessingForeign: form.blessingForeign.trim() || null,
        blessingCn: form.blessingCn.trim() || null,
        note: form.note.trim() || null,
        items: items.map((it) => ({ productId: it.productId, type: it.type, qty: it.qty })),
      };
      const res = await fetch(isNew ? '/api/orders' : `/api/orders/${orderId}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { success?: boolean; error?: string; data?: { orderNo?: string } };
      if (!res.ok || !data.success) {
        toastError(data.error || '保存失败');
        return;
      }
      toastSuccess(isNew ? `订单已创建${data.data?.orderNo ? '：' + data.data.orderNo : ''}` : '订单已更新');
      onClose();
      onSaved();
    } catch {
      toastError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  // 明细清单渲染（商品/赠品各一份）
  const renderList = (type: 'item' | 'gift') => {
    const list = items.filter((it) => it.type === type);
    return (
      <div className="rounded-lg border border-gray-200 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">
            {type === 'item' ? '您购买的商品' : '您的赠品'}（{list.length}）
          </p>
          <Button size="sm" variant="outline" icon={Plus} onClick={() => setPickerType(type)}>
            从图库添加
          </Button>
        </div>
        {list.length === 0 ? (
          <p className="py-3 text-center text-xs text-gray-400">未添加，点击「从图库添加」</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {list.map((it) => (
              <li key={`${it.type}-${it.productId}`} className="flex items-center gap-3 py-2">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded bg-gray-100">
                  {it.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.thumbnail} alt={it.nameZh} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-800">{it.nameZh}</p>
                  <p className="truncate text-xs text-gray-400">
                    {it.nameEn}
                    {it.spec ? ` · ${it.spec}` : ''}
                  </p>
                </div>
                <label className="flex items-center gap-1 text-xs text-gray-500">
                  ×
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={it.qty}
                    onChange={(e) => setQty(it.productId, type, Number(e.target.value))}
                    className="w-16 rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand-green"
                  />
                </label>
                <button
                  type="button"
                  aria-label="移除"
                  onClick={() => removeItem(it.productId, type)}
                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={isNew ? '新建订单' : '编辑订单'}
        widthClassName="md:max-w-3xl"
        footer={
          <Button icon={Save} loading={saving} onClick={save}>
            {isNew ? '创建订单' : '保存修改'}
          </Button>
        }
      >
        {loading ? (
          <p className="py-10 text-center text-sm text-gray-400">加载中…</p>
        ) : (
          <div className="space-y-4">
            {droppedItems > 0 && (
              <p className="rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
                有 {droppedItems} 件明细的商品已被删除，本次编辑不再包含。
              </p>
            )}

            {/* 客户 / 订单号 / 日期 */}
            <div className="grid gap-3 md:grid-cols-2">
              <Select
                label="客户"
                placeholder="选择客户"
                options={customers.map((c) => ({ value: c.id, label: `${c.name}${c.country ? '（' + c.country + '）' : ''}` }))}
                value={form.customerId}
                onChange={onCustomerChange}
                helpText="选中后自动带出该客户默认语言"
              />
              <Input label="订单号" placeholder="留空自动生成（YQ-日期-客户缩写-序号）" value={form.orderNo} onChange={set('orderNo')} />
              <Input label="日期" type="date" value={form.date} onChange={set('date')} />
              <Select
                label="状态"
                options={[
                  { value: 'pending', label: '待发货' },
                  { value: 'shipped', label: '已发货' },
                ]}
                value={form.status}
                onChange={set('status')}
              />
              <Select label="订单语言" options={LANG_OPTIONS} value={form.lang} onChange={set('lang')} helpText="决定客户订单页显示语言" />
              <Select
                label="主题"
                options={[
                  { value: 'brand', label: '主站品牌色（深绿 + 暖金）' },
                  { value: 'classic', label: '深咖暖色（深咖 + 金）' },
                ]}
                value={form.theme}
                onChange={set('theme')}
              />
            </div>

            {/* 商品与赠品 */}
            {renderList('item')}
            {renderList('gift')}

            {/* 祝福语 / 备注 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">祝福语（外文）</label>
              <textarea
                rows={2}
                value={form.blessingForeign}
                onChange={set('blessingForeign')}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">祝福语（中文）</label>
              <textarea
                rows={2}
                value={form.blessingCn}
                onChange={set('blessingCn')}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">备注（仅后台可见）</label>
              <textarea
                rows={2}
                placeholder="选填"
                value={form.note}
                onChange={set('note')}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none placeholder:text-gray-400 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* 选品弹层 */}
      <OrderProductPicker
        open={pickerType !== null}
        title={pickerType === 'gift' ? '添加赠品（从图库点选）' : '添加商品（从图库点选）'}
        onClose={() => setPickerType(null)}
        onPick={onPick(pickerType || 'item')}
        selectedIds={items.filter((it) => it.type === (pickerType || 'item')).map((it) => it.productId)}
      />
    </>
  );
}
